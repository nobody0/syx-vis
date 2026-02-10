// Save file import: decompress SOS .save files and scan for built rooms
import { buildings } from "../data/buildings.js";

// Build lookup: uppercase game room name → building id
const ROOM_TO_ID = new Map();
for (const b of buildings) {
  ROOM_TO_ID.set(b.id.toUpperCase(), b.id);
}

/**
 * Parse a Songs of Syx .save file and extract built buildings.
 *
 * Note: imported resource auto-detection is not feasible — the ImportTally data
 * is stored using Java ObjectOutputStream back-references, not scannable strings.
 * The modal shows all resources for manual selection when an import depot is detected.
 *
 * @param {ArrayBuffer} arrayBuffer - raw .save file contents
 * @param {string} filename - original filename (e.g. "MyCityName-ab12-cd34-ef56-1234.save")
 * @returns {Promise<{ cityName: string, population: number|null, buildingIds: string[] }>}
 */
export async function parseSaveFile(arrayBuffer, filename) {
  // Decompress: entire .save is zlib-compressed
  const compressed = new Uint8Array(arrayBuffer);
  const decompressed = await decompressZlib(compressed);

  // Skip 4-byte big-endian size header
  const data = decompressed.length > 4 ? decompressed.subarray(4) : decompressed;

  // Scan for known room name strings in chars() encoding
  const foundRooms = scanForRoomNames(data);

  // Parse filename for city name and population
  const { cityName, population } = parseFilename(filename);

  return {
    cityName,
    population,
    buildingIds: [...foundRooms].sort(),
  };
}

/**
 * Decompress zlib data using DecompressionStream("deflate").
 * @param {Uint8Array} compressed
 * @returns {Promise<Uint8Array>}
 */
async function decompressZlib(compressed) {
  const ds = new DecompressionStream("deflate");
  const writer = ds.writable.getWriter();
  writer.write(compressed);
  writer.close();
  const chunks = [];
  const reader = ds.readable.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const totalLen = chunks.reduce((s, c) => s + c.length, 0);
  const out = new Uint8Array(totalLen);
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.length; }
  return out;
}

// Infrastructure rooms that are always conceptually present in every city.
// Their instance count in the save is 0 because they use special serialization.
const ALWAYS_PRESENT = new Set(["_builder", "_hauler", "_transport", "_home", "_station"]);

/**
 * Scan decompressed save data for built rooms.
 *
 * Save format: room names appear in chars() encoding: [00 00 00 00][length_BE][UTF-16 BE chars].
 * Each room type has 2-3 occurrences: (1) type registry, (2) room data block, (3) optional.
 * The second occurrence is followed by instance data. At offset +14 after the chars() entry,
 * a 4-byte BE int gives the instance count. Count > 0 (and < 10000) means the room is built.
 *
 * Special cases: _HOME has different serialization (very large value); infrastructure rooms
 * (_BUILDER, _HAULER, _TRANSPORT, _STATION) always show count=0 but are present in every city.
 *
 * @param {Uint8Array} data
 * @returns {Set<string>} - set of matched building IDs
 */
function scanForRoomNames(data) {
  const found = new Set();

  // Pre-encode room names in chars() format for scanning
  const patterns = [];
  for (const [upperName, buildingId] of ROOM_TO_ID) {
    patterns.push({ bytes: encodeCharsFormat(upperName), buildingId, upperName });
  }

  for (const { bytes, buildingId } of patterns) {
    // Find first occurrence (type registry, early in file)
    const first = findBytes(data, bytes);
    if (first < 0) continue;

    // Always-present infrastructure rooms
    if (ALWAYS_PRESENT.has(buildingId)) {
      found.add(buildingId);
      continue;
    }

    // Find second occurrence (room data block)
    const second = findBytes(data, bytes, first + bytes.length);
    if (second < 0) continue;

    // Read instance count at offset +14 after chars() entry
    const afterPos = second + bytes.length;
    if (afterPos + 18 > data.length) continue;

    const instanceCount = readInt32(data, afterPos + 14);

    if (instanceCount > 0 && instanceCount < 10000) {
      found.add(buildingId);
    }
  }

  return found;
}

/**
 * Read a big-endian 32-bit integer from data at the given offset.
 * @param {Uint8Array} data
 * @param {number} off
 * @returns {number}
 */
function readInt32(data, off) {
  return (data[off] << 24) | (data[off + 1] << 16) | (data[off + 2] << 8) | data[off + 3];
}

/**
 * Encode a string in the game's chars() format: [00 00 00 00][length_BE][UTF-16 BE chars].
 * @param {string} str
 * @returns {Uint8Array}
 */
function encodeCharsFormat(str) {
  const buf = new Uint8Array(4 + 4 + str.length * 2);
  // First 4 bytes: 00 00 00 00
  // Next 4 bytes: string length (BE)
  buf[4] = (str.length >> 24) & 0xFF;
  buf[5] = (str.length >> 16) & 0xFF;
  buf[6] = (str.length >> 8) & 0xFF;
  buf[7] = str.length & 0xFF;
  // UTF-16 BE chars
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    buf[8 + i * 2] = (code >> 8) & 0xFF;
    buf[8 + i * 2 + 1] = code & 0xFF;
  }
  return buf;
}

/**
 * Find a byte pattern in data (Boyer-Moore-Horspool-like simple scan).
 * @param {Uint8Array} data
 * @param {Uint8Array} pattern
 * @param {number} [startFrom=0]
 * @returns {number} - index of first match, or -1
 */
function findBytes(data, pattern, startFrom = 0) {
  const pLen = pattern.length;
  const dLen = data.length;
  if (pLen === 0 || dLen < pLen) return -1;

  const last = pattern[pLen - 1];
  outer:
  for (let i = startFrom, end = dLen - pLen; i <= end; i++) {
    if (data[i + pLen - 1] !== last) continue;
    if (data[i] !== pattern[0]) continue;
    for (let j = 1; j < pLen - 1; j++) {
      if (data[i + j] !== pattern[j]) continue outer;
    }
    return i;
  }
  return -1;
}

/**
 * Parse save filename for city name and population.
 * Format: "{name}-{hex}-{hex}-{hex}-{pop}.save"
 * @param {string} filename
 * @returns {{ cityName: string, population: number|null }}
 */
function parseFilename(filename) {
  // Strip extension
  const base = filename.replace(/\.save$/i, "");

  // Try matching SOS filename pattern: name-hex-hex-hex-hexPop
  const match = base.match(/^(.+?)-[0-9a-f]+-[0-9a-f]+-[0-9a-f]+-([0-9a-f]+)$/i);
  if (match) {
    return { cityName: match[1], population: parseInt(match[2], 16) };
  }

  // Fallback: use entire base as name
  return { cityName: base, population: null };
}
