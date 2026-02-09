/** @type {import('../types.js').FurnitureSet[]} */
export const furniture = [
  {
    id: "admin",
    buildingIds: ["admin_normal", "admin_normal_consume_paper"],
    usesArea: true,
    mustBeIndoors: true,
    stats: [{ name: "workers", type: "employees" }, { name: "stations", type: "custom" }, { name: "efficiency", type: "efficiency" }],
    tileTypes: {
      ss: { mustBeReachable: true, availability: "ROOM_SOLID", sprite: "SHELF_1X1" },
      mm: { availability: "ROOM_SOLID", sprite: "TABLE_COMBO" },
      ww: { availability: "ROOM_SOLID", sprite: "TABLE_COMBO" },
      tt: { availability: "ROOM_SOLID", canGoCandle: true, sprite: "TABLE_COMBO" },
      in: { mustBeReachable: true, availability: "AVOID_PASS", canGoCandle: true, data: 3, sprite: "STOOL_1X1" },
      __: null,
      _carpet_combo: { availability: "ROOM", sprite: "CARPET_COMBO" }
    },
    groups: [
    {
      min: 1,
      rotations: 3,
      items: [
        { tiles: [["mm", "mm", "mm"], ["tt", "ww", "tt"], [null, "in", null]], multiplier: 1 },
        { tiles: [["mm", "mm", "mm", "mm"], ["tt", "ww", "ww", "tt"], [null, "in", "in", null]], multiplier: 2 },
        { tiles: [["mm", "mm", "mm", "mm", "mm"], ["tt", "ww", "ww", "ww", "tt"], [null, "in", "in", "in", null]], multiplier: 3 },
        { tiles: [["mm", "mm", "mm", "mm", "mm", "mm"], ["tt", "ww", "ww", "ww", "ww", "tt"], [null, "in", "in", "in", "in", null]], multiplier: 4 },
        { tiles: [["mm", "mm", "mm", "mm", "mm", "mm", "mm"], ["tt", "ww", "ww", "ww", "ww", "ww", "tt"], [null, "in", "in", "in", "in", "in", null]], multiplier: 5 },
        { tiles: [["mm", "mm", "mm", "mm", "mm", "mm", "mm", "mm"], ["tt", "ww", "ww", "ww", "ww", "ww", "ww", "tt"], [null, "in", "in", "in", "in", "in", "in", null]], multiplier: 6 },
        { tiles: [["mm", "mm", "mm", "mm", "mm", "mm", "mm", "mm", "mm"], ["tt", "ww", "ww", "ww", "ww", "ww", "ww", "ww", "tt"], [null, "in", "in", "in", "in", "in", "in", "in", null]], multiplier: 7 },
        { tiles: [[null, "in", null], ["tt", "ww", "tt"], ["mm", "mm", "mm"], ["tt", "ww", "tt"], [null, "in", null]], multiplier: 2 },
        { tiles: [[null, "in", "in", null], ["tt", "ww", "ww", "tt"], ["mm", "mm", "mm", "mm"], ["tt", "ww", "ww", "tt"], [null, "in", "in", null]], multiplier: 4 },
        { tiles: [[null, "in", "in", "in", null], ["tt", "ww", "ww", "ww", "tt"], ["mm", "mm", "mm", "mm", "mm"], ["tt", "ww", "ww", "ww", "tt"], [null, "in", "in", "in", null]], multiplier: 6 },
        { tiles: [[null, "in", "in", "in", "in", null], ["tt", "ww", "ww", "ww", "ww", "tt"], ["mm", "mm", "mm", "mm", "mm", "mm"], ["tt", "ww", "ww", "ww", "ww", "tt"], [null, "in", "in", "in", "in", null]], multiplier: 8 },
        { tiles: [[null, "in", "in", "in", "in", "in", null], ["tt", "ww", "ww", "ww", "ww", "ww", "tt"], ["mm", "mm", "mm", "mm", "mm", "mm", "mm"], ["tt", "ww", "ww", "ww", "ww", "ww", "tt"], [null, "in", "in", "in", "in", "in", null]], multiplier: 10 },
        { tiles: [[null, "in", "in", "in", "in", "in", "in", null], ["tt", "ww", "ww", "ww", "ww", "ww", "ww", "tt"], ["mm", "mm", "mm", "mm", "mm", "mm", "mm", "mm"], ["tt", "ww", "ww", "ww", "ww", "ww", "ww", "tt"], [null, "in", "in", "in", "in", "in", "in", null]], multiplier: 12 },
        { tiles: [[null, "in", "in", "in", "in", "in", "in", "in", null], ["tt", "ww", "ww", "ww", "ww", "ww", "ww", "ww", "tt"], ["mm", "mm", "mm", "mm", "mm", "mm", "mm", "mm", "mm"], ["tt", "ww", "ww", "ww", "ww", "ww", "ww", "ww", "tt"], [null, "in", "in", "in", "in", "in", "in", "in", null]], multiplier: 14 }
      ]
    },
    {
      min: 0,
      rotations: 3,
      items: [
        { tiles: [["tt", "ss"]], multiplier: 1 },
        { tiles: [["tt", "ss", "ss"]], multiplier: 2 },
        { tiles: [["tt", "ss", "ss", "ss"]], multiplier: 3 },
        { tiles: [["tt", "ss", "ss", "ss", "ss"]], multiplier: 4 },
        { tiles: [["tt", "ss", "ss", "ss", "ss", "ss"]], multiplier: 5 },
        { tiles: [["tt", "ss"], ["tt", "ss"]], multiplier: 2 },
        { tiles: [["tt", "ss", "ss"], ["tt", "ss", "ss"]], multiplier: 4 },
        { tiles: [["tt", "ss", "ss", "ss"], ["tt", "ss", "ss", "ss"]], multiplier: 6 },
        { tiles: [["tt", "ss", "ss", "ss", "ss"], ["tt", "ss", "ss", "ss", "ss"]], multiplier: 8 },
        { tiles: [["tt", "ss", "ss", "ss", "ss", "ss"], ["tt", "ss", "ss", "ss", "ss", "ss"]], multiplier: 10 }
      ]
    },
    {
      min: 1,
      rotations: 0,
      items: [
        { tiles: [["_carpet_combo"]], multiplier: 1 },
        { tiles: [["_carpet_combo", "_carpet_combo"]], multiplier: 2 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 3 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 4 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 5 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 6 },
        { tiles: [["_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo"]], multiplier: 4 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 6 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 8 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 10 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 12 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 9 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 12 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 15 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 18 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 21 }
      ]
    }
    ]
  },
  {
    id: "archery",
    buildingIds: ["archery_vanilla"],
    usesArea: true,
    mustBeOutdoors: true,
    stats: [{ name: "men", type: "custom" }],
    tileTypes: {
      ta: { availability: "ROOM_SOLID", sprite: "TARGET_1X1" },
      ll: { availability: "ROOM_SOLID", sprite: "LANE_1X1" },
      pp: { mustBeReachable: true, availability: "ROOM", sprite: "PLATFORM_1X1" },
      ca: { availability: "ROOM_SOLID", canGoCandle: true, sprite: "TABLE_1X1" },
      __: { availability: "ROOM_SOLID", sprite: "FENCE_COMBO" }
    },
    groups: [
    {
      min: 1,
      rotations: 3,
      items: [
        { tiles: [[null, null, null], ["ca", "ta", "ca"], [null, "ll", null], [null, "ll", null], [null, "ll", null], [null, "ll", null], [null, "ll", null], [null, "ll", null], ["ca", "pp", "ca"]], multiplier: 1 },
        { tiles: [[null, null, null, null], ["ca", "ta", "ta", "ca"], [null, "ll", "ll", null], [null, "ll", "ll", null], [null, "ll", "ll", null], [null, "ll", "ll", null], [null, "ll", "ll", null], [null, "ll", "ll", null], ["ca", "pp", "pp", "ca"]], multiplier: 2 },
        { tiles: [[null, null, null, null, null], ["ca", "ta", "ta", "ta", "ca"], [null, "ll", "ll", "ll", null], [null, "ll", "ll", "ll", null], [null, "ll", "ll", "ll", null], [null, "ll", "ll", "ll", null], [null, "ll", "ll", "ll", null], [null, "ll", "ll", "ll", null], ["ca", "pp", "pp", "pp", "ca"]], multiplier: 3 },
        { tiles: [[null, null, null, null, null, null], ["ca", "ta", "ta", "ta", "ta", "ca"], [null, "ll", "ll", "ll", "ll", null], [null, "ll", "ll", "ll", "ll", null], [null, "ll", "ll", "ll", "ll", null], [null, "ll", "ll", "ll", "ll", null], [null, "ll", "ll", "ll", "ll", null], [null, "ll", "ll", "ll", "ll", null], ["ca", "pp", "pp", "pp", "pp", "ca"]], multiplier: 4 },
        { tiles: [[null, null, null, null, null, null, null], ["ca", "ta", "ta", "ta", "ta", "ta", "ca"], [null, "ll", "ll", "ll", "ll", "ll", null], [null, "ll", "ll", "ll", "ll", "ll", null], [null, "ll", "ll", "ll", "ll", "ll", null], [null, "ll", "ll", "ll", "ll", "ll", null], [null, "ll", "ll", "ll", "ll", "ll", null], [null, "ll", "ll", "ll", "ll", "ll", null], ["ca", "pp", "pp", "pp", "pp", "pp", "ca"]], multiplier: 5 },
        { tiles: [[null, null, null, null, null, null, null, null], ["ca", "ta", "ta", "ta", "ta", "ta", "ta", "ca"], [null, "ll", "ll", "ll", "ll", "ll", "ll", null], [null, "ll", "ll", "ll", "ll", "ll", "ll", null], [null, "ll", "ll", "ll", "ll", "ll", "ll", null], [null, "ll", "ll", "ll", "ll", "ll", "ll", null], [null, "ll", "ll", "ll", "ll", "ll", "ll", null], [null, "ll", "ll", "ll", "ll", "ll", "ll", null], ["ca", "pp", "pp", "pp", "pp", "pp", "pp", "ca"]], multiplier: 6 },
        { tiles: [[null, null, null, null, null, null, null, null, null], ["ca", "ta", "ta", "ta", "ta", "ta", "ta", "ta", "ca"], [null, "ll", "ll", "ll", "ll", "ll", "ll", "ll", null], [null, "ll", "ll", "ll", "ll", "ll", "ll", "ll", null], [null, "ll", "ll", "ll", "ll", "ll", "ll", "ll", null], [null, "ll", "ll", "ll", "ll", "ll", "ll", "ll", null], [null, "ll", "ll", "ll", "ll", "ll", "ll", "ll", null], [null, "ll", "ll", "ll", "ll", "ll", "ll", "ll", null], ["ca", "pp", "pp", "pp", "pp", "pp", "pp", "pp", "ca"]], multiplier: 7 },
        { tiles: [[null, null, null, null, null, null, null, null, null, null], ["ca", "ta", "ta", "ta", "ta", "ta", "ta", "ta", "ta", "ca"], [null, "ll", "ll", "ll", "ll", "ll", "ll", "ll", "ll", null], [null, "ll", "ll", "ll", "ll", "ll", "ll", "ll", "ll", null], [null, "ll", "ll", "ll", "ll", "ll", "ll", "ll", "ll", null], [null, "ll", "ll", "ll", "ll", "ll", "ll", "ll", "ll", null], [null, "ll", "ll", "ll", "ll", "ll", "ll", "ll", "ll", null], [null, "ll", "ll", "ll", "ll", "ll", "ll", "ll", "ll", null], ["ca", "pp", "pp", "pp", "pp", "pp", "pp", "pp", "pp", "ca"]], multiplier: 8 },
        { tiles: [[null, null, null, null, null, null, null, null, null, null, null], ["ca", "ta", "ta", "ta", "ta", "ta", "ta", "ta", "ta", "ta", "ca"], [null, "ll", "ll", "ll", "ll", "ll", "ll", "ll", "ll", "ll", null], [null, "ll", "ll", "ll", "ll", "ll", "ll", "ll", "ll", "ll", null], [null, "ll", "ll", "ll", "ll", "ll", "ll", "ll", "ll", "ll", null], [null, "ll", "ll", "ll", "ll", "ll", "ll", "ll", "ll", "ll", null], [null, "ll", "ll", "ll", "ll", "ll", "ll", "ll", "ll", "ll", null], [null, "ll", "ll", "ll", "ll", "ll", "ll", "ll", "ll", "ll", null], ["ca", "pp", "pp", "pp", "pp", "pp", "pp", "pp", "pp", "pp", "ca"]], multiplier: 9 },
        { tiles: [[null, null, null, null, null, null, null, null, null, null, null, null], ["ca", "ta", "ta", "ta", "ta", "ta", "ta", "ta", "ta", "ta", "ta", "ca"], [null, "ll", "ll", "ll", "ll", "ll", "ll", "ll", "ll", "ll", "ll", null], [null, "ll", "ll", "ll", "ll", "ll", "ll", "ll", "ll", "ll", "ll", null], [null, "ll", "ll", "ll", "ll", "ll", "ll", "ll", "ll", "ll", "ll", null], [null, "ll", "ll", "ll", "ll", "ll", "ll", "ll", "ll", "ll", "ll", null], [null, "ll", "ll", "ll", "ll", "ll", "ll", "ll", "ll", "ll", "ll", null], [null, "ll", "ll", "ll", "ll", "ll", "ll", "ll", "ll", "ll", "ll", null], ["ca", "pp", "pp", "pp", "pp", "pp", "pp", "pp", "pp", "pp", "pp", "ca"]], multiplier: 10 }
      ]
    }
    ]
  },
  {
    id: "arenag",
    buildingIds: ["arenag_normal"],
    usesArea: true,
    stats: [{ name: "workers", type: "custom" }, { name: "spectators", type: "custom" }],
    tileTypes: {
      ee: { mustBeReachable: true, availability: "SOLID" }
    },
    groups: [
    {
      min: 4,
      rotations: 0,
      items: [
        { tiles: [["ee"]], multiplier: 1 }
      ]
    }
    ]
  },
  {
    id: "artillery",
    buildingIds: ["artillery_catapult"],
    mustBeOutdoors: true,
    tileTypes: {
      xx: { availability: "SOLID", sprite: "BASE_2X2" },
      ca: { availability: "SOLID", canGoCandle: true, sprite: "TORCH_1X1" },
      dp: { availability: "ROOM", sprite: "STORAGE_1X1" },
      __: { availability: "ROOM", data: 1 },
      ee: { mustBeReachable: true, availability: "ROOM", data: 1 }
    },
    groups: [
    {
      min: 1,
      rotations: 3,
      items: [
        { tiles: [["ca", "xx", "xx", "dp"], [null, "xx", "xx", null], [null, "ee", "ee", null]], multiplier: 1 }
      ]
    }
    ]
  },
  {
    id: "asylum",
    buildingIds: ["_asylum"],
    usesArea: true,
    mustBeIndoors: true,
    stats: [{ name: "prisoners", type: "integer" }, { name: "guards", type: "integer" }],
    tileTypes: {
      b1: { availability: "NOT_ACCESSIBLE", sprite: "BED_1X1_TOP" },
      b2: { availability: "NOT_ACCESSIBLE", sprite: "BED_1X1_BOTTOM" },
      c1: { availability: "AVOID_PASS", canGoCandle: true, sprite: "CANDLE_HOLDER_1X1" },
      oo: { availability: "AVOID_PASS" },
      ni: { availability: "ROOM_SOLID", sprite: "DECOR_1X1" },
      ta: { availability: "ROOM_SOLID", sprite: "TABLE_COMBO" },
      fo: { availability: "ROOM_SOLID", data: 2, sprite: "TABLE_COMBO" },
      ss: { mustBeReachable: true, availability: "AVOID_PASS", data: 1, sprite: "OPENING_1X1" },
      __: null
    },
    groups: [
    {
      min: 1,
      rotations: 3,
      items: [
        { tiles: [["ni", "oo", "b1"], ["ta", "oo", "b2"], ["fo", "ss", "ni"], [null, null, "c1"]], multiplier: 1 }
      ]
    }
    ]
  },
  {
    id: "barber",
    buildingIds: ["barber_normal"],
    usesArea: true,
    mustBeIndoors: true,
    stats: [{ name: "latrines", type: "services" }, { name: "workers", type: "employeesRelative" }, { name: "quality", type: "relative" }],
    tileTypes: {
      tt: { availability: "ROOM_SOLID", canGoCandle: true, sprite: "TABLE_COMBO" },
      tc: { availability: "ROOM_SOLID", sprite: "TABLE_COMBO" },
      oo: { mustBeReachable: true, availability: "AVOID_PASS", data: 1, sprite: "CHAIR_1X1" },
      __: { availability: "ROOM_SOLID", sprite: "SEPARATOR_1X1" },
      _carpet_combo: { availability: "ROOM", sprite: "CARPET_COMBO" }
    },
    groups: [
    {
      min: 1,
      rotations: 3,
      items: [
        { tiles: [["tt", null], ["tc", "oo"], ["tt", null]], multiplier: 1 },
        { tiles: [["tt", null], ["tc", "oo"], ["tc", "oo"], ["tt", null]], multiplier: 2 },
        { tiles: [["tt", null], ["tc", "oo"], ["tc", "oo"], ["tc", "oo"], ["tt", null]], multiplier: 3 },
        { tiles: [["tt", null], ["tc", "oo"], ["tc", "oo"], ["tc", "oo"], ["tc", "oo"], ["tt", null]], multiplier: 4 },
        { tiles: [["tt", null], ["tc", "oo"], ["tc", "oo"], ["tc", "oo"], ["tc", "oo"], ["tc", "oo"], ["tt", null]], multiplier: 5 },
        { tiles: [["tt", null], ["tc", "oo"], ["tc", "oo"], ["tc", "oo"], ["tt", null], ["tc", "oo"], ["tc", "oo"], ["tc", "oo"], ["tt", null]], multiplier: 6 },
        { tiles: [["tt", null], ["tc", "oo"], ["tc", "oo"], ["tc", "oo"], ["tc", "oo"], ["tt", null], ["tc", "oo"], ["tc", "oo"], ["tc", "oo"], ["tc", "oo"], ["tt", null]], multiplier: 8 },
        { tiles: [["tt", null], ["tc", "oo"], ["tc", "oo"], ["tc", "oo"], ["tc", "oo"], ["tc", "oo"], ["tt", null], ["tc", "oo"], ["tc", "oo"], ["tc", "oo"], ["tc", "oo"], ["tc", "oo"], ["tt", null]], multiplier: 10 }
      ]
    },
    {
      min: 1,
      rotations: 0,
      items: [
        { tiles: [["_carpet_combo"]], multiplier: 1 },
        { tiles: [["_carpet_combo", "_carpet_combo"]], multiplier: 2 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 3 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 4 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 5 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 6 },
        { tiles: [["_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo"]], multiplier: 4 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 6 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 8 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 10 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 12 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 9 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 12 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 15 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 18 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 21 }
      ]
    }
    ]
  },
  {
    id: "barracks",
    buildingIds: ["barracks_vanilla"],
    usesArea: true,
    mustBeIndoors: true,
    stats: [{ name: "men", type: "custom" }],
    tileTypes: {
      ma: { availability: "ROOM_SOLID", sprite: "MANAKIN_A_1X1" },
      ca: { availability: "ROOM_SOLID", canGoCandle: true, sprite: "TABLE_1X1" },
      st: { mustBeReachable: true, availability: "AVOID_PASS", sprite: "PODEUM_BOX" },
      ee: { availability: "AVOID_PASS", sprite: "PODEUM_BOX" }
    },
    groups: [
    {
      min: 1,
      rotations: 3,
      items: [
        { tiles: [["ma", "ca"], ["st", "ee"]], multiplier: 1 },
        { tiles: [["ma", "ca", "ma"], ["st", "ee", "st"]], multiplier: 2 },
        { tiles: [["ma", "ca", "ma", "ma"], ["st", "ee", "st", "st"]], multiplier: 3 },
        { tiles: [["ma", "ma", "ca", "ma", "ma"], ["st", "st", "ee", "st", "st"]], multiplier: 4 },
        { tiles: [["ma", "ma", "ma", "ca", "ma", "ma"], ["st", "st", "st", "ee", "st", "st"]], multiplier: 5 },
        { tiles: [["ma", "ma", "ma", "ca", "ma", "ma", "ma"], ["st", "st", "st", "ee", "st", "st", "st"]], multiplier: 6 },
        { tiles: [["st", "st"], ["ma", "ma"], ["ma", "ca"], ["st", "ee"]], multiplier: 3 },
        { tiles: [["st", "st", "st"], ["ma", "ma", "ma"], ["ma", "ca", "ma"], ["st", "ee", "st"]], multiplier: 5 },
        { tiles: [["st", "st", "st", "st"], ["ma", "ma", "ma", "ma"], ["ma", "ca", "ma", "ma"], ["st", "ee", "st", "st"]], multiplier: 7 },
        { tiles: [["st", "st", "st", "st", "st"], ["ma", "ma", "ma", "ma", "ma"], ["ma", "ma", "ca", "ma", "ma"], ["st", "st", "ee", "st", "st"]], multiplier: 9 },
        { tiles: [["st", "st", "st", "st", "st", "st"], ["ma", "ma", "ma", "ma", "ma", "ma"], ["ma", "ma", "ma", "ca", "ma", "ma"], ["st", "st", "st", "ee", "st", "st"]], multiplier: 11 },
        { tiles: [["st", "st", "st", "st", "st", "st", "st"], ["ma", "ma", "ma", "ma", "ma", "ma", "ma"], ["ma", "ma", "ma", "ca", "ma", "ma", "ma"], ["st", "st", "st", "ee", "st", "st", "st"]], multiplier: 13 }
      ]
    }
    ]
  },
  {
    id: "bath",
    buildingIds: ["bath_normal", "bath_normal_consume_coal"],
    usesArea: true,
    mustBeIndoors: true,
    stats: [{ name: "baths", type: "custom" }, { name: "relaxation", type: "relative" }],
    tileTypes: {
      ww: { mustBeReachable: true, availability: "ROOM_SOLID", data: 32768, sprite: "WORK_1X1" },
      ss: { mustBeReachable: true, availability: "AVOID_PASS", data: 49152, sprite: "ENTRANCE_1X1" },
      nn: { availability: "AVOID_PASS", data: 57344, sprite: "FRAME_COMBO" },
      mm: { availability: "ROOM_SOLID", canGoCandle: true, sprite: "TORCH_1X1" },
      ov: { mustBeReachable: true, availability: "ROOM_SOLID", data: 16384, sprite: "OVEN_1X1" },
      pi: { availability: "ROOM_SOLID", sprite: "PIPE_1X1" },
      b1: { mustBeReachable: true, availability: "AVOID_PASS", data: 8192, sprite: "BENCH_1X1" },
      b2: { availability: "AVOID_PASS", data: 84, sprite: "BENCH_1X1" },
      __: null
    },
    groups: [
    {
      min: 1,
      rotations: 3,
      items: [
        { tiles: [["ww", "nn", "nn"], ["ss", "nn", "nn"], ["mm", "ov", "pi"]], multiplier: 2 },
        { tiles: [["ww", "nn", "nn"], ["ss", "nn", "nn"], ["mm", "nn", "nn"], ["pi", "ov", "pi"]], multiplier: 3 },
        { tiles: [["mm", "nn", "nn"], ["ss", "nn", "nn"], ["ww", "nn", "nn"], ["mm", "nn", "nn"], ["pi", "ov", "pi"]], multiplier: 4 },
        { tiles: [["pi", "nn", "nn"], ["pi", "nn", "nn"], ["ss", "nn", "nn"], ["ww", "nn", "nn"], ["mm", "nn", "nn"], ["pi", "ov", "pi"]], multiplier: 5 },
        { tiles: [["ww", "nn", "nn", "nn"], ["ss", "nn", "nn", "nn"], ["pi", "ov", "pi", "mm"]], multiplier: 3 },
        { tiles: [["ww", "nn", "nn", "nn"], ["ss", "nn", "nn", "nn"], ["mm", "nn", "nn", "nn"], ["pi", "ov", "pi", "mm"]], multiplier: 4.5 },
        { tiles: [["pi", "nn", "nn", "nn"], ["pi", "nn", "nn", "nn"], ["ww", "nn", "nn", "nn"], ["ss", "nn", "nn", "nn"], ["mm", "pi", "ov", "pi"]], multiplier: 6 },
        { tiles: [["mm", "nn", "nn", "nn"], ["pi", "nn", "nn", "nn"], ["pi", "nn", "nn", "nn"], ["ww", "nn", "nn", "nn"], ["ss", "nn", "nn", "nn"], ["mm", "pi", "ov", "pi"]], multiplier: 7.5 },
        { tiles: [["pi", "nn", "nn", "nn", "nn"], ["pi", "nn", "nn", "nn", "nn"], ["mm", "nn", "nn", "nn", "nn"], ["pi", "ov", "pi", "ss", "ww"]], multiplier: 6 },
        { tiles: [["mm", "nn", "nn", "nn", "nn"], ["pi", "nn", "nn", "nn", "nn"], ["pi", "nn", "nn", "nn", "nn"], ["mm", "nn", "nn", "nn", "nn"], ["pi", "ov", "pi", "ss", "ww"]], multiplier: 8 },
        { tiles: [["pi", "nn", "nn", "nn", "nn"], ["ov", "nn", "nn", "nn", "nn"], ["pi", "nn", "nn", "nn", "nn"], ["mm", "nn", "nn", "nn", "nn"], ["pi", "nn", "nn", "nn", "nn"], ["pi", "ww", "ss", "pi", "pi"]], multiplier: 10 }
      ]
    },
    {
      min: 0,
      rotations: 3,
      items: [
        { tiles: [["b1", "mm"], ["b2", null]], multiplier: 1 },
        { tiles: [["b1", "mm", "b1"], ["b2", null, "b2"]], multiplier: 2 },
        { tiles: [["b1", "mm", "b1", "b1"], ["b2", null, "b2", "b2"]], multiplier: 3 },
        { tiles: [["b1", "b1", "mm", "b1", "b1"], ["b2", "b2", null, "b2", "b2"]], multiplier: 4 }
      ]
    }
    ]
  },
  {
    id: "cannibal",
    buildingIds: ["_cannibal"],
    usesArea: true,
    mustBeIndoors: true,
    stats: [{ name: "workers", type: "custom" }, { name: "efficiency", type: "efficiency" }],
    tileTypes: {
      ww: { mustBeReachable: true, availability: "ROOM_SOLID", sprite: "TABLE_COMBO" },
      rm: { mustBeReachable: true, availability: "ROOM_SOLID", sprite: "TABLE_COMBO" },
      rr: { mustBeReachable: true, availability: "ROOM_SOLID", sprite: "TABLE_COMBO" },
      mm: { availability: "ROOM_SOLID", canGoCandle: true, sprite: "TABLE_COMBO" },
      nn: { availability: "ROOM_SOLID", sprite: "MISC_1X1" }
    },
    groups: [
    {
      min: 1,
      rotations: 3,
      items: [
        { tiles: [["rm", "ww", "rr", "mm"]], multiplier: 1 },
        { tiles: [["rm", "ww", "rr", "mm", "rm", "ww", "rr", "mm"]], multiplier: 2 },
        { tiles: [["rm", "ww", "rr", "mm", "rm", "ww", "rr", "mm"], ["rm", "ww", "rr", "mm", "rm", "ww", "rr", "mm"]], multiplier: 4 }
      ]
    },
    {
      min: 0,
      rotations: 1,
      items: [
        { tiles: [["nn", "mm"]], multiplier: 2 },
        { tiles: [["nn", "mm", "nn"]], multiplier: 3 },
        { tiles: [["nn", "mm", "mm", "nn"]], multiplier: 4 },
        { tiles: [["nn", "mm", "mm", "nn"], ["nn", "mm", "mm", "nn"]], multiplier: 8 },
        { tiles: [["nn", "mm", "mm", "mm", "nn"], ["nn", "mm", "mm", "mm", "nn"]], multiplier: 10 }
      ]
    }
    ]
  },
  {
    id: "canteen",
    buildingIds: ["canteen_normal", "canteen_normal_consume_herb"],
    usesArea: true,
    mustBeIndoors: true,
    stats: [{ name: "guests", type: "services" }, { name: "workers", type: "employees" }, { name: "tables", type: "relative" }],
    tileTypes: {
      jj: { mustBeReachable: true, availability: "ROOM_SOLID", data: 1, sprite: "TABLE_COMBO" },
      ss: { mustBeReachable: true, availability: "ROOM_SOLID", data: 2, sprite: "TABLE_COMBO" },
      se: { availability: "ROOM_SOLID", canGoCandle: true, sprite: "TABLE_COMBO" },
      mm: { availability: "ROOM_SOLID", canGoCandle: true, sprite: "TABLE_COMBO" },
      st: { mustBeReachable: true, availability: "PENALTY4", data: 3, sprite: "STOOL_1X1" },
      ta: { availability: "ROOM_SOLID", canGoCandle: true, sprite: "TABLE_COMBO" },
      ts: { availability: "ROOM_SOLID", sprite: "TABLE_COMBO" },
      __: null
    },
    groups: [
    {
      min: 1,
      rotations: 3,
      items: [
        { tiles: [["mm", "jj", "mm"], ["se", "ss", "se"]], multiplier: 1 },
        { tiles: [["mm", "jj", "jj", "mm"], ["se", "ss", "ss", "se"]], multiplier: 2 },
        { tiles: [["mm", "jj", "jj", "jj", "mm"], ["se", "ss", "ss", "ss", "se"]], multiplier: 3 },
        { tiles: [["mm", "jj", "jj", "jj", "jj", "mm"], ["se", "ss", "ss", "ss", "ss", "se"]], multiplier: 4 },
        { tiles: [["mm", "jj", "jj", "jj", "jj", "jj", "mm"], ["se", "ss", "ss", "ss", "ss", "ss", "se"]], multiplier: 5 }
      ]
    },
    {
      min: 1,
      rotations: 3,
      items: [
        { tiles: [["ta", "ts", "ta"], [null, "st", null]], multiplier: 1 },
        { tiles: [["ta", "ts", "ts", "ta"], [null, "st", "st", null]], multiplier: 2 },
        { tiles: [["ta", "ts", "ts", "ts", "ta"], [null, "st", "st", "st", null]], multiplier: 3 },
        { tiles: [["ta", "ts", "ts", "ts", "ts", "ta"], [null, "st", "st", "st", "st", null]], multiplier: 4 },
        { tiles: [["ta", "ts", "ts", "ts", "ts", "ts", "ta"], [null, "st", "st", "st", "st", "st", null]], multiplier: 5 },
        { tiles: [["ta", "ts", "ts", "ts", "ts", "ts", "ts", "ta"], [null, "st", "st", "st", "st", "st", "st", null]], multiplier: 6 },
        { tiles: [["ta", "ts", "ts", "ts", "ts", "ts", "ts", "ts", "ta"], [null, "st", "st", "st", "st", "st", "st", "st", null]], multiplier: 7 },
        { tiles: [[null, "st", null], ["ta", "ts", "ta"], ["ta", "ts", "ta"], [null, "st", null]], multiplier: 2 },
        { tiles: [[null, "st", "st", null], ["ta", "ts", "ts", "ta"], ["ta", "ts", "ts", "ta"], [null, "st", "st", null]], multiplier: 4 },
        { tiles: [[null, "st", "st", "st", null], ["ta", "ts", "ts", "ts", "ta"], ["ta", "ts", "ts", "ts", "ta"], [null, "st", "st", "st", null]], multiplier: 6 },
        { tiles: [[null, "st", "st", "st", "st", null], ["ta", "ts", "ts", "ts", "ts", "ta"], ["ta", "ts", "ts", "ts", "ts", "ta"], [null, "st", "st", "st", "st", null]], multiplier: 8 },
        { tiles: [[null, "st", "st", "st", "st", "st", null], ["ta", "ts", "ts", "ts", "ts", "ts", "ta"], ["ta", "ts", "ts", "ts", "ts", "ts", "ta"], [null, "st", "st", "st", "st", "st", null]], multiplier: 10 },
        { tiles: [[null, "st", "st", "st", "st", "st", "st", null], ["ta", "ts", "ts", "ts", "ts", "ts", "ts", "ta"], ["ta", "ts", "ts", "ts", "ts", "ts", "ts", "ta"], [null, "st", "st", "st", "st", "st", "st", null]], multiplier: 12 }
      ]
    }
    ]
  },
  {
    id: "court",
    buildingIds: ["_court"],
    usesArea: true,
    mustBeIndoors: true,
    stats: [{ name: "prisoners", type: "integer" }, { name: "workers", type: "integer" }, { name: "spectators", type: "integer" }],
    tileTypes: {
      xx: { availability: "ROOM_SOLID", sprite: "TABLE_COMBO" },
      cc: { availability: "AVOID_PASS", sprite: "CARPET_COMBO" },
      ca: { availability: "ROOM_SOLID", canGoCandle: true, sprite: "TORCH_1X1" },
      ii: { availability: "AVOID_PASS", data: 1, sprite: "CHAIR_1X1" },
      pp: { mustBeReachable: true, availability: "AVOID_PASS", data: 2, sprite: "STAND_COMBO" },
      dd: { availability: "ROOM_SOLID", sprite: "DECOR_A_1X1" },
      dc: { availability: "ROOM_SOLID", sprite: "DECOR_B_1X1" },
      __: { availability: "ROOM" },
      _r: { mustBeReachable: true, availability: "ROOM" },
      ss: { mustBeReachable: true, availability: "PENALTY4", data: 3, sprite: "BENCH_A_1X1" },
      sc: { mustBeReachable: true, availability: "PENALTY4", data: 3, sprite: "BENCH_B_1X1" },
      se: { mustBeReachable: true, availability: "PENALTY4", data: 3, sprite: "BENCH_C_1X1" }
    },
    groups: [
    {
      min: 0,
      rotations: 3,
      items: [
        { tiles: [["ca", "dd", "dc", "dd", "ca"], ["_r", null, "ii", null, "_r"], ["xx", "xx", "xx", "xx", "xx"], ["xx", "xx", "xx", "xx", "xx"], ["cc", "cc", "cc", "cc", "cc"], [null, null, "pp", null, null]], multiplier: 1 }
      ]
    },
    {
      min: 0,
      rotations: 1,
      items: [
        { tiles: [["ca", "ss", "se", "ca"]], multiplier: 2 },
        { tiles: [["ca", "ss", "sc", "se", "ca"]], multiplier: 3 },
        { tiles: [["ca", "ss", "sc", "sc", "se", "ca"]], multiplier: 4 },
        { tiles: [["ca", "ss", "sc", "sc", "sc", "se", "ca"]], multiplier: 5 },
        { tiles: [["ca", "ss", "sc", "sc", "sc", "sc", "se", "ca"]], multiplier: 6 },
        { tiles: [["ca", "ss", "sc", "sc", "sc", "sc", "sc", "se", "ca"]], multiplier: 7 }
      ]
    }
    ]
  },
  {
    id: "eatery",
    buildingIds: ["eatery_normal"],
    usesArea: true,
    stats: [{ name: "storage", type: "services" }, { name: "workers", type: "employees" }],
    tileTypes: {
      cr: { availability: "SOLID", data: 1, sprite: "CRATE_BOTTOM_A_1X1" },
      st: { availability: "SOLID", data: 1, sprite: "STALL_BOTTOM_1X1" },
      mm: { availability: "SOLID", canGoCandle: true, sprite: "MISC_BOTTOM_1X1" },
      __: { availability: "ROOM", sprite: "CARPET_COMBO" }
    },
    groups: [
    {
      min: 1,
      rotations: 3,
      items: [
        { tiles: [["cr", "st", "st", "st", "mm"], [null, null, null, null, null]], multiplier: 4 },
        { tiles: [["cr", "st", "st", "st", "st", "mm"], [null, null, null, null, null, null]], multiplier: 5 },
        { tiles: [["cr", "st", "st", "st", "st", "st", "mm"], [null, null, null, null, null, null, null]], multiplier: 6 },
        { tiles: [["cr", "st", "st", "st", "st", "st", "st", "mm"], [null, null, null, null, null, null, null, null]], multiplier: 7 },
        { tiles: [[null, null, null, null], ["mm", "st", "st", "cr"], ["cr", "st", "st", "mm"], [null, null, null, null]], multiplier: 6 },
        { tiles: [[null, null, null, null, null], ["mm", "st", "st", "st", "cr"], ["cr", "st", "st", "st", "mm"], [null, null, null, null, null]], multiplier: 8 },
        { tiles: [[null, null, null, null, null, null], ["mm", "st", "st", "st", "st", "cr"], ["cr", "st", "st", "st", "st", "mm"], [null, null, null, null, null, null]], multiplier: 10 },
        { tiles: [[null, null, null, null, null, null, null], ["mm", "st", "st", "st", "st", "st", "cr"], ["cr", "st", "st", "st", "st", "st", "mm"], [null, null, null, null, null, null, null]], multiplier: 12 },
        { tiles: [[null, null, null, null, null, null, null, null], ["mm", "st", "st", "st", "st", "st", "st", "cr"], ["cr", "st", "st", "st", "st", "st", "st", "mm"], [null, null, null, null, null, null, null, null]], multiplier: 14 }
      ]
    }
    ]
  },
  {
    id: "embassy",
    buildingIds: ["_embassy"],
    usesArea: true,
    mustBeIndoors: true,
    stats: [{ name: "workers", type: "employees" }, { name: "efficiency", type: "efficiency" }],
    tileTypes: {
      rr: { availability: "ROOM_SOLID", sprite: "TABLE_1X1" },
      ww: { availability: "ROOM_SOLID", canGoCandle: true, data: 3, sprite: "TABLE_COMBO" },
      dd: { availability: "ROOM_SOLID", canGoCandle: true, sprite: "TABLE_COMBO" },
      ch: { mustBeReachable: true, availability: "AVOID_PASS", sprite: "STOOL_1X1" },
      sh: { availability: "AVOID_PASS", canGoCandle: true, sprite: "SHELF_1X1" },
      _carpet_combo: { availability: "ROOM", sprite: "CARPET_COMBO" }
    },
    groups: [
    {
      min: 0,
      rotations: 3,
      items: [
        { tiles: [["rr", "ch", "rr"], ["dd", "ww", "dd"]], multiplier: 1 },
        { tiles: [["rr", "ch", "ch", "rr"], ["dd", "ww", "ww", "dd"]], multiplier: 2 },
        { tiles: [["rr", "ch", "ch", "ch", "rr"], ["dd", "ww", "ww", "ww", "dd"]], multiplier: 3 },
        { tiles: [["rr", "ch", "ch", "ch", "ch", "rr"], ["dd", "ww", "ww", "ww", "ww", "dd"]], multiplier: 4 },
        { tiles: [["rr", "ch", "ch", "ch", "ch", "ch", "rr"], ["dd", "ww", "ww", "ww", "ww", "ww", "dd"]], multiplier: 5 },
        { tiles: [["rr", "ch", "rr"], ["dd", "ww", "dd"], ["dd", "ww", "dd"], ["rr", "ch", "rr"]], multiplier: 2 },
        { tiles: [["rr", "ch", "ch", "rr"], ["dd", "ww", "ww", "dd"], ["dd", "ww", "ww", "dd"], ["rr", "ch", "ch", "rr"]], multiplier: 4 },
        { tiles: [["rr", "ch", "ch", "ch", "rr"], ["dd", "ww", "ww", "ww", "dd"], ["dd", "ww", "ww", "ww", "dd"], ["rr", "ch", "ch", "ch", "rr"]], multiplier: 6 },
        { tiles: [["rr", "ch", "ch", "ch", "ch", "rr"], ["dd", "ww", "ww", "ww", "ww", "dd"], ["dd", "ww", "ww", "ww", "ww", "dd"], ["rr", "ch", "ch", "ch", "ch", "rr"]], multiplier: 8 },
        { tiles: [["rr", "ch", "ch", "ch", "ch", "ch", "rr"], ["dd", "ww", "ww", "ww", "ww", "ww", "dd"], ["dd", "ww", "ww", "ww", "ww", "ww", "dd"], ["rr", "ch", "ch", "ch", "ch", "ch", "rr"]], multiplier: 10 }
      ]
    },
    {
      min: 0,
      rotations: 3,
      items: [
        { tiles: [["rr", "sh"]], multiplier: 1 },
        { tiles: [["rr", "sh", "sh"]], multiplier: 2 },
        { tiles: [["rr", "sh", "sh", "sh"]], multiplier: 3 },
        { tiles: [["rr", "sh", "sh", "sh", "sh", "sh"]], multiplier: 4 },
        { tiles: [["rr", "sh"], ["rr", "sh"]], multiplier: 2 },
        { tiles: [["rr", "sh", "sh"], ["rr", "sh", "sh"]], multiplier: 4 },
        { tiles: [["rr", "sh", "sh", "sh"], ["rr", "sh", "sh", "sh"]], multiplier: 6 },
        { tiles: [["rr", "sh", "sh", "sh", "sh"], ["rr", "sh", "sh", "sh", "sh"]], multiplier: 8 },
        { tiles: [["rr", "sh", "sh", "sh", "sh", "sh"], ["rr", "sh", "sh", "sh", "sh", "sh"]], multiplier: 10 }
      ]
    },
    {
      min: 1,
      rotations: 0,
      items: [
        { tiles: [["_carpet_combo"]], multiplier: 1 },
        { tiles: [["_carpet_combo", "_carpet_combo"]], multiplier: 2 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 3 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 4 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 5 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 6 },
        { tiles: [["_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo"]], multiplier: 4 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 6 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 8 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 10 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 12 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 9 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 12 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 15 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 18 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 21 }
      ]
    }
    ]
  },
  {
    id: "execution",
    buildingIds: ["_execution"],
    usesArea: true,
    stats: [{ name: "prisoners", type: "integer" }, { name: "workers", type: "integer" }, { name: "fear", type: "relative" }],
    tileTypes: {
      xx: { availability: "ROOM", sprite: "PODIUM_BOX" },
      ca: { availability: "ROOM_SOLID", canGoCandle: true, sprite: "PODIUM_BOX" },
      aa: { availability: "PENALTY4", sprite: "PODIUM_BOX" },
      cc: { availability: "PENALTY4", data: 1, sprite: "PODIUM_BOX" },
      bb: { availability: "PENALTY4", sprite: "PODIUM_BOX" },
      ee: { mustBeReachable: true, availability: "ROOM", sprite: "PODIUM_BOX" },
      mm: { availability: "AVOID_PASS", data: 3, sprite: "PODIUM_BOX" },
      hh: { availability: "ROOM_SOLID", sprite: "PODIUM_BOX" }
    },
    groups: [
    {
      min: 0,
      rotations: 1,
      items: [
        { tiles: [["xx", "xx", "xx", "xx", "xx", "xx"], ["xx", "ca", "aa", "cc", "bb", "xx"], ["xx", "xx", "xx", "xx", "xx", "xx"]], multiplier: 6, multiplierStats: 1 },
        { tiles: [["xx", "xx", "xx", "xx", "xx", "xx", "xx"], ["xx", "ca", "aa", "cc", "cc", "bb", "xx"], ["xx", "xx", "xx", "xx", "xx", "xx", "xx"]], multiplier: 7, multiplierStats: 2 },
        { tiles: [["xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx"], ["xx", "ca", "aa", "cc", "cc", "cc", "bb", "xx"], ["xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx"]], multiplier: 8, multiplierStats: 3 },
        { tiles: [["xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx"], ["xx", "ca", "aa", "cc", "cc", "cc", "cc", "bb", "xx"], ["xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx"]], multiplier: 8, multiplierStats: 4 },
        { tiles: [["xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx"], ["xx", "ca", "aa", "cc", "cc", "cc", "cc", "cc", "bb", "xx"], ["xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx"]], multiplier: 8, multiplierStats: 5 }
      ]
    },
    {
      min: 0,
      rotations: 1,
      items: [
        { tiles: [["xx", "ca", "mm", "xx"], ["xx", "xx", "cc", "xx"], ["xx", "ee", "hh", "ee"]], multiplier: 6, multiplierStats: 1 },
        { tiles: [["xx", "ca", "mm", "mm", "xx"], ["xx", "xx", "cc", "cc", "xx"], ["xx", "ee", "hh", "hh", "ee"]], multiplier: 7, multiplierStats: 2 },
        { tiles: [["xx", "ca", "mm", "mm", "xx", "mm", "xx"], ["xx", "xx", "cc", "cc", "xx", "cc", "xx"], ["xx", "ee", "hh", "hh", "ee", "hh", "ee"]], multiplier: 9, multiplierStats: 3 },
        { tiles: [["xx", "ca", "mm", "mm", "xx", "mm", "mm", "xx"], ["xx", "xx", "cc", "cc", "xx", "cc", "cc", "xx"], ["xx", "ee", "hh", "hh", "ee", "hh", "hh", "ee"]], multiplier: 10, multiplierStats: 4 }
      ]
    },
    {
      min: 0,
      rotations: 1,
      items: [
        { tiles: [["ca", "xx", "ca"]], multiplier: 3, multiplierStats: 1 },
        { tiles: [["ca", "xx", "xx", "ca"]], multiplier: 4, multiplierStats: 2 },
        { tiles: [["ca", "xx", "xx", "xx", "ca"]], multiplier: 5, multiplierStats: 3 },
        { tiles: [["ca", "xx", "xx", "xx", "xx", "ca"]], multiplier: 6, multiplierStats: 4 },
        { tiles: [["ca", "xx", "xx", "xx", "xx", "xx", "ca"]], multiplier: 7, multiplierStats: 5 }
      ]
    }
    ]
  },
  {
    id: "export",
    buildingIds: ["_export"],
    stats: [{ name: "crates", type: "custom" }],
    tileTypes: {
      cc: { mustBeReachable: true, availability: "ROOM_SOLID", data: 1, sprite: "CRATE_1X1" },
      ca: { availability: "ROOM_SOLID", canGoCandle: true, data: 2, sprite: "CRATE_1X1" },
      cr: { mustBeReachable: true, availability: "ROOM_SOLID", data: 1, sprite: "CRATE_1X1" },
      rr: { availability: "ROOM_SOLID", sprite: "CRATE_1X1" },
      rc: { availability: "ROOM_SOLID", canGoCandle: true, data: 2, sprite: "CRATE_1X1" },
      __: { availability: "ROOM" }
    },
    groups: [
    {
      min: 0,
      rotations: 1,
      items: [
        { tiles: [[null, null, null, null, null], [null, "cc", "ca", "cc", null], [null, "cc", "rr", "cr", null], [null, "cc", "rc", "cr", null], [null, null, null, null, null]], multiplier: 6 },
        { tiles: [[null, null, null, null, null], [null, "cc", "ca", "cc", null], [null, "cc", "rr", "cr", null], [null, "cc", "rr", "cr", null], [null, "cc", "rc", "cr", null], [null, null, null, null, null]], multiplier: 8 },
        { tiles: [[null, null, null, null, null], [null, "cc", "ca", "cc", null], [null, "cc", "rr", "cr", null], [null, "cc", "rr", "cr", null], [null, "cc", "rr", "cr", null], [null, "cc", "rc", "cr", null], [null, null, null, null, null]], multiplier: 10 },
        { tiles: [[null, null, null, null, null], [null, "cc", "ca", "cc", null], [null, "cc", "rr", "cr", null], [null, "cc", "rr", "cr", null], [null, "cc", "rr", "cr", null], [null, "cc", "rr", "cr", null], [null, "cc", "rc", "cr", null], [null, null, null, null, null]], multiplier: 12 },
        { tiles: [[null, null, null, null, null], [null, "cc", "ca", "cc", null], [null, "cc", "rr", "cr", null], [null, "cc", "rr", "cr", null], [null, "cc", "rr", "cr", null], [null, "cc", "rr", "cr", null], [null, "cc", "rr", "cr", null], [null, "cc", "rc", "cr", null], [null, null, null, null, null]], multiplier: 14 },
        { tiles: [[null, null, null, null, null], [null, "cc", "ca", "cc", null], [null, "cc", "rr", "cr", null], [null, "cc", "rr", "cr", null], [null, "cc", "rr", "cr", null], [null, "cc", "rr", "cr", null], [null, "cc", "rr", "cr", null], [null, "cc", "rr", "cr", null], [null, "cc", "rc", "cr", null], [null, null, null, null, null]], multiplier: 16 },
        { tiles: [[null, null, null, null, null], [null, "cc", "ca", "cc", null], [null, "cc", "rr", "cr", null], [null, "cc", "rr", "cr", null], [null, "cc", "rr", "cr", null], [null, "cc", "rr", "cr", null], [null, "cc", "rr", "cr", null], [null, "cc", "rr", "cr", null], [null, "cc", "rr", "cr", null], [null, "cc", "rc", "cr", null], [null, null, null, null, null]], multiplier: 18 },
        { tiles: [[null, null, null, null, null, null, null, null, null], [null, "cc", "ca", "cc", null, "cc", "ca", "cc", null], [null, "cc", "rr", "cr", null, "cc", "rr", "cr", null], [null, "cc", "rr", "cr", null, "cc", "rr", "cr", null], [null, "cc", "rr", "cr", null, "cc", "rr", "cr", null], [null, "cc", "rr", "cr", null, "cc", "rr", "cr", null], [null, "cc", "rr", "cr", null, "cc", "rr", "cr", null], [null, "cc", "rr", "cr", null, "cc", "rr", "cr", null], [null, "cc", "rr", "cr", null, "cc", "rr", "cr", null], [null, "cc", "rc", "cr", null, "cc", "rc", "cr", null], [null, null, null, null, null, null, null, null, null]], multiplier: 40 },
        { tiles: [[null, null, null, null, null, null, null, null, null, null, null, null, null], [null, "cc", "ca", "cc", null, "cc", "ca", "cc", null, "cc", "ca", "cc", null], [null, "cc", "rr", "cr", null, "cc", "rr", "cr", null, "cc", "rr", "cr", null], [null, "cc", "rr", "cr", null, "cc", "rr", "cr", null, "cc", "rr", "cr", null], [null, "cc", "rr", "cr", null, "cc", "rr", "cr", null, "cc", "rr", "cr", null], [null, "cc", "rr", "cr", null, "cc", "rr", "cr", null, "cc", "rr", "cr", null], [null, "cc", "rr", "cr", null, "cc", "rr", "cr", null, "cc", "rr", "cr", null], [null, "cc", "rr", "cr", null, "cc", "rr", "cr", null, "cc", "rr", "cr", null], [null, "cc", "rr", "cr", null, "cc", "rr", "cr", null, "cc", "rr", "cr", null], [null, "cc", "rc", "cr", null, "cc", "rc", "cr", null, "cc", "rc", "cr", null], [null, null, null, null, null, null, null, null, null, null, null, null, null]], multiplier: 60 }
      ]
    }
    ]
  },
  {
    id: "fightpit",
    buildingIds: ["fightpit_normal"],
    stats: [{ name: "workers", type: "integer" }, { name: "spectators", type: "services" }],
    tileTypes: {
      xx: { availability: "SOLID", sprite: "WALL_1X1" },
      cc: { availability: "SOLID", sprite: "TORCH_1X1" },
      pp: { availability: "SOLID", sprite: "TOWER_1X1" },
      ee: { mustBeReachable: true, availability: "ROOM", sprite: "SEAT_BOX" },
      sl: { availability: "ROOM" },
      sc: { availability: "ROOM" },
      sr: { availability: "ROOM" },
      _1: { availability: "ROOM", sprite: "SEAT_BOX" },
      _2: { availability: "PENALTY4", data: 1, sprite: "SEAT_BOX" },
      xu: { availability: "SOLID", sprite: "RIM_BOX" },
      __: { availability: "ROOM", data: 2 }
    },
    groups: [
    {
      min: 1,
      rotations: 3,
      items: [
        { tiles: [["pp", "xx", "xx", "xx", "pp", "xx", "xx", "xx", "xx", "xx", "pp", "xx", "xx", "xx", "pp"], ["xx", "_1", "_1", "_1", "_1", "_1", "_1", "_1", "_1", "_1", "_1", "_1", "_1", "_1", "xx"], ["xx", "_1", "_2", "_2", "_2", "_2", "_2", "_2", "_2", "_2", "_2", "_2", "_2", "_1", "xx"], ["xx", "_1", "_2", "_2", "_2", "_2", "_2", "_2", "_2", "_2", "_2", "_2", "_2", "_1", "xx"], ["pp", "_1", "_2", "_2", "cc", "xu", "xu", "xu", "xu", "xu", "cc", "_2", "_2", "_1", "pp"], ["xx", "_1", "_2", "_2", "xu", null, null, null, null, null, "xu", "_2", "_2", "_1", "xx"], ["xx", "_1", "_2", "_2", "xu", null, null, null, null, null, "xu", "_2", "_2", "_1", "xx"], ["xx", "_1", "_2", "_2", "xu", null, null, null, null, null, "xu", "_2", "_2", "_1", "xx"], ["xx", "_1", "_2", "_2", "xu", null, null, null, null, null, "xu", "_2", "_2", "_1", "xx"], ["xx", "_1", "_2", "_2", "xu", null, null, null, null, null, "xu", "_2", "_2", "_1", "xx"], ["pp", "_1", "_2", "_2", "cc", "xu", "sl", "sc", "sr", "xu", "cc", "_2", "_2", "_1", "pp"], ["xx", "_1", "_2", "_2", "_2", "_2", "sl", "sc", "sr", "_2", "_2", "_2", "_2", "_1", "xx"], ["xx", "_1", "_2", "_2", "_2", "_2", "sl", "sc", "sr", "_2", "_2", "_2", "_2", "_1", "xx"], ["xx", "_1", "_1", "_1", "_1", "_1", "sl", "sc", "sr", "_1", "_1", "_1", "_1", "_1", "xx"], ["pp", "xx", "xx", "xx", "xx", "pp", "ee", "ee", "ee", "pp", "xx", "xx", "xx", "xx", "pp"]], multiplier: 2 },
        { tiles: [["pp", "xx", "xx", "xx", "pp", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "pp", "xx", "xx", "xx", "pp"], ["xx", "_1", "_1", "_1", "_1", "_1", "_1", "_1", "_1", "_1", "_1", "_1", "_1", "_1", "_1", "_1", "_1", "xx"], ["xx", "_1", "_2", "_2", "_2", "_2", "_2", "_2", "_2", "_2", "_2", "_2", "_2", "_2", "_2", "_2", "_1", "xx"], ["xx", "_1", "_2", "_2", "_2", "_2", "_2", "_2", "_2", "_2", "_2", "_2", "_2", "_2", "_2", "_2", "_1", "xx"], ["pp", "_1", "_2", "_2", "cc", "xu", "xu", "xu", "xu", "xu", "xu", "xu", "xu", "cc", "_2", "_2", "_1", "pp"], ["xx", "_1", "_2", "_2", "xu", null, null, null, null, null, null, null, null, "xu", "_2", "_2", "_1", "xx"], ["xx", "_1", "_2", "_2", "xu", null, null, null, null, null, null, null, null, "xu", "_2", "_2", "_1", "xx"], ["xx", "_1", "_2", "_2", "xu", null, null, null, null, null, null, null, null, "xu", "_2", "_2", "_1", "xx"], ["pp", "_1", "_2", "_2", "cc", "xu", "sl", "sr", "xu", "xu", "sl", "sr", "xu", "cc", "_2", "_2", "_1", "pp"], ["xx", "_1", "_2", "_2", "_2", "_2", "sl", "sr", "_2", "_2", "sl", "sr", "_2", "_2", "_2", "_2", "_1", "xx"], ["xx", "_1", "_2", "_2", "_2", "_2", "sl", "sr", "_2", "_2", "sl", "sr", "_2", "_2", "_2", "_2", "_1", "xx"], ["xx", "_1", "_1", "_1", "_1", "_1", "sl", "sr", "_1", "_1", "sl", "sr", "_1", "_1", "_1", "_1", "_1", "xx"], ["pp", "xx", "xx", "xx", "xx", "pp", "ee", "ee", "pp", "pp", "ee", "ee", "pp", "xx", "xx", "xx", "xx", "pp"]], multiplier: 2 }
      ]
    }
    ]
  },
  {
    id: "fishery",
    buildingIds: ["fishery_normal", "fishery_normal_fish"],
    usesArea: true,
    stats: [{ name: "workers", type: "custom" }, { name: "storage", type: "custom" }, { name: "efficiency", type: "efficiency" }, { name: "deepBoost", type: "custom" }, { name: "production", type: "production" }],
    tileTypes: {
      ss: { mustBeReachable: true, availability: "ROOM_SOLID", data: 2, sprite: "STORAGE_BOTTOM_1X1" },
      cc: { availability: "ROOM_SOLID", canGoCandle: true, sprite: "CANDLE_1X1" },
      ms: { availability: "ROOM_SOLID", sprite: "MISC_1X1" },
      m1: { availability: "ROOM_SOLID", sprite: "AUX_EDGE_1X1" },
      m2: { availability: "ROOM_SOLID", sprite: "AUX_MID_1X1" },
      ml: { availability: "ROOM_SOLID", sprite: "AUX_BIG_2X2" },
      ww: { mustBeReachable: true, availability: "ROOM_SOLID", data: 1, sprite: "WORKTABLE_1X1" }
    },
    groups: [
    {
      min: 1,
      max: 1,
      rotations: 3,
      items: [
        { tiles: [["ss", "ss"], ["cc", "ms"]], multiplier: 6, multiplierStats: 2 },
        { tiles: [["ss", "ss", "ms"], ["ss", "ss", "cc"]], multiplier: 8, multiplierStats: 4 },
        { tiles: [["ss", "ss", "ss", "cc"], ["ss", "ss", "ss", "ms"]], multiplier: 10, multiplierStats: 6 },
        { tiles: [["ss", "ss", "ss", "ss", "cc"], ["ss", "ss", "ss", "ss", "ms"]], multiplier: 12, multiplierStats: 8 },
        { tiles: [["ss", "ss", "ss", "ss", "ss", "cc"], ["ss", "ss", "ss", "ss", "ss", "ms"]], multiplier: 14, multiplierStats: 10 },
        { tiles: [["ss", "ss", "ss", "ss", "ss", "ss", "cc"], ["ss", "ss", "ss", "ss", "ss", "ss", "ms"]], multiplier: 16, multiplierStats: 12 },
        { tiles: [["ss", "ss", "ss", "ss", "ss", "ss", "ss", "cc"], ["ss", "ss", "ss", "ss", "ss", "ss", "ss", "ms"]], multiplier: 18, multiplierStats: 14 },
        { tiles: [["ss", "ss", "ss", "ss", "ss", "ss", "ss", "ss", "cc"], ["ss", "ss", "ss", "ss", "ss", "ss", "ss", "ss", "ms"]], multiplier: 20, multiplierStats: 16 },
        { tiles: [["ss", "ss", "ss", "ss", "ss", "ss", "ss", "ss", "ss", "cc"], ["ss", "ss", "ss", "ss", "ss", "ss", "ss", "ss", "ss", "ms"]], multiplier: 22, multiplierStats: 18 },
        { tiles: [["ss", "ss", "ss", "ss", "ss", "ss", "ss", "ss", "ss", "ss", "cc"], ["ss", "ss", "ss", "ss", "ss", "ss", "ss", "ss", "ss", "ss", "ms"]], multiplier: 24, multiplierStats: 20 }
      ]
    },
    {
      min: 0,
      rotations: 3,
      items: [
        { tiles: [["ms"]], multiplier: 1 },
        { tiles: [["ms", "cc"]], multiplier: 2 },
        { tiles: [["ms", "ww", "cc"]], multiplier: 3 },
        { tiles: [["ms", "ww", "cc", "ms"]], multiplier: 4 },
        { tiles: [["ms", "ww"], ["cc", "ms"]], multiplier: 4 },
        { tiles: [["ms", "ww", "cc"], ["ms", "ms", "ms"]], multiplier: 6 },
        { tiles: [["ms", "ww", "cc", "ms"], ["ms", "m1", "m1", "ww"]], multiplier: 8 },
        { tiles: [["ww", "ml", "ml", "ms", "cc"], ["ww", "ml", "ml", "ww", "ms"]], multiplier: 10 },
        { tiles: [["ww", "ml", "ml", "ww", "ms", "cc"], ["ww", "ml", "ml", "m1", "m1", "ms"]], multiplier: 12 },
        { tiles: [["ww", "ml", "ml", "ww", "ms", "cc", "ww"], ["ww", "ml", "ml", "m1", "m2", "m1", "ms"]], multiplier: 14 }
      ]
    }
    ]
  },
  {
    id: "gatehouse",
    buildingIds: ["gatehouse_normal"],
    tileTypes: {
      t1: { availability: "ENEMY" },
      t1b: { availability: "ENEMY" },
      t2: { availability: "ENEMY" },
      t3: { availability: "ENEMY" },
      t1_1: { availability: "ENEMY" },
      t1_2: { availability: "ENEMY" },
      t1_1b: { availability: "ENEMY" },
      t1_2b: { availability: "ENEMY" },
      t2_1: { availability: "ENEMY" },
      t2_2: { availability: "ENEMY" },
      t3_1: { availability: "ENEMY" },
      t3_2: { availability: "ENEMY" }
    },
    groups: [
    {
      min: 0,
      rotations: 3,
      items: [
        { tiles: [["t1"], ["t1b"]], multiplier: 1 },
        { tiles: [["t1"], ["t2"], ["t1b"]], multiplier: 1.5 },
        { tiles: [["t1"], ["t2"], ["t3"], ["t1b"]], multiplier: 2 },
        { tiles: [["t1_1", "t1_2"], ["t2_1", "t2_2"], ["t3_1", "t3_2"], ["t2_1", "t2_2"], ["t1_2b", "t1_1b"]], multiplier: 6 },
        { tiles: [["t1_1", "t1_2"], ["t2_1", "t2_2"], ["t3_1", "t3_2"], ["t2_1", "t2_2"], ["t3_1", "t3_2"], ["t1_2b", "t1_1b"]], multiplier: 8 },
        { tiles: [["t1_1", "t1_2"], ["t2_1", "t2_2"], ["t3_1", "t3_2"], ["t2_1", "t2_2"], ["t3_1", "t3_2"], ["t2_1", "t2_2"], ["t1_2b", "t1_1b"]], multiplier: 10 }
      ]
    }
    ]
  },
  {
    id: "graveyard",
    buildingIds: ["graveyard_normal"],
    usesArea: true,
    mustBeOutdoors: true,
    stats: [{ name: "workers", type: "employees" }, { name: "services", type: "integer" }, { name: "respekk", type: "relative" }],
    tileTypes: {
      h1: { availability: "AVOID_PASS", data: 2, sprite: "GRAVE_A_TOP_1X1" },
      t1: { mustBeReachable: true, availability: "AVOID_PASS", data: 1, sprite: "GRAVE_A_BOTTOM_1X1" },
      st: { availability: "SOLID", canGoCandle: true, sprite: "TOMBSTONE_1X1" },
      it: { availability: "SOLID", sprite: "FLOWER_COMBO" },
      it_area_0: { availability: "AVOID_LIKE_FUCK", sprite: "FLOWER_COMBO" },
      it_area_1: { availability: "ROOM", data: 3, sprite: "FLOWER_COMBO" }
    },
    groups: [
    {
      min: 1,
      rotations: 3,
      items: [
        { tiles: [["st"], ["h1"], ["t1"]], multiplier: 1 },
        { tiles: [["st", "st"], ["h1", "h1"], ["t1", "t1"]], multiplier: 2 },
        { tiles: [["st", "st", "st"], ["h1", "h1", "h1"], ["t1", "t1", "t1"]], multiplier: 3 },
        { tiles: [["st", "st", "st", "st"], ["h1", "h1", "h1", "h1"], ["t1", "t1", "t1", "t1"]], multiplier: 4 },
        { tiles: [["st", "st", "st", "st", "st"], ["h1", "h1", "h1", "h1", "h1"], ["t1", "t1", "t1", "t1", "t1"]], multiplier: 5 },
        { tiles: [["st", "st", "st", "st", "st", "st"], ["h1", "h1", "h1", "h1", "h1", "h1"], ["t1", "t1", "t1", "t1", "t1", "t1"]], multiplier: 6 },
        { tiles: [["st", "st", "st", "st", "st", "st", "st"], ["h1", "h1", "h1", "h1", "h1", "h1", "h1"], ["t1", "t1", "t1", "t1", "t1", "t1", "t1"]], multiplier: 7 }
      ]
    },
    {
      min: 1,
      rotations: 3,
      items: [
        { tiles: [["it"]], multiplier: 1 },
        { tiles: [["it", "it"], ["it", "it"]], multiplier: 4 },
        { tiles: [["it", "it", "it"], ["it", "it", "it"], ["it", "it", "it"]], multiplier: 9 }
      ]
    },
    {
      min: 1,
      rotations: 0,
      items: [
        { tiles: [["it_area_0"]], multiplier: 1 },
        { tiles: [["it_area_0", "it_area_0"]], multiplier: 2 },
        { tiles: [["it_area_0", "it_area_0", "it_area_0"]], multiplier: 3 },
        { tiles: [["it_area_0", "it_area_0", "it_area_0", "it_area_0"]], multiplier: 4 },
        { tiles: [["it_area_0", "it_area_0", "it_area_0", "it_area_0", "it_area_0"]], multiplier: 5 },
        { tiles: [["it_area_0", "it_area_0", "it_area_0", "it_area_0", "it_area_0", "it_area_0"]], multiplier: 6 },
        { tiles: [["it_area_0", "it_area_0"], ["it_area_0", "it_area_0"]], multiplier: 4 },
        { tiles: [["it_area_0", "it_area_0", "it_area_0"], ["it_area_0", "it_area_0", "it_area_0"]], multiplier: 6 },
        { tiles: [["it_area_0", "it_area_0", "it_area_0", "it_area_0"], ["it_area_0", "it_area_0", "it_area_0", "it_area_0"]], multiplier: 8 },
        { tiles: [["it_area_0", "it_area_0", "it_area_0", "it_area_0", "it_area_0"], ["it_area_0", "it_area_0", "it_area_0", "it_area_0", "it_area_0"]], multiplier: 10 },
        { tiles: [["it_area_0", "it_area_0", "it_area_0", "it_area_0", "it_area_0", "it_area_0"], ["it_area_0", "it_area_0", "it_area_0", "it_area_0", "it_area_0", "it_area_0"]], multiplier: 12 },
        { tiles: [["it_area_0", "it_area_0", "it_area_0"], ["it_area_0", "it_area_0", "it_area_0"], ["it_area_0", "it_area_0", "it_area_0"]], multiplier: 9 },
        { tiles: [["it_area_0", "it_area_0", "it_area_0", "it_area_0"], ["it_area_0", "it_area_0", "it_area_0", "it_area_0"], ["it_area_0", "it_area_0", "it_area_0", "it_area_0"]], multiplier: 12 },
        { tiles: [["it_area_0", "it_area_0", "it_area_0", "it_area_0", "it_area_0"], ["it_area_0", "it_area_0", "it_area_0", "it_area_0", "it_area_0"], ["it_area_0", "it_area_0", "it_area_0", "it_area_0", "it_area_0"]], multiplier: 15 },
        { tiles: [["it_area_0", "it_area_0", "it_area_0", "it_area_0", "it_area_0", "it_area_0"], ["it_area_0", "it_area_0", "it_area_0", "it_area_0", "it_area_0", "it_area_0"], ["it_area_0", "it_area_0", "it_area_0", "it_area_0", "it_area_0", "it_area_0"]], multiplier: 18 },
        { tiles: [["it_area_0", "it_area_0", "it_area_0", "it_area_0", "it_area_0", "it_area_0", "it_area_0"], ["it_area_0", "it_area_0", "it_area_0", "it_area_0", "it_area_0", "it_area_0", "it_area_0"], ["it_area_0", "it_area_0", "it_area_0", "it_area_0", "it_area_0", "it_area_0", "it_area_0"]], multiplier: 21 }
      ]
    },
    {
      min: 1,
      rotations: 0,
      items: [
        { tiles: [["it_area_1"]], multiplier: 1 },
        { tiles: [["it_area_1", "it_area_1"]], multiplier: 2 },
        { tiles: [["it_area_1", "it_area_1", "it_area_1"]], multiplier: 3 },
        { tiles: [["it_area_1", "it_area_1", "it_area_1", "it_area_1"]], multiplier: 4 },
        { tiles: [["it_area_1", "it_area_1", "it_area_1", "it_area_1", "it_area_1"]], multiplier: 5 },
        { tiles: [["it_area_1", "it_area_1", "it_area_1", "it_area_1", "it_area_1", "it_area_1"]], multiplier: 6 },
        { tiles: [["it_area_1", "it_area_1"], ["it_area_1", "it_area_1"]], multiplier: 4 },
        { tiles: [["it_area_1", "it_area_1", "it_area_1"], ["it_area_1", "it_area_1", "it_area_1"]], multiplier: 6 },
        { tiles: [["it_area_1", "it_area_1", "it_area_1", "it_area_1"], ["it_area_1", "it_area_1", "it_area_1", "it_area_1"]], multiplier: 8 },
        { tiles: [["it_area_1", "it_area_1", "it_area_1", "it_area_1", "it_area_1"], ["it_area_1", "it_area_1", "it_area_1", "it_area_1", "it_area_1"]], multiplier: 10 },
        { tiles: [["it_area_1", "it_area_1", "it_area_1", "it_area_1", "it_area_1", "it_area_1"], ["it_area_1", "it_area_1", "it_area_1", "it_area_1", "it_area_1", "it_area_1"]], multiplier: 12 },
        { tiles: [["it_area_1", "it_area_1", "it_area_1"], ["it_area_1", "it_area_1", "it_area_1"], ["it_area_1", "it_area_1", "it_area_1"]], multiplier: 9 },
        { tiles: [["it_area_1", "it_area_1", "it_area_1", "it_area_1"], ["it_area_1", "it_area_1", "it_area_1", "it_area_1"], ["it_area_1", "it_area_1", "it_area_1", "it_area_1"]], multiplier: 12 },
        { tiles: [["it_area_1", "it_area_1", "it_area_1", "it_area_1", "it_area_1"], ["it_area_1", "it_area_1", "it_area_1", "it_area_1", "it_area_1"], ["it_area_1", "it_area_1", "it_area_1", "it_area_1", "it_area_1"]], multiplier: 15 },
        { tiles: [["it_area_1", "it_area_1", "it_area_1", "it_area_1", "it_area_1", "it_area_1"], ["it_area_1", "it_area_1", "it_area_1", "it_area_1", "it_area_1", "it_area_1"], ["it_area_1", "it_area_1", "it_area_1", "it_area_1", "it_area_1", "it_area_1"]], multiplier: 18 },
        { tiles: [["it_area_1", "it_area_1", "it_area_1", "it_area_1", "it_area_1", "it_area_1", "it_area_1"], ["it_area_1", "it_area_1", "it_area_1", "it_area_1", "it_area_1", "it_area_1", "it_area_1"], ["it_area_1", "it_area_1", "it_area_1", "it_area_1", "it_area_1", "it_area_1", "it_area_1"]], multiplier: 21 }
      ]
    }
    ]
  },
  {
    id: "guard",
    buildingIds: ["_guard"],
    stats: [{ name: "guards", type: "custom" }, { name: "radius", type: "custom" }],
    tileTypes: {
      xx: { availability: "SOLID", sprite: "FLOOR_BOX" },
      __: { availability: "ROOM", data: 4, sprite: "FLOOR_BOX" },
      i1: { availability: "SOLID", data: 3, sprite: "FLOOR_BOX" }
    },
    groups: [
    {
      min: 1,
      rotations: 3,
      items: [
        { tiles: [["xx", "i1", "xx"], ["xx", null, "xx"], [null, null, null], ["xx", null, "xx"]], multiplier: 0.5 },
        { tiles: [["xx", "xx", null, "xx", "xx"], ["xx", null, null, null, "xx"], [null, null, "i1", null, null], ["xx", null, null, null, "xx"], ["xx", "xx", null, "xx", "xx"]], multiplier: 0.75 },
        { tiles: [["xx", "xx", "xx", null, null, "xx", "xx", "xx"], ["xx", null, null, null, null, null, null, "xx"], ["xx", null, null, null, null, null, null, "xx"], [null, null, null, "i1", "i1", null, null, null], [null, null, null, "i1", "i1", null, null, null], ["xx", null, null, null, null, null, null, "xx"], ["xx", null, null, null, null, null, null, "xx"], ["xx", "xx", "xx", null, null, "xx", "xx", "xx"]], multiplier: 2 }
      ]
    }
    ]
  },
  {
    id: "hauler",
    buildingIds: ["_hauler"],
    tileTypes: {
      tt: { availability: "AVOID_PASS", sprite: "CRATE_1X1" },
      ff: { availability: "AVOID_PASS", sprite: "FENCE_COMBO" },
      __: { availability: "ROOM", data: 1, sprite: "CRATE_1X1" }
    },
    groups: [
    {
      min: 0,
      rotations: 3,
      items: [
        { tiles: [["tt"], [null]], multiplier: 1 },
        { tiles: [["tt", "ff"], [null, null]], multiplier: 2 },
        { tiles: [["ff", null, "ff"], [null, "tt", null], ["ff", null, "ff"]], multiplier: 4 },
        { tiles: [["ff", null, null, null, "ff"], [null, null, "tt", null, null], ["ff", null, null, null, "ff"]], multiplier: 11 },
        { tiles: [["ff", null, null, null, "ff"], [null, null, null, null, null], [null, null, "tt", null, null], [null, null, null, null, null], ["ff", null, null, null, "ff"]], multiplier: 20 },
        { tiles: [["ff", null, null, null, null, null, "ff"], [null, null, null, null, null, null, null], [null, null, null, null, null, null, null], [null, null, null, "tt", null, null, null], [null, null, null, null, null, null, null], [null, null, null, null, null, null, null], ["ff", null, null, null, null, null, "ff"]], multiplier: 44 }
      ]
    }
    ]
  },
  {
    id: "hearth",
    buildingIds: ["_hearth"],
    stats: [{ name: "services", type: "integer" }],
    tileTypes: {
      ff: { availability: "SOLID", data: 2, sprite: "HEARTH_COMBO" },
      fe: { availability: "SOLID", sprite: "HEARTH_COMBO" },
      bb: { availability: "PENALTY4", data: 1, sprite: "BENCH_1X1" },
      __: { availability: "ROOM" }
    },
    groups: [
    {
      min: 1,
      rotations: 3,
      items: [
        { tiles: [[null, "bb", null, "bb", null], [null, "bb", "ff", "bb", null], [null, "bb", null, "bb", null]], multiplier: 6 },
        { tiles: [[null, "bb", null, "bb", null], [null, "bb", null, "bb", null], [null, "bb", "ff", "bb", null], [null, "bb", null, "bb", null], [null, "bb", null, "bb", null]], multiplier: 10 },
        { tiles: [[null, "bb", null, "bb", null], [null, "bb", null, "bb", null], [null, "bb", "fe", "bb", null], [null, "bb", "ff", "bb", null], [null, "bb", "fe", "bb", null], [null, "bb", null, "bb", null], [null, "bb", null, "bb", null]], multiplier: 14 },
        { tiles: [[null, "bb", "bb", null, "bb", "bb", null], [null, "bb", "bb", "fe", "bb", "bb", null], [null, "bb", "bb", "ff", "bb", "bb", null], [null, "bb", "bb", "fe", "bb", "bb", null], [null, "bb", "bb", "ff", "bb", "bb", null], [null, "bb", "bb", "fe", "bb", "bb", null], [null, "bb", "bb", null, "bb", "bb", null]], multiplier: 28 }
      ]
    }
    ]
  },
  {
    id: "home",
    buildingIds: ["_home"],
    mustBeIndoors: true,
    stats: [{ name: "occupants", type: "integer" }],
    tileTypes: {
      ee: { mustBeReachable: true, availability: "ROOM", data: 2 },
      __: { availability: "ROOM", data: 1 },
      xx: { availability: "NOT_ACCESSIBLE" }
    },
    groups: [
    {
      min: 0,
      rotations: 3,
      items: [
        { tiles: [["xx", "xx", "xx"], ["xx", null, "xx"], ["xx", "ee", "xx"]], multiplier: 1 },
        { tiles: [["xx", "xx", "xx", "xx", "xx", "xx"], ["xx", null, "xx", "xx", null, "xx"], ["xx", "ee", "xx", "xx", "ee", "xx"]], multiplier: 2 },
        { tiles: [["xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx"], ["xx", null, "xx", "xx", null, "xx", "xx", null, "xx"], ["xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx"]], multiplier: 3 },
        { tiles: [["xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx"], ["xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx"], ["xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx"]], multiplier: 4 },
        { tiles: [["xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx"], ["xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx"], ["xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx"]], multiplier: 5 },
        { tiles: [["xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx"], ["xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx"], ["xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx"]], multiplier: 6 },
        { tiles: [["xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx"], ["xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx"], ["xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx"]], multiplier: 7 },
        { tiles: [["xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx"], ["xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx"], ["xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx"]], multiplier: 8 },
        { tiles: [["xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx"], ["xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx"], ["xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx"]], multiplier: 9 }
      ]
    },
    {
      min: 0,
      rotations: 3,
      items: [
        { tiles: [["xx", "xx", "xx"], ["xx", null, "xx"], ["xx", null, "xx"], ["xx", null, "xx"], ["xx", "ee", "xx"]], multiplier: 1 },
        { tiles: [["xx", "xx", "xx", "xx", "xx", "xx"], ["xx", null, "xx", "xx", null, "xx"], ["xx", null, "xx", "xx", null, "xx"], ["xx", null, "xx", "xx", null, "xx"], ["xx", "ee", "xx", "xx", "ee", "xx"]], multiplier: 2 },
        { tiles: [["xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx"], ["xx", null, "xx", "xx", null, "xx", "xx", null, "xx"], ["xx", null, "xx", "xx", null, "xx", "xx", null, "xx"], ["xx", null, "xx", "xx", null, "xx", "xx", null, "xx"], ["xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx"]], multiplier: 3 },
        { tiles: [["xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx"], ["xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx"], ["xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx"], ["xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx"], ["xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx"]], multiplier: 4 },
        { tiles: [["xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx"], ["xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx"], ["xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx"], ["xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx"], ["xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx"]], multiplier: 5 },
        { tiles: [["xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx"], ["xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx"], ["xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx"], ["xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx"], ["xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx"]], multiplier: 6 },
        { tiles: [["xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx"], ["xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx"], ["xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx"], ["xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx"], ["xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx"]], multiplier: 7 },
        { tiles: [["xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx"], ["xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx"], ["xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx"], ["xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx"], ["xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx"]], multiplier: 8 },
        { tiles: [["xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx"], ["xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx"], ["xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx"], ["xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx"], ["xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx"]], multiplier: 9 },
        { tiles: [["xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx"], ["xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx"], ["xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx"], ["xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx"], ["xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx"]], multiplier: 10 },
        { tiles: [["xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx"], ["xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx"], ["xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx"], ["xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx"], ["xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx"]], multiplier: 11 },
        { tiles: [["xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx"], ["xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx"], ["xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx"], ["xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx"], ["xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx"]], multiplier: 12 },
        { tiles: [["xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx"], ["xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx"], ["xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx"], ["xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx"], ["xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx"]], multiplier: 13 },
        { tiles: [["xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx"], ["xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx"], ["xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx"], ["xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx"], ["xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx"]], multiplier: 14 },
        { tiles: [["xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx"], ["xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx"], ["xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx"], ["xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx", "xx", null, "xx"], ["xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx", "xx", "ee", "xx"]], multiplier: 15 }
      ]
    },
    {
      min: 0,
      rotations: 3,
      items: [
        { tiles: [["xx", "xx", "xx", "xx", "xx"], ["xx", null, null, null, "xx"], ["xx", null, null, null, "xx"], ["xx", null, null, null, "xx"], ["xx", null, null, null, "xx"], ["xx", "xx", "ee", "xx", "xx"]], multiplier: 1 },
        { tiles: [["xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx"]], multiplier: 2 },
        { tiles: [["xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx"]], multiplier: 3 },
        { tiles: [["xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx"]], multiplier: 4 },
        { tiles: [["xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx"]], multiplier: 5 },
        { tiles: [["xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx"]], multiplier: 6 },
        { tiles: [["xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx"]], multiplier: 7 },
        { tiles: [["xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx"]], multiplier: 8 },
        { tiles: [["xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx"]], multiplier: 9 },
        { tiles: [["xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx"]], multiplier: 10 },
        { tiles: [["xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx"]], multiplier: 11 },
        { tiles: [["xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx"]], multiplier: 12 },
        { tiles: [["xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx"]], multiplier: 13 },
        { tiles: [["xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx"]], multiplier: 14 },
        { tiles: [["xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx"]], multiplier: 15 },
        { tiles: [["xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx"]], multiplier: 16 },
        { tiles: [["xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx"]], multiplier: 17 },
        { tiles: [["xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx"]], multiplier: 18 },
        { tiles: [["xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx"]], multiplier: 19 },
        { tiles: [["xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx"]], multiplier: 20 },
        { tiles: [["xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx"]], multiplier: 21 },
        { tiles: [["xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx"]], multiplier: 22 },
        { tiles: [["xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx"]], multiplier: 23 },
        { tiles: [["xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx"]], multiplier: 24 },
        { tiles: [["xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx"]], multiplier: 25 },
        { tiles: [["xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx"]], multiplier: 26 },
        { tiles: [["xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx"]], multiplier: 27 },
        { tiles: [["xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx"]], multiplier: 28 },
        { tiles: [["xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx"]], multiplier: 29 },
        { tiles: [["xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx", "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx", "xx", null, null, null, "xx"], ["xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx", "xx", "xx", "ee", "xx", "xx"]], multiplier: 30 }
      ]
    }
    ]
  },
  {
    id: "home_chamber",
    buildingIds: ["_home_chamber"],
    mustBeIndoors: true,
    stats: [{ name: "servants", type: "integer" }, { name: "users", type: "integer" }],
    tileTypes: {
      bb: { availability: "PENALTY4" },
      bc: { availability: "PENALTY4" },
      b1: { availability: "ROOM_SOLID", sprite: "BEDPOST_A_1X1" },
      b2: { availability: "ROOM_SOLID", sprite: "BEDPOST_B_1X1" },
      x1: { availability: "ROOM_SOLID", canGoCandle: true, sprite: "BENCH_END_1X1" },
      xx: { availability: "ROOM_SOLID", canGoCandle: true, sprite: "BENCH_CENTRE_1X1" },
      m1: { availability: "ROOM_SOLID", canGoCandle: true, sprite: "MANTEL_A_1X1" },
      m2: { availability: "ROOM_SOLID", canGoCandle: true, sprite: "MANTEL_B_1X1" },
      cc: { availability: "ROOM", sprite: "CARPET_COMBO" },
      ss: { availability: "ROOM_SOLID" },
      ee: { mustBeReachable: true, availability: "ROOM" },
      __: { availability: "ROOM" }
    },
    groups: [
    {
      min: 1,
      rotations: 3,
      items: [
        { tiles: [["x1", "cc", "b1", "b2", "cc", "x1"], ["xx", "cc", "bb", "bc", "cc", "m1"], ["xx", "cc", "bc", "bc", "cc", "m2"], ["x1", "cc", null, null, "cc", "x1"], [null, "cc", null, null, "cc", null], ["ss", "ss", null, null, "ss", "ss"], ["ss", "ss", "ee", "ee", "ss", "ss"]], multiplier: 1 }
      ]
    }
    ]
  },
  {
    id: "hospital",
    buildingIds: ["_hospital"],
    usesArea: true,
    mustBeIndoors: true,
    stats: [{ name: "patients", type: "integer" }, { name: "workers", type: "employees" }],
    tileTypes: {
      bb: { availability: "NOT_ACCESSIBLE" },
      ss: { mustBeReachable: true, availability: "NOT_ACCESSIBLE", data: 1 },
      tt: { availability: "ROOM_SOLID", canGoCandle: true, sprite: "TABLE_COMBO" }
    },
    groups: [
    {
      min: 1,
      rotations: 3,
      items: [
        { tiles: [["tt"], ["bb"], ["ss"]], multiplier: 1 },
        { tiles: [["tt", "tt"], ["bb", "bb"], ["ss", "ss"]], multiplier: 2 },
        { tiles: [["tt", "tt", "tt"], ["bb", "bb", "bb"], ["ss", "ss", "ss"]], multiplier: 3 },
        { tiles: [["tt", "tt", "tt", "tt"], ["bb", "bb", "bb", "bb"], ["ss", "ss", "ss", "ss"]], multiplier: 4 },
        { tiles: [["tt", "tt", "tt", "tt", "tt"], ["bb", "bb", "bb", "bb", "bb"], ["ss", "ss", "ss", "ss", "ss"]], multiplier: 5 },
        { tiles: [["ss"], ["bb"], ["tt"], ["bb"], ["ss"]], multiplier: 2 },
        { tiles: [["ss", "ss"], ["bb", "bb"], ["tt", "tt"], ["bb", "bb"], ["ss", "ss"]], multiplier: 4 },
        { tiles: [["ss", "ss", "ss"], ["bb", "bb", "bb"], ["tt", "tt", "tt"], ["bb", "bb", "bb"], ["ss", "ss", "ss"]], multiplier: 6 },
        { tiles: [["ss", "ss", "ss", "ss"], ["bb", "bb", "bb", "bb"], ["tt", "tt", "tt", "tt"], ["bb", "bb", "bb", "bb"], ["ss", "ss", "ss", "ss"]], multiplier: 8 },
        { tiles: [["ss", "ss", "ss", "ss", "ss"], ["bb", "bb", "bb", "bb", "bb"], ["tt", "tt", "tt", "tt", "tt"], ["bb", "bb", "bb", "bb", "bb"], ["ss", "ss", "ss", "ss", "ss"]], multiplier: 10 }
      ]
    }
    ]
  },
  {
    id: "hunter",
    buildingIds: ["hunter_normal", "hunter_normal_meat", "hunter_normal_leather"],
    usesArea: true,
    mustBeIndoors: true,
    stats: [{ name: "workers", type: "custom" }, { name: "efficiency", type: "efficiency" }, { name: "output", type: "custom" }],
    tileTypes: {
      ww: { mustBeReachable: true, availability: "ROOM_SOLID", sprite: "TABLE_COMBO" },
      rr: { mustBeReachable: true, availability: "ROOM_SOLID", sprite: "TABLE_COMBO" },
      mm: { availability: "ROOM_SOLID", canGoCandle: true, sprite: "TABLE_COMBO" },
      nn: { availability: "ROOM_SOLID", sprite: "STORAGE_1X1" }
    },
    groups: [
    {
      min: 0,
      rotations: 3,
      items: [
        { tiles: [["ww", "rr", "mm"]], multiplier: 1 },
        { tiles: [["ww", "rr", "mm"], ["ww", "rr", "mm"]], multiplier: 2 }
      ]
    },
    {
      min: 0,
      rotations: 3,
      items: [
        { tiles: [["mm"]], multiplier: 1 },
        { tiles: [["nn", "mm"]], multiplier: 2 },
        { tiles: [["nn", "mm", "nn"]], multiplier: 3 },
        { tiles: [["nn", "mm", "mm", "nn"]], multiplier: 4 },
        { tiles: [["nn", "mm", "mm", "mm", "nn"]], multiplier: 5 },
        { tiles: [["nn", "mm"], ["nn", "mm"]], multiplier: 4 },
        { tiles: [["nn", "mm", "nn"], ["nn", "mm", "nn"]], multiplier: 6 },
        { tiles: [["nn", "mm", "mm", "nn"], ["nn", "mm", "mm", "nn"]], multiplier: 8 },
        { tiles: [["nn", "mm", "mm", "mm", "nn"], ["nn", "mm", "mm", "mm", "nn"]], multiplier: 10 }
      ]
    }
    ]
  },
  {
    id: "import",
    buildingIds: ["_import"],
    stats: [{ name: "crates", type: "custom" }],
    tileTypes: {
      cr: { mustBeReachable: true, availability: "ROOM_SOLID", sprite: "CRATE_1X1" },
      ca: { availability: "ROOM_SOLID", canGoCandle: true, sprite: "CRATE_1X1" },
      ee: { availability: "ROOM" },
      cc: { availability: "ROOM" },
      __: { availability: "ROOM" },
      mm: { availability: "ROOM" }
    },
    groups: [
    {
      min: 0,
      rotations: 1,
      items: [
        { tiles: [["ee", "cc", "cc", "cc", "ee"], ["mm", "cr", "cr", "ca", "mm"], [null, null, null, null, null], ["mm", "cr", "cr", "ca", "mm"], ["ee", "cc", "cc", "cc", "ee"]], multiplier: 5, multiplierStats: 4 },
        { tiles: [["ee", "cc", "cc", "cc", "cc", "ee"], ["mm", "cr", "cr", "cr", "ca", "mm"], [null, null, null, null, null, null], ["mm", "cr", "cr", "cr", "ca", "mm"], ["ee", "cc", "cc", "cc", "cc", "ee"]], multiplier: 6 },
        { tiles: [["ee", "cc", "cc", "cc", "cc", "cc", "ee"], ["mm", "cr", "cr", "cr", "cr", "ca", "mm"], [null, null, null, null, null, null, null], ["mm", "cr", "cr", "cr", "cr", "ca", "mm"], ["ee", "cc", "cc", "cc", "cc", "cc", "ee"]], multiplier: 8 },
        { tiles: [["ee", "cc", "cc", "cc", "cc", "cc", "cc", "ee"], ["mm", "cr", "cr", "cr", "cr", "cr", "ca", "mm"], [null, null, null, null, null, null, null, null], ["mm", "cr", "cr", "cr", "cr", "cr", "ca", "mm"], ["ee", "cc", "cc", "cc", "cc", "cc", "cc", "ee"]], multiplier: 10 },
        { tiles: [["ee", "cc", "cc", "cc", "cc", "cc", "cc", "cc", "ee"], ["mm", "cr", "cr", "cr", "cr", "cr", "cr", "ca", "mm"], [null, null, null, null, null, null, null, null, null], ["mm", "cr", "cr", "cr", "cr", "cr", "cr", "ca", "mm"], ["ee", "cc", "cc", "cc", "cc", "cc", "cc", "cc", "ee"]], multiplier: 12 },
        { tiles: [["ee", "cc", "cc", "cc", "cc", "cc", "cc", "cc", "ee"], ["mm", "ca", "cr", "cr", "cr", "cr", "cr", "ca", "mm"], [null, null, null, null, null, null, null, null, null], [null, "cr", "cr", "cr", "cr", "cr", "cr", "cr", null], [null, "cr", "cr", "cr", "cr", "cr", "cr", "cr", null], [null, null, null, null, null, null, null, null, null], ["mm", "ca", "cr", "cr", "cr", "cr", "cr", "ca", "mm"], ["ee", "cc", "cc", "cc", "cc", "cc", "cc", "cc", "ee"]], multiplier: 26 },
        { tiles: [["ee", "cc", "cc", "cc", "cc", "cc", "cc", "cc", "ee"], ["mm", "ca", "cr", "cr", "cr", "cr", "cr", "ca", "mm"], [null, null, null, null, null, null, null, null, null], [null, "cr", "cr", "cr", "cr", "cr", "cr", "cr", null], [null, "cr", "cr", "cr", "cr", "cr", "cr", "cr", null], [null, null, null, null, null, null, null, null, null], [null, "cr", "cr", "cr", "cr", "cr", "cr", "cr", null], [null, "cr", "cr", "cr", "cr", "cr", "cr", "cr", null], [null, null, null, null, null, null, null, null, null], ["mm", "ca", "cr", "cr", "cr", "cr", "cr", "ca", "mm"], ["ee", "cc", "cc", "cc", "cc", "cc", "cc", "cc", "ee"]], multiplier: 40 }
      ]
    }
    ]
  },
  {
    id: "inn",
    buildingIds: ["_inn"],
    usesArea: true,
    mustBeIndoors: true,
    stats: [{ name: "beds", type: "integer" }, { name: "coziness", type: "relative" }, { name: "workers", type: "integer" }],
    tileTypes: {
      h1: { availability: "AVOID_LIKE_FUCK", data: 1, sprite: "BED_UNMADE_HEAD_1X1" },
      t1: { availability: "AVOID_LIKE_FUCK", data: 2, sprite: "BED_UNMADE_TAIL_1X1" },
      cc: { availability: "ROOM", data: 3 },
      ta: { availability: "ROOM_SOLID", canGoCandle: true, data: 3, sprite: "TABLE_COMBO" },
      ss: { mustBeReachable: true, availability: "ROOM" },
      sh: { availability: "ROOM_SOLID", data: 1, sprite: "SHELF_1X1" },
      ch: { availability: "ROOM_SOLID", data: 1, sprite: "CHEST_1X1" },
      nt: { availability: "ROOM_SOLID", canGoCandle: true, sprite: "TABLE_COMBO" },
      ni: { availability: "ROOM_SOLID", sprite: "NICKNACK_1X1" },
      _carpet_combo: { availability: "ROOM", sprite: "CARPET_COMBO" }
    },
    groups: [
    {
      min: 1,
      rotations: 3,
      items: [
        { tiles: [["ta", "ch", "h1"], ["ta", "cc", "t1"], ["sh", "ss", "sh"]], multiplier: 1 },
        { tiles: [["ta", "ch", "h1", "ta", "ch", "h1"], ["ta", "cc", "t1", "ta", "cc", "t1"], ["sh", "ss", "sh", "sh", "ss", "sh"]], multiplier: 2 },
        { tiles: [["ta", "ch", "h1", "ta", "ch", "h1", "ta", "ch", "h1"], ["ta", "cc", "t1", "ta", "cc", "t1", "ta", "cc", "t1"], ["sh", "ss", "sh", "sh", "ss", "sh", "sh", "ss", "sh"]], multiplier: 3 },
        { tiles: [["ta", "ch", "h1", "ta", "ch", "h1", "ta", "ch", "h1", "ta", "ch", "h1"], ["ta", "cc", "t1", "ta", "cc", "t1", "ta", "cc", "t1", "ta", "cc", "t1"], ["sh", "ss", "sh", "sh", "ss", "sh", "sh", "ss", "sh", "sh", "ss", "sh"]], multiplier: 4 }
      ]
    },
    {
      min: 0,
      rotations: 3,
      items: [
        { tiles: [["nt"]], multiplier: 1 },
        { tiles: [["nt", "ni"]], multiplier: 2 },
        { tiles: [["ni", "nt", "ni"]], multiplier: 3 },
        { tiles: [["ni", "nt", "nt", "ni", "sh"]], multiplier: 4 },
        { tiles: [["ni", "nt", "nt", "ni", "sh", "sh"]], multiplier: 5 },
        { tiles: [["ni", "nt", "nt", "ni", "sh", "sh", "sh"]], multiplier: 6 },
        { tiles: [["ni", "nt", "nt", "ni", "sh", "sh", "sh", "sh"]], multiplier: 7 }
      ]
    },
    {
      min: 1,
      rotations: 0,
      items: [
        { tiles: [["_carpet_combo"]], multiplier: 1 },
        { tiles: [["_carpet_combo", "_carpet_combo"]], multiplier: 2 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 3 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 4 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 5 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 6 },
        { tiles: [["_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo"]], multiplier: 4 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 6 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 8 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 10 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 12 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 9 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 12 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 15 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 18 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 21 }
      ]
    }
    ]
  },
  {
    id: "janitor",
    buildingIds: ["_janitor"],
    usesArea: true,
    mustBeIndoors: true,
    stats: [{ name: "workers", type: "integer" }, { name: "efficiency", type: "efficiency" }],
    tileTypes: {
      tc: { availability: "ROOM_SOLID", canGoCandle: true, sprite: "TABLE_COMBO" },
      ta: { mustBeReachable: true, availability: "ROOM_SOLID", data: 1, sprite: "TABLE_COMBO" },
      ng: { availability: "ROOM_SOLID", canGoCandle: true, sprite: "STORAGE_1X1" },
      nn: { availability: "ROOM_SOLID", sprite: "MISC_1X1" }
    },
    groups: [
    {
      min: 1,
      rotations: 3,
      items: [
        { tiles: [["tc", "ta", "ta", "ta", "tc"]], multiplier: 1 }
      ]
    },
    {
      min: 1,
      rotations: 3,
      items: [
        { tiles: [["nn", "ng"]], multiplier: 1 },
        { tiles: [["nn", "ng", "nn"]], multiplier: 1.5 },
        { tiles: [["nn", "ng", "ng", "nn"]], multiplier: 2 }
      ]
    }
    ]
  },
  {
    id: "laboratory",
    buildingIds: ["laboratory_normal", "laboratory_normal_consume_clay"],
    usesArea: true,
    mustBeIndoors: true,
    stats: [{ name: "workers", type: "custom" }, { name: "knowledge", type: "custom" }],
    tileTypes: {
      sh: { mustBeReachable: true, availability: "ROOM_SOLID", canGoCandle: true, data: 1, sprite: "SHELF_1X1" },
      st: { availability: "ROOM_SOLID", canGoCandle: true, data: 1, sprite: "TABLE_COMBO" },
      ch: { mustBeReachable: true, availability: "AVOID_PASS", canGoCandle: true, sprite: "CHAIR_1X1" },
      ex: { mustBeReachable: true, availability: "ROOM_SOLID", canGoCandle: true, data: 1, sprite: "WORK_STANDALONE_1X1" },
      ww: { availability: "ROOM_SOLID", data: 1, sprite: "TABLE_COMBO" },
      __: null
    },
    groups: [
    {
      min: 1,
      rotations: 3,
      items: [
        { tiles: [["sh", "st", "ww", "st", "ex"], [null, "ch", "ch", "ch", null]], multiplier: 5 },
        { tiles: [["sh", "st", "ww", "ww", "st", "ex"], [null, "ch", "ch", "ch", "ch", null]], multiplier: 6 },
        { tiles: [["sh", "st", "ww", "ww", "ww", "st", "ex"], [null, "ch", "ch", "ch", "ch", "ch", null]], multiplier: 7 },
        { tiles: [["sh", "st", "ww", "ww", "ww", "ww", "st", "ex"], [null, "ch", "ch", "ch", "ch", "ch", "ch", null]], multiplier: 8 },
        { tiles: [["sh", "st", "ww", "ww", "ww", "ww", "ww", "st", "ex"], [null, "ch", "ch", "ch", "ch", "ch", "ch", "ch", null]], multiplier: 9 },
        { tiles: [[null, "ch", "ch", "ch", null], ["sh", "st", "ww", "st", "ex"], ["sh", "st", "ww", "st", "ex"], [null, "ch", "ch", "ch", null]], multiplier: 10 },
        { tiles: [[null, "ch", "ch", "ch", "ch", null], ["sh", "st", "ww", "ww", "st", "ex"], ["sh", "st", "ww", "ww", "st", "ex"], [null, "ch", "ch", "ch", "ch", null]], multiplier: 12 },
        { tiles: [[null, "ch", "ch", "ch", "ch", "ch", null], ["sh", "st", "ww", "ww", "ww", "st", "ex"], ["sh", "st", "ww", "ww", "ww", "st", "ex"], [null, "ch", "ch", "ch", "ch", "ch", null]], multiplier: 14 },
        { tiles: [[null, "ch", "ch", "ch", "ch", "ch", "ch", null], ["sh", "st", "ww", "ww", "ww", "ww", "st", "ex"], ["sh", "st", "ww", "ww", "ww", "ww", "st", "ex"], [null, "ch", "ch", "ch", "ch", "ch", "ch", null]], multiplier: 16 },
        { tiles: [[null, "ch", "ch", "ch", "ch", "ch", "ch", "ch", null], ["sh", "st", "ww", "ww", "ww", "ww", "ww", "st", "ex"], ["sh", "st", "ww", "ww", "ww", "ww", "ww", "st", "ex"], [null, "ch", "ch", "ch", "ch", "ch", "ch", "ch", null]], multiplier: 18 }
      ]
    }
    ]
  },
  {
    id: "lavatory",
    buildingIds: ["lavatory_normal"],
    usesArea: true,
    mustBeIndoors: true,
    stats: [{ name: "latrines", type: "services" }, { name: "workers", type: "employeesRelative" }, { name: "basins", type: "relative" }],
    tileTypes: {
      tt: { mustBeReachable: true, availability: "AVOID_PASS", data: 32768, sprite: "SIT_COMBO" },
      cc: { availability: "ROOM_SOLID", sprite: "SIT_COMBO" },
      ce: { availability: "ROOM_SOLID", canGoCandle: true, sprite: "SIT_COMBO" },
      ww: { mustBeReachable: true, availability: "ROOM_SOLID", data: 16384, sprite: "TABLE_COMBO" },
      m1: { availability: "ROOM_SOLID", canGoCandle: true, sprite: "TABLE_COMBO" }
    },
    groups: [
    {
      min: 1,
      rotations: 3,
      items: [
        { tiles: [["ce", "cc", "ce"], ["tt", "tt", "tt"]], multiplier: 3 },
        { tiles: [["ce", "cc", "cc", "ce"], ["tt", "tt", "tt", "tt"]], multiplier: 4 },
        { tiles: [["ce", "cc", "cc", "cc", "ce"], ["tt", "tt", "tt", "tt", "tt"]], multiplier: 5 },
        { tiles: [["ce", "cc", "cc", "cc", "cc", "ce"], ["tt", "tt", "tt", "tt", "tt", "tt"]], multiplier: 6 },
        { tiles: [["ce", "cc", "cc", "cc", "cc", "cc", "ce"], ["tt", "tt", "tt", "tt", "tt", "tt", "tt"]], multiplier: 7 },
        { tiles: [["tt", "tt", "tt"], ["ce", "cc", "ce"], ["tt", "tt", "tt"]], multiplier: 6 },
        { tiles: [["tt", "tt", "tt", "tt"], ["ce", "cc", "cc", "ce"], ["tt", "tt", "tt", "tt"]], multiplier: 8 },
        { tiles: [["tt", "tt", "tt", "tt", "tt"], ["ce", "cc", "cc", "cc", "ce"], ["tt", "tt", "tt", "tt", "tt"]], multiplier: 10 },
        { tiles: [["tt", "tt", "tt", "tt", "tt", "tt"], ["ce", "cc", "cc", "cc", "cc", "ce"], ["tt", "tt", "tt", "tt", "tt", "tt"]], multiplier: 12 },
        { tiles: [["tt", "tt", "tt", "tt", "tt", "tt", "tt"], ["ce", "cc", "cc", "cc", "cc", "cc", "ce"], ["tt", "tt", "tt", "tt", "tt", "tt", "tt"]], multiplier: 14 }
      ]
    },
    {
      min: 0,
      rotations: 3,
      items: [
        { tiles: [["ww", "m1"]], multiplier: 1 },
        { tiles: [["ww", "m1", "ww"]], multiplier: 2 },
        { tiles: [["ww", "ww", "m1", "ww"]], multiplier: 3 },
        { tiles: [["ww", "ww", "m1", "ww", "ww"]], multiplier: 4 },
        { tiles: [["ww", "m1"], ["ww", "ww"]], multiplier: 3 },
        { tiles: [["ww", "m1", "ww"], ["ww", "m1", "ww"]], multiplier: 5 },
        { tiles: [["ww", "ww", "m1", "ww"], ["ww", "ww", "m1", "ww"]], multiplier: 7 },
        { tiles: [["ww", "ww", "m1", "ww", "ww"], ["ww", "ww", "m1", "ww", "ww"]], multiplier: 9 }
      ]
    }
    ]
  },
  {
    id: "library",
    buildingIds: ["library_normal", "library_normal_consume_leather"],
    usesArea: true,
    mustBeIndoors: true,
    stats: [{ name: "workers", type: "custom" }, { name: "knowledge", type: "custom" }, { name: "efficiency", type: "efficiency" }],
    tileTypes: {
      ss: { availability: "ROOM_SOLID", sprite: "SHELF_1X1" },
      ww: { availability: "ROOM_SOLID", sprite: "TABLE_COMBO" },
      st: { mustBeReachable: true, availability: "AVOID_PASS", sprite: "CHAIR_1X1" },
      ca: { availability: "ROOM_SOLID", canGoCandle: true, sprite: "TORCH_1x1" },
      ni: { availability: "ROOM_SOLID", sprite: "DECOR_1x1" },
      __: null,
      _carpet_combo: { availability: "ROOM", sprite: "CARPET_COMBO" }
    },
    groups: [
    {
      min: 1,
      rotations: 3,
      items: [
        { tiles: [["ss", "ss", "ww", "ca"], [null, null, "st", null]], multiplier: 1 },
        { tiles: [["ss", "ss", "ss", "ww", "ww", "ca"], [null, null, null, "st", "st", null]], multiplier: 2 },
        { tiles: [["ss", "ss", "ss", "ss", "ww", "ww", "ww", "ca"], [null, null, null, null, "st", "st", "st", null]], multiplier: 3 },
        { tiles: [["ss", "ss", "ss", "ss", "ss", "ww", "ww", "ww", "ww", "ca"], [null, null, null, null, null, "st", "st", "st", "st", null]], multiplier: 4 },
        { tiles: [["ss", "ss", "ss", "ss", "ss", "ss", "ww", "ww", "ww", "ww", "ww", "ca"], [null, null, null, null, null, null, "st", "st", "st", "st", "st", null]], multiplier: 5 },
        { tiles: [[null, null, "st", null], ["ss", "ss", "ww", "ni"], ["ss", "ss", "ww", "ca"], [null, null, "st", null]], multiplier: 2 },
        { tiles: [[null, null, null, "st", "st", null], ["ss", "ss", "ss", "ww", "ww", "ni"], ["ss", "ss", "ss", "ww", "ww", "ca"], [null, null, null, "st", "st", null]], multiplier: 4 },
        { tiles: [[null, null, null, null, "st", "st", "st", null], ["ss", "ss", "ss", "ss", "ww", "ww", "ww", "ni"], ["ss", "ss", "ss", "ss", "ww", "ww", "ww", "ca"], [null, null, null, null, "st", "st", "st", null]], multiplier: 6 },
        { tiles: [[null, null, null, null, null, "st", "st", "st", "st", null], ["ss", "ss", "ss", "ss", "ss", "ww", "ww", "ww", "ww", "ni"], ["ss", "ss", "ss", "ss", "ss", "ww", "ww", "ww", "ww", "ca"], [null, null, null, null, null, "st", "st", "st", "st", null]], multiplier: 8 },
        { tiles: [[null, null, null, null, null, null, "st", "st", "st", "st", "st", null], ["ss", "ss", "ss", "ss", "ss", "ss", "ww", "ww", "ww", "ww", "ww", "ca"], ["ss", "ss", "ss", "ss", "ss", "ss", "ww", "ww", "ww", "ww", "ww", "ca"], [null, null, null, null, null, null, "st", "st", "st", "st", "st", null]], multiplier: 10 }
      ]
    },
    {
      min: 1,
      rotations: 0,
      items: [
        { tiles: [["_carpet_combo"]], multiplier: 1 },
        { tiles: [["_carpet_combo", "_carpet_combo"]], multiplier: 2 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 3 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 4 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 5 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 6 },
        { tiles: [["_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo"]], multiplier: 4 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 6 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 8 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 10 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 12 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 9 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 12 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 15 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 18 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 21 }
      ]
    }
    ]
  },
  {
    id: "market",
    buildingIds: ["market_normal"],
    usesArea: true,
    stats: [{ name: "storage", type: "services" }, { name: "workers", type: "employees" }],
    tileTypes: {
      cr: { availability: "SOLID", data: 1, sprite: "CRATE_1X1" },
      st: { availability: "SOLID", data: 1, sprite: "STALL_BOTTOM_COMBO" },
      mm: { availability: "SOLID", canGoCandle: true, sprite: "MISC_BOTTOM_1X1" },
      __: { availability: "ROOM", sprite: "CARPET_COMBO" }
    },
    groups: [
    {
      min: 1,
      rotations: 3,
      items: [
        { tiles: [["cr", "st", "st", "st", "mm"], [null, null, null, null, null]], multiplier: 4 },
        { tiles: [["cr", "st", "st", "st", "st", "mm"], [null, null, null, null, null, null]], multiplier: 5 },
        { tiles: [["cr", "st", "st", "st", "st", "st", "mm"], [null, null, null, null, null, null, null]], multiplier: 6 },
        { tiles: [["cr", "st", "st", "st", "st", "st", "st", "mm"], [null, null, null, null, null, null, null, null]], multiplier: 7 },
        { tiles: [[null, null, null, null], ["mm", "st", "st", "cr"], ["cr", "st", "st", "mm"], [null, null, null, null]], multiplier: 6 },
        { tiles: [[null, null, null, null, null], ["mm", "st", "st", "st", "cr"], ["cr", "st", "st", "st", "mm"], [null, null, null, null, null]], multiplier: 8 },
        { tiles: [[null, null, null, null, null, null], ["mm", "st", "st", "st", "st", "cr"], ["cr", "st", "st", "st", "st", "mm"], [null, null, null, null, null, null]], multiplier: 10 },
        { tiles: [[null, null, null, null, null, null, null], ["mm", "st", "st", "st", "st", "st", "cr"], ["cr", "st", "st", "st", "st", "st", "mm"], [null, null, null, null, null, null, null]], multiplier: 12 },
        { tiles: [[null, null, null, null, null, null, null, null], ["mm", "st", "st", "st", "st", "st", "st", "cr"], ["cr", "st", "st", "st", "st", "st", "st", "mm"], [null, null, null, null, null, null, null, null]], multiplier: 14 }
      ]
    }
    ]
  },
  {
    id: "military_supply",
    buildingIds: ["_military_supply"],
    stats: [{ name: "workers", type: "integer" }, { name: "storage", type: "custom" }],
    tileTypes: {
      ff: { availability: "ROOM_SOLID", sprite: "FENCE_COMBO" },
      ss: { availability: "ROOM_SOLID", canGoCandle: true, sprite: "TORCH_1X1" },
      cc: { availability: "ROOM_SOLID", data: 1 },
      aa: { availability: "ROOM_SOLID", data: 2 },
      oo: { mustBeReachable: true, availability: "ROOM", data: 3, sprite: "OVERLAY_1X1" },
      __: { availability: "ROOM" }
    },
    groups: [
    {
      min: 0,
      rotations: 3,
      items: [
        { tiles: [["ss", null, "oo", null, "oo", null, "ss"], ["ff", null, "aa", null, "aa", null, "ff"], ["ff", null, "cc", null, "cc", null, "ff"], ["ff", null, null, null, null, null, "ff"], ["ff", "ff", "ff", "ff", "ff", "ff", "ff"]], multiplier: 2 },
        { tiles: [["ss", null, "oo", null, "oo", null, "oo", null, "ss"], ["ff", null, "aa", null, "aa", null, "aa", null, "ff"], ["ff", null, "cc", null, "cc", null, "cc", null, "ff"], ["ff", null, null, null, null, null, null, null, "ff"], ["ff", "ff", "ff", "ff", "ff", "ff", "ff", "ff", "ff"]], multiplier: 3 },
        { tiles: [["ss", null, "oo", null, "oo", null, "oo", null, "oo", null, "ss"], ["ff", null, "aa", null, "aa", null, "aa", null, "aa", null, "ff"], ["ff", null, "cc", null, "cc", null, "cc", null, "cc", null, "ff"], ["ff", null, null, null, null, null, null, null, null, null, "ff"], ["ff", "ff", "ff", "ff", "ff", "ff", "ff", "ff", "ff", "ff", "ff"]], multiplier: 4 },
        { tiles: [["ss", null, "oo", null, "oo", null, "oo", null, "oo", null, "ss"], ["ff", null, "aa", null, "aa", null, "aa", null, "aa", null, "ff"], ["ff", null, "cc", null, "cc", null, "cc", null, "cc", null, "ff"], ["ff", null, "oo", null, "oo", null, "oo", null, "oo", null, "ff"], ["ff", null, "aa", null, "aa", null, "aa", null, "aa", null, "ff"], ["ff", null, "cc", null, "cc", null, "cc", null, "cc", null, "ff"], ["ff", null, null, null, null, null, null, null, null, null, "ff"], ["ff", "ff", "ff", "ff", "ff", "ff", "ff", "ff", "ff", "ff", "ff"]], multiplier: 8 }
      ]
    }
    ]
  },
  {
    id: "mine",
    buildingIds: ["mine_clay", "mine_clay_clay", "mine_coal", "mine_coal_coal", "mine_gem", "mine_gem_gem", "mine_ore", "mine_ore_ore", "mine_sithilon", "mine_sithilon_sithilon", "mine_stone", "mine_stone_stone"],
    usesArea: true,
    stats: [{ name: "workers", type: "custom" }, { name: "deposits", type: "custom" }, { name: "efficiency", type: "efficiency" }, { name: "output", type: "production" }],
    tileTypes: {
      ss: { mustBeReachable: true, availability: "ROOM_SOLID", data: 2, sprite: "SLAB_1X1" },
      sA: { mustBeReachable: true, availability: "ROOM_SOLID", data: 2, sprite: "STORAGE_1X1_TOP" },
      sm: { mustBeReachable: true, availability: "ROOM_SOLID", data: 2, sprite: "STORAGE_1X1_MID" },
      sc: { mustBeReachable: true, availability: "ROOM_SOLID", data: 2, sprite: "STORAGE_1X1_END" },
      co: { availability: "ROOM_SOLID", sprite: "CONVEYOR_1X1" },
      cc: { availability: "ROOM_SOLID", canGoCandle: true, sprite: "SLAB_1X1" },
      ms: { availability: "ROOM_SOLID", sprite: "AUX_1X1" },
      mA: { availability: "ROOM_SOLID", sprite: "AUX_MEDIUM_A_1X1" },
      mB: { availability: "ROOM_SOLID", sprite: "AUX_MEDIUM_B_1X1" },
      ml: { availability: "ROOM_SOLID", sprite: "AUX_BIG_2X2" },
      ww: { mustBeReachable: true, availability: "ROOM_SOLID", data: 1, sprite: "WORK_1X1" }
    },
    groups: [
    {
      min: 1,
      max: 1,
      rotations: 3,
      items: [
        { tiles: [["co", "ss", "cc"], ["co", "ss", "cc"]], multiplier: 6, multiplierStats: 2 },
        { tiles: [["co", "sA", "sc", "cc"], ["co", "sA", "sc", "cc"]], multiplier: 8, multiplierStats: 4 },
        { tiles: [["co", "sA", "sm", "sc", "cc"], ["co", "sA", "sm", "sc", "cc"]], multiplier: 10, multiplierStats: 6 },
        { tiles: [["co", "sA", "sm", "sm", "sc", "cc"], ["co", "sA", "sm", "sm", "sc", "cc"]], multiplier: 12, multiplierStats: 8 },
        { tiles: [["co", "sA", "sm", "sm", "sm", "sc", "cc"], ["co", "sA", "sm", "sm", "sm", "sc", "cc"]], multiplier: 14, multiplierStats: 10 },
        { tiles: [["co", "sA", "sm", "sm", "sm", "sm", "sc", "cc"], ["co", "sA", "sm", "sm", "sm", "sm", "sc", "cc"]], multiplier: 16, multiplierStats: 12 },
        { tiles: [["co", "sA", "sm", "sm", "sm", "sm", "sm", "sc", "cc"], ["co", "sA", "sm", "sm", "sm", "sm", "sm", "sc", "cc"]], multiplier: 18, multiplierStats: 14 },
        { tiles: [["co", "sA", "sm", "sm", "sm", "sm", "sm", "sm", "sc", "cc"], ["co", "sA", "sm", "sm", "sm", "sm", "sm", "sm", "sc", "cc"]], multiplier: 20, multiplierStats: 16 },
        { tiles: [["co", "sA", "sm", "sm", "sm", "sm", "sm", "sm", "sm", "sc", "cc"], ["co", "sA", "sm", "sm", "sm", "sm", "sm", "sm", "sm", "sc", "cc"]], multiplier: 22, multiplierStats: 18 },
        { tiles: [["co", "sA", "sm", "sm", "sm", "sm", "sm", "sm", "sm", "sm", "sc", "cc"], ["co", "sA", "sm", "sm", "sm", "sm", "sm", "sm", "sm", "sm", "sc", "cc"]], multiplier: 24, multiplierStats: 20 }
      ]
    },
    {
      min: 0,
      rotations: 3,
      items: [
        { tiles: [["ms"]], multiplier: 1 },
        { tiles: [["ms", "ww"]], multiplier: 2 },
        { tiles: [["ms", "ww", "cc"]], multiplier: 3 },
        { tiles: [["ms", "ww", "cc", "ms"]], multiplier: 4 },
        { tiles: [["ms", "ww"], ["cc", "ms"]], multiplier: 4 },
        { tiles: [["ms", "ww", "cc"], ["ww", "ms", "ms"]], multiplier: 6 },
        { tiles: [["ms", "ww", "cc", "ms"], ["ms", "mA", "mB", "ww"]], multiplier: 8 },
        { tiles: [["ww", "ml", "ml", "ww", "cc"], ["ww", "ml", "ml", "ww", "ms"]], multiplier: 10 },
        { tiles: [["ww", "ml", "ml", "mA", "ww", "cc"], ["ww", "ml", "ml", "mB", "ww", "ms"]], multiplier: 12 },
        { tiles: [["ww", "ml", "ml", "mA", "ww", "cc", "mA"], ["ww", "ml", "ml", "mB", "ww", "ms", "mB"]], multiplier: 14 }
      ]
    }
    ]
  },
  {
    id: "nursery",
    buildingIds: ["nursery_amevia", "nursery_amevia_consume_fish", "nursery_cretonian", "nursery_cretonian_consume_vegetable", "nursery_garthimi", "nursery_garthimi_consume_meat", "nursery_human", "nursery_human_consume_fruit", "nursery_tilapi", "nursery_tilapi_consume_fruit"],
    usesArea: true,
    mustBeIndoors: true,
    stats: [{ name: "beds", type: "integer" }, { name: "workers", type: "employeesRelative" }, { name: "coziness", type: "relative" }],
    tileTypes: {
      h1: { availability: "AVOID_PASS", sprite: "1x1_CRIB_TOP" },
      t1: { mustBeReachable: true, availability: "AVOID_PASS", data: 1, sprite: "1x1_CRIB_BOTTOM" },
      ta: { availability: "ROOM_SOLID", canGoCandle: true, sprite: "1x1_TABLE" },
      e2: { availability: "ROOM_SOLID", sprite: "2x2_DECOR" },
      e1: { availability: "ROOM_SOLID", sprite: "1x1_DECOR" },
      __: null
    },
    groups: [
    {
      min: 1,
      rotations: 3,
      items: [
        { tiles: [["ta", "h1"], [null, "t1"]], multiplier: 1 },
        { tiles: [["ta", "h1", "h1", "ta"], [null, "t1", "t1", null]], multiplier: 2 },
        { tiles: [["ta", "h1", "h1", "h1", "ta"], [null, "t1", "t1", "t1", null]], multiplier: 3 },
        { tiles: [["ta", "h1", "h1", "h1", "h1", "ta"], [null, "t1", "t1", "t1", "t1", null]], multiplier: 4 },
        { tiles: [["ta", "h1", "h1", "h1", "h1", "h1", "ta"], [null, "t1", "t1", "t1", "t1", "t1", null]], multiplier: 5 },
        { tiles: [["ta", "h1", "h1", "h1", "h1", "h1", "h1", "ta"], [null, "t1", "t1", "t1", "t1", "t1", "t1", null]], multiplier: 6 }
      ]
    },
    {
      min: 0,
      rotations: 3,
      items: [
        { tiles: [["e1"]], multiplier: 1 },
        { tiles: [["e2", "e2"], ["e2", "e2"]], multiplier: 4 }
      ]
    }
    ]
  },
  {
    id: "orchard",
    buildingIds: ["orchard_fruit", "orchard_fruit_fruit"],
    usesArea: true,
    stats: [{ name: "fertility", type: "custom" }, { name: "workers", type: "custom" }, { name: "irri", type: "irrigation" }, { name: "output", type: "production" }],
    tileTypes: {
      tt: { availability: "AVOID_PASS", data: 1, sprite: "TREE_2X2" },
      __: { availability: "ROOM", data: 3 }
    },
    groups: [
    {
      min: 0,
      rotations: 3,
      items: [
        { tiles: [[null, null, null, null], [null, "tt", "tt", null], [null, "tt", "tt", null], [null, null, null, null]], multiplier: 1 },
        { tiles: [[null, null, null, null], [null, "tt", "tt", null], [null, "tt", "tt", null], [null, null, null, null], [null, "tt", "tt", null], [null, "tt", "tt", null], [null, null, null, null]], multiplier: 2 },
        { tiles: [[null, null, null, null], [null, "tt", "tt", null], [null, "tt", "tt", null], [null, null, null, null], [null, "tt", "tt", null], [null, "tt", "tt", null], [null, null, null, null], [null, "tt", "tt", null], [null, "tt", "tt", null], [null, null, null, null]], multiplier: 3 },
        { tiles: [[null, null, null, null], [null, "tt", "tt", null], [null, "tt", "tt", null], [null, null, null, null], [null, "tt", "tt", null], [null, "tt", "tt", null], [null, null, null, null], [null, "tt", "tt", null], [null, "tt", "tt", null], [null, null, null, null], [null, "tt", "tt", null], [null, "tt", "tt", null], [null, null, null, null]], multiplier: 4 },
        { tiles: [[null, null, null, null], [null, "tt", "tt", null], [null, "tt", "tt", null], [null, null, null, null], [null, "tt", "tt", null], [null, "tt", "tt", null], [null, null, null, null], [null, "tt", "tt", null], [null, "tt", "tt", null], [null, null, null, null], [null, "tt", "tt", null], [null, "tt", "tt", null], [null, null, null, null], [null, "tt", "tt", null], [null, "tt", "tt", null], [null, null, null, null]], multiplier: 5 },
        { tiles: [[null, null, null, null], [null, "tt", "tt", null], [null, "tt", "tt", null], [null, null, null, null], [null, "tt", "tt", null], [null, "tt", "tt", null], [null, null, null, null], [null, "tt", "tt", null], [null, "tt", "tt", null], [null, null, null, null], [null, "tt", "tt", null], [null, "tt", "tt", null], [null, null, null, null], [null, "tt", "tt", null], [null, "tt", "tt", null], [null, null, null, null], [null, "tt", "tt", null], [null, "tt", "tt", null], [null, null, null, null]], multiplier: 6 },
        { tiles: [[null, null, null, null], [null, "tt", "tt", null], [null, "tt", "tt", null], [null, null, null, null], [null, "tt", "tt", null], [null, "tt", "tt", null], [null, null, null, null], [null, "tt", "tt", null], [null, "tt", "tt", null], [null, null, null, null], [null, "tt", "tt", null], [null, "tt", "tt", null], [null, null, null, null], [null, "tt", "tt", null], [null, "tt", "tt", null], [null, null, null, null], [null, "tt", "tt", null], [null, "tt", "tt", null], [null, null, null, null], [null, "tt", "tt", null], [null, "tt", "tt", null], [null, null, null, null]], multiplier: 7 },
        { tiles: [[null, null, null, null], [null, "tt", "tt", null], [null, "tt", "tt", null], [null, null, null, null], [null, "tt", "tt", null], [null, "tt", "tt", null], [null, null, null, null], [null, "tt", "tt", null], [null, "tt", "tt", null], [null, null, null, null], [null, "tt", "tt", null], [null, "tt", "tt", null], [null, null, null, null], [null, "tt", "tt", null], [null, "tt", "tt", null], [null, null, null, null], [null, "tt", "tt", null], [null, "tt", "tt", null], [null, null, null, null], [null, "tt", "tt", null], [null, "tt", "tt", null], [null, null, null, null], [null, "tt", "tt", null], [null, "tt", "tt", null], [null, null, null, null]], multiplier: 8 }
      ]
    }
    ]
  },
  {
    id: "pasture",
    buildingIds: ["pasture_aur", "pasture_aur_meat_leather_livestock", "pasture_balti", "pasture_balti_meat_livestock", "pasture_ent", "pasture_ent_meat_livestock", "pasture_globdien", "pasture_globdien_meat_egg_livestock", "pasture_onx", "pasture_onx_meat_cotton_livestock", "pasture_mount", "pasture_mount_weapon_mount"],
    usesArea: true,
    stats: [{ name: "workers", type: "custom" }, { name: "irri", type: "irrigation" }, { name: "efficiency", type: "efficiency" }, { name: "ferarea", type: "custom" }],
    tileTypes: {
      gl: { availability: "ROOM_SOLID", data: 5, sprite: "GATE_TOP_3X3" },
      gc: { availability: "ROOM" },
      du: { availability: "ROOM" },
      s1: { availability: "ROOM_SOLID", data: 1, sprite: "GATE_TOP_3X3" },
      s2: { availability: "ROOM_SOLID", data: 1, sprite: "GATE_TOP_3X3" },
      s3: { availability: "ROOM_SOLID", data: 1, sprite: "GATE_TOP_3X3" },
      m1: { availability: "ROOM", sprite: "AUX_EDGE_1X1" },
      m2: { availability: "ROOM", sprite: "AUX_MID_1X1" },
      ml: { availability: "ROOM", sprite: "AUX_BIG_2X2" }
    },
    groups: [
    {
      min: 1,
      max: 1,
      rotations: 3,
      items: [
        { tiles: [["gl", "gc", "gl"], ["du", "du", "du"], ["s1", "s2", "s3"]], multiplier: 1 }
      ]
    },
    {
      min: 0,
      rotations: 3,
      items: [
        { tiles: [["m1", "m1"]], multiplier: 2 },
        { tiles: [["m1", "m2", "m1"]], multiplier: 3 },
        { tiles: [["m1", "m2", "m2", "m1"]], multiplier: 4 },
        { tiles: [["ml", "ml"], ["ml", "ml"]], multiplier: 4 }
      ]
    }
    ]
  },
  {
    id: "physician",
    buildingIds: ["physician_normal"],
    usesArea: true,
    mustBeIndoors: true,
    stats: [{ name: "workers", type: "integer" }, { name: "services", type: "services" }, { name: "quality", type: "relative" }],
    tileTypes: {
      sh: { availability: "ROOM_SOLID", sprite: "SHELF_1X1" },
      ch: { availability: "ROOM_SOLID", sprite: "STORAGE_1X1" },
      ta: { availability: "ROOM_SOLID", canGoCandle: true, sprite: "TABLE_COMBO" },
      tt: { mustBeReachable: true, availability: "ROOM_SOLID", canGoCandle: true, sprite: "TABLE_COMBO" },
      b1: { mustBeReachable: true, availability: "NOT_ACCESSIBLE", data: 3, sprite: "BUNK_1X1_TOP" },
      b2: { availability: "NOT_ACCESSIBLE", sprite: "BUNK_1X1_BOTTOM" },
      ee: { mustBeReachable: true, availability: "ROOM" }
    },
    groups: [
    {
      min: 1,
      rotations: 3,
      items: [
        { tiles: [["ch"], ["b1"], ["b2"], ["ta"]], multiplier: 1 },
        { tiles: [["ch", "ch"], ["b1", "b1"], ["b2", "b2"], ["ta", "ta"]], multiplier: 2 },
        { tiles: [["b2", "b2"], ["b1", "b1"], ["ta", "ta"], ["b1", "b1"], ["b2", "b2"], ["ch", "ch"]], multiplier: 4 }
      ]
    },
    {
      min: 1,
      rotations: 3,
      items: [
        { tiles: [["tt"]], multiplier: 1 },
        { tiles: [["tt", "sh"]], multiplier: 2 },
        { tiles: [["tt", "sh", "sh"]], multiplier: 3 },
        { tiles: [["tt", "sh", "sh", "sh"]], multiplier: 4 },
        { tiles: [["sh", "tt", "sh", "sh", "sh"]], multiplier: 5 },
        { tiles: [["sh", "sh", "tt", "sh", "sh", "sh"]], multiplier: 6 },
        { tiles: [["sh", "sh", "sh", "tt", "sh", "sh", "sh"]], multiplier: 7 }
      ]
    }
    ]
  },
  {
    id: "pleasure",
    buildingIds: ["pleasure_normal"],
    usesArea: true,
    mustBeIndoors: true,
    stats: [{ name: "beds", type: "integer" }, { name: "coziness", type: "relative" }, { name: "workers", type: "integer" }],
    tileTypes: {
      b1: { availability: "ROOM_SOLID", data: 3, sprite: "BED_HEAD_1X1" },
      b2: { availability: "ROOM_SOLID", data: 3, sprite: "BED_TAIL_1X1" },
      ww: { availability: "ROOM", data: 2 },
      ta: { availability: "ROOM_SOLID", canGoCandle: true, data: 3, sprite: "TABLE_COMBO" },
      __: { mustBeReachable: true, availability: "ROOM", data: 1 },
      sh: { availability: "ROOM_SOLID", data: 3, sprite: "SHELF_1X1" },
      ch: { availability: "ROOM_SOLID", data: 3, sprite: "NICKNACK_1X1" },
      ns: { availability: "ROOM_SOLID", sprite: "SHELF_1X1" },
      nt: { availability: "ROOM_SOLID", canGoCandle: true, sprite: "TABLE_COMBO" },
      ni: { availability: "ROOM_SOLID", sprite: "NICKNACK_1X1" },
      _carpet_combo: { availability: "ROOM", sprite: "CARPET_COMBO" }
    },
    groups: [
    {
      min: 1,
      rotations: 3,
      items: [
        { tiles: [["b1", "ta", "ta"], ["b2", "ww", "sh"], ["sh", null, "ch"]], multiplier: 1 },
        { tiles: [["b1", "ta", "ta", "b1", "ta", "ta"], ["b2", "ww", "sh", "b2", "ww", "sh"], ["sh", null, "ch", "sh", null, "ch"]], multiplier: 2 },
        { tiles: [["b1", "ta", "ta", "b1", "ta", "ta", "b1", "ta", "ta"], ["b2", "ww", "sh", "b2", "ww", "sh", "b2", "ww", "sh"], ["sh", null, "ch", "sh", null, "ch", "sh", null, "ch"]], multiplier: 3 },
        { tiles: [["b1", "ta", "ta", "b1", "ta", "ta", "b1", "ta", "ta", "b1", "ta", "ta"], ["b2", "ww", "sh", "b2", "ww", "sh", "b2", "ww", "sh", "b2", "ww", "sh"], ["sh", null, "ch", "sh", null, "ch", "sh", null, "ch", "sh", null, "ch"]], multiplier: 4 }
      ]
    },
    {
      min: 0,
      rotations: 3,
      items: [
        { tiles: [["nt"]], multiplier: 1 },
        { tiles: [["nt", "ni"]], multiplier: 2 },
        { tiles: [["ni", "nt", "ni"]], multiplier: 3 },
        { tiles: [["ni", "nt", "nt", "ns"]], multiplier: 4 },
        { tiles: [["ni", "nt", "nt", "ni", "ns"]], multiplier: 5 },
        { tiles: [["ni", "nt", "nt", "ni", "ns", "ns"]], multiplier: 6 },
        { tiles: [["ni", "nt", "nt", "ni", "ns", "ns", "ns"]], multiplier: 7 },
        { tiles: [["ni", "nt", "nt", "ni", "ns", "ns", "ns", "ns"]], multiplier: 8 }
      ]
    },
    {
      min: 1,
      rotations: 0,
      items: [
        { tiles: [["_carpet_combo"]], multiplier: 1 },
        { tiles: [["_carpet_combo", "_carpet_combo"]], multiplier: 2 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 3 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 4 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 5 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 6 },
        { tiles: [["_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo"]], multiplier: 4 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 6 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 8 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 10 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 12 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 9 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 12 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 15 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 18 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 21 }
      ]
    }
    ]
  },
  {
    id: "prison",
    buildingIds: ["_prison"],
    usesArea: true,
    mustBeIndoors: true,
    stats: [{ name: "prisoners", type: "integer" }, { name: "guards", type: "integer" }],
    tileTypes: {
      c1: { availability: "ROOM", canGoCandle: true, sprite: "CANDLE_SHELF_1X1" },
      dd: { availability: "NOT_ACCESSIBLE" },
      ll: { availability: "NOT_ACCESSIBLE", data: 2 },
      ff: { availability: "NOT_ACCESSIBLE", data: 3 },
      cc: { availability: "ROOM" },
      ss: { mustBeReachable: true, availability: "ROOM", data: 1 },
      __: null
    },
    groups: [
    {
      min: 1,
      rotations: 3,
      items: [
        { tiles: [["dd", "dd", "dd", "dd", "dd"], ["dd", "cc", "cc", "cc", "dd"], ["ll", "ss", "ff", "dd", "dd"], [null, null, null, "c1", null]], multiplier: 1 }
      ]
    }
    ]
  },
  {
    id: "refiner",
    buildingIds: ["refiner_bakery", "refiner_bakery_bread_0", "refiner_bakery_bread_1", "refiner_brewery", "refiner_brewery_alco_beer", "refiner_brewery_alco_wine", "refiner_coaler", "refiner_coaler_coal", "refiner_smelter", "refiner_smelter_metal", "refiner_weaver", "refiner_weaver_fabric"],
    usesArea: true,
    mustBeIndoors: true,
    stats: [{ name: "workers", type: "employees" }, { name: "efficiency", type: "efficiency" }, { name: "output", type: "production" }],
    tileTypes: {
      me: { availability: "ROOM_SOLID", canGoCandle: true, sprite: "MAIN_MACHINE_COMBO" },
      mm: { availability: "ROOM_SOLID", sprite: "NICKNACK_BOTTOM_1X1" },
      ma: { availability: "ROOM_SOLID", sprite: "MACHINE_1X1" },
      ff: { mustBeReachable: true, availability: "ROOM_SOLID", data: 3, sprite: "STORAGE_IN_1X1" },
      ww: { mustBeReachable: true, availability: "ROOM_SOLID", data: 4, sprite: "WORK_1X1" },
      st: { availability: "ROOM_SOLID", sprite: "CONVEYOR_1X1" },
      sm: { mustBeReachable: true, availability: "ROOM_SOLID", data: 2, sprite: "STORAGE_1X1" },
      sb: { mustBeReachable: true, availability: "ROOM_SOLID", data: 2, sprite: "STORAGE_1X1" },
      se: { availability: "ROOM_SOLID", canGoCandle: true, sprite: "MAIN_MACHINE_COMBO" }
    },
    groups: [
    {
      min: 1,
      rotations: 3,
      items: [
        { tiles: [["mm", "me"], ["ww", "me"], ["ff", "me"], ["mm", "me"]], multiplier: 2 },
        { tiles: [["mm", "me"], ["ww", "me"], ["ff", "me"], ["ww", "me"], ["mm", "me"]], multiplier: 3 },
        { tiles: [["mm", "me"], ["ww", "me"], ["ff", "me"], ["ww", "me"], ["ww", "me"], ["ff", "me"], ["mm", "me"]], multiplier: 5 },
        { tiles: [["mm", "me"], ["ww", "me"], ["ff", "me"], ["ww", "me"], ["ww", "me"], ["ff", "me"], ["ww", "me"], ["mm", "me"]], multiplier: 6 },
        { tiles: [["mm", "me", "me", "mm"], ["ww", "me", "me", "ww"], ["ff", "me", "me", "ff"], ["mm", "me", "me", "mm"]], multiplier: 4 },
        { tiles: [["mm", "me", "me", "mm"], ["ww", "me", "me", "ww"], ["ff", "me", "me", "ff"], ["ww", "me", "me", "ww"], ["mm", "me", "me", "mm"]], multiplier: 6 },
        { tiles: [["mm", "me", "me", "mm"], ["ww", "me", "me", "ww"], ["ff", "me", "me", "ff"], ["ww", "me", "me", "ww"], ["ww", "me", "me", "ww"], ["ff", "me", "me", "ff"], ["mm", "me", "me", "mm"]], multiplier: 10 },
        { tiles: [["mm", "me", "me", "mm"], ["ww", "me", "me", "ww"], ["ff", "me", "me", "ff"], ["ww", "me", "me", "ww"], ["ww", "me", "me", "ww"], ["ff", "me", "me", "ff"], ["ww", "me", "me", "ww"], ["mm", "me", "me", "mm"]], multiplier: 12 }
      ]
    },
    {
      min: 1,
      max: 1,
      rotations: 3,
      items: [
        { tiles: [["st", "sm", "sb", "se"]], multiplier: 2 },
        { tiles: [["st", "sm", "sm", "sb", "se"]], multiplier: 3 },
        { tiles: [["st", "sm", "sm", "sm", "sb", "se"]], multiplier: 4 },
        { tiles: [["st", "sm", "sm", "sm", "sm", "sb", "se"]], multiplier: 5 },
        { tiles: [["st", "sm", "sm", "sm", "sm", "sm", "sb", "se"]], multiplier: 6 },
        { tiles: [["st", "sm", "sm", "sm", "sm", "sm", "sm", "sb", "se"]], multiplier: 7 },
        { tiles: [["st", "sm", "sb", "se"], ["st", "sm", "sb", "se"]], multiplier: 4 },
        { tiles: [["st", "sm", "sm", "sb", "se"], ["st", "sm", "sm", "sb", "se"]], multiplier: 6 },
        { tiles: [["st", "sm", "sm", "sm", "sb", "se"], ["st", "sm", "sm", "sm", "sb", "se"]], multiplier: 8 },
        { tiles: [["st", "sm", "sm", "sm", "sm", "sb", "se"], ["st", "sm", "sm", "sm", "sm", "sb", "se"]], multiplier: 10 },
        { tiles: [["st", "sm", "sm", "sm", "sm", "sm", "sb", "se"], ["st", "sm", "sm", "sm", "sm", "sm", "sb", "se"]], multiplier: 12 },
        { tiles: [["st", "sm", "sm", "sm", "sm", "sm", "sm", "sb", "se"], ["st", "sm", "sm", "sm", "sm", "sm", "sm", "sb", "se"]], multiplier: 14 }
      ]
    },
    {
      min: 0,
      rotations: 3,
      items: [
        { tiles: [["mm", "me", "ma"]], multiplier: 3 },
        { tiles: [["mm", "me", "me", "ma"]], multiplier: 4 },
        { tiles: [["me", "me", "me", "me"], ["ma", "mm", "ma", "mm"]], multiplier: 8 },
        { tiles: [["me", "me", "me", "me", "me"], ["mm", "ma", "mm", "ma", "mm"]], multiplier: 10 },
        { tiles: [["mm", "ma", "mm"], ["me", "me", "me"], ["me", "me", "me"], ["mm", "ma", "mm"]], multiplier: 12 }
      ]
    }
    ]
  },
  {
    id: "resthome",
    buildingIds: ["resthome_normal"],
    usesArea: true,
    mustBeIndoors: true,
    stats: [{ name: "stations", type: "integer" }, { name: "quality", type: "relative" }],
    tileTypes: {
      cc: { mustBeReachable: true, availability: "AVOID_PASS", data: 3, sprite: "CHAIR_1X1" },
      ch: { mustBeReachable: true, availability: "AVOID_PASS", sprite: "CHAIR_1X1" },
      ta: { availability: "ROOM_SOLID", data: 1, sprite: "TABLES_COMBO" },
      tt: { availability: "ROOM_SOLID", canGoCandle: true, sprite: "TABLES_COMBO" },
      tt2: { availability: "AVOID_LIKE_FUCK", data: 2, sprite: "STAGE_COMBO" },
      sh: { availability: "ROOM_SOLID", sprite: "SHELF_1X1" },
      ni: { availability: "ROOM_SOLID", sprite: "NICKNACK_1X1" },
      __: null,
      _carpet_combo: { availability: "ROOM", sprite: "CARPET_COMBO" }
    },
    groups: [
    {
      min: 1,
      rotations: 3,
      items: [
        { tiles: [["tt", "cc", "tt"]], multiplier: 1 },
        { tiles: [["tt", "cc", "cc", "tt"]], multiplier: 2 },
        { tiles: [["tt", "cc", "cc", "cc", "tt"]], multiplier: 3 },
        { tiles: [["tt", "cc", "cc", "cc", "cc", "tt"]], multiplier: 4 },
        { tiles: [["tt", "cc", "cc", "cc", "cc", "cc", "tt"]], multiplier: 5 },
        { tiles: [[null, "ch", null], ["tt", "ta", "tt"], ["tt", "ta", "tt"], [null, "ch", null]], multiplier: 6 },
        { tiles: [[null, "ch", "ch", null], ["tt", "ta", "ta", "tt"], ["tt", "ta", "ta", "tt"], [null, "ch", "ch", null]], multiplier: 10 },
        { tiles: [[null, "ch", "ch", "ch", null], ["tt", "ta", "ta", "ta", "tt"], ["tt", "ta", "ta", "ta", "tt"], [null, "ch", "ch", "ch", null]], multiplier: 14 },
        { tiles: [[null, "ch", "ch", "ch", "ch", null], ["tt", "ta", "ta", "ta", "ta", "tt"], ["tt", "ta", "ta", "ta", "ta", "tt"], [null, "ch", "ch", "ch", "ch", null]], multiplier: 18 },
        { tiles: [[null, "ch", "ch", "ch", "ch", "ch", null], ["tt", "ta", "ta", "ta", "ta", "ta", "tt"], ["tt", "ta", "ta", "ta", "ta", "ta", "tt"], [null, "ch", "ch", "ch", "ch", "ch", null]], multiplier: 22 }
      ]
    },
    {
      min: 1,
      rotations: 3,
      items: [
        { tiles: [["tt2", "tt2"], ["tt2", "tt2"]], multiplier: 4 },
        { tiles: [["tt2", "tt2", "tt2"], ["tt2", "tt2", "tt2"]], multiplier: 6 },
        { tiles: [["tt2", "tt2", "tt2"], ["tt2", "tt2", "tt2"], ["tt2", "tt2", "tt2"]], multiplier: 9 },
        { tiles: [["tt2", "tt2", "tt2", "tt2"], ["tt2", "tt2", "tt2", "tt2"], ["tt2", "tt2", "tt2", "tt2"], ["tt2", "tt2", "tt2", "tt2"]], multiplier: 16 }
      ]
    },
    {
      min: 0,
      rotations: 3,
      items: [
        { tiles: [["sh", "ta"]], multiplier: 1 },
        { tiles: [["sh", "ta", "ni"]], multiplier: 2 },
        { tiles: [["sh", "sh", "ta", "ni"]], multiplier: 3 },
        { tiles: [["ni", "sh", "sh", "ta", "ni"]], multiplier: 4 },
        { tiles: [["ni", "sh", "sh", "ta", "ni", "sh"]], multiplier: 5 },
        { tiles: [["ni", "sh", "sh", "ta", "ni", "sh", "sh"]], multiplier: 6 }
      ]
    },
    {
      min: 1,
      rotations: 0,
      items: [
        { tiles: [["_carpet_combo"]], multiplier: 1 },
        { tiles: [["_carpet_combo", "_carpet_combo"]], multiplier: 2 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 3 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 4 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 5 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 6 },
        { tiles: [["_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo"]], multiplier: 4 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 6 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 8 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 10 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 12 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 9 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 12 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 15 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 18 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 21 }
      ]
    }
    ]
  },
  {
    id: "school",
    buildingIds: ["school_normal", "school_normal_consume_paper"],
    usesArea: true,
    mustBeIndoors: true,
    stats: [{ name: "stations", type: "services" }, { name: "quality", type: "efficiency" }],
    tileTypes: {
      ss: { mustBeReachable: true, availability: "ROOM_SOLID", data: 2, sprite: "TABLE_1X1" },
      bb: { mustBeReachable: true, availability: "AVOID_PASS", data: 1, sprite: "STOOL_1X1" },
      sh: { availability: "ROOM_SOLID", sprite: "SHELF_1X1" },
      ta: { availability: "ROOM_SOLID", canGoCandle: true, sprite: "TABLE_1X1" },
      __: null,
      _carpet_combo: { availability: "ROOM", sprite: "CARPET_COMBO" }
    },
    groups: [
    {
      min: 1,
      rotations: 3,
      items: [
        { tiles: [["ta", "ss", "ta"], [null, "bb", null]], multiplier: 1 },
        { tiles: [["ta", "ss", "ss", "ta"], [null, "bb", "bb", null]], multiplier: 2 },
        { tiles: [["ta", "ss", "ss", "ss", "ta"], [null, "bb", "bb", "bb", null]], multiplier: 3 },
        { tiles: [["ta", "ss", "ss", "ss", "ss", "ta"], [null, "bb", "bb", "bb", "bb", null]], multiplier: 4 },
        { tiles: [["ta", "ss", "ss", "ss", "ss", "ta", "ss"], [null, "bb", "bb", "bb", "bb", null, "bb"]], multiplier: 5 },
        { tiles: [["ss", "ta", "ss", "ss", "ss", "ss", "ta", "ss"], ["bb", null, "bb", "bb", "bb", "bb", null, "bb"]], multiplier: 6 },
        { tiles: [["ss", "ta", "ss", "ss", "ss", "ss", "ta", "ss", "ss"], ["bb", null, "bb", "bb", "bb", "bb", null, "bb", "bb"]], multiplier: 7 },
        { tiles: [["ss", "ss", "ta", "ss", "ss", "ss", "ss", "ta", "ss", "ss"], ["bb", "bb", null, "bb", "bb", "bb", "bb", null, "bb", "bb"]], multiplier: 8 }
      ]
    },
    {
      min: 0,
      rotations: 3,
      items: [
        { tiles: [["ta"]], multiplier: 1 },
        { tiles: [["ta", "sh"]], multiplier: 2 },
        { tiles: [["ta", "sh", "sh"]], multiplier: 3 },
        { tiles: [["ta", "sh", "sh", "sh"]], multiplier: 4 },
        { tiles: [["ta", "sh", "sh", "sh", "sh"]], multiplier: 5 },
        { tiles: [["ta", "sh"], ["ta", "sh"]], multiplier: 4 },
        { tiles: [["ta", "sh", "sh"], ["ta", "sh", "sh"]], multiplier: 6 },
        { tiles: [["ta", "sh", "sh", "sh"], ["ta", "sh", "sh", "sh"]], multiplier: 8 },
        { tiles: [["ta", "sh", "sh", "sh", "sh"], ["ta", "sh", "sh", "sh", "sh"]], multiplier: 10 },
        { tiles: [["ta", "sh", "sh", "sh", "sh", "sh"], ["ta", "sh", "sh", "sh", "sh", "sh"]], multiplier: 12 }
      ]
    },
    {
      min: 1,
      rotations: 0,
      items: [
        { tiles: [["_carpet_combo"]], multiplier: 1 },
        { tiles: [["_carpet_combo", "_carpet_combo"]], multiplier: 2 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 3 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 4 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 5 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 6 },
        { tiles: [["_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo"]], multiplier: 4 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 6 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 8 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 10 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 12 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 9 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 12 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 15 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 18 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 21 }
      ]
    }
    ]
  },
  {
    id: "shrine",
    buildingIds: ["shrine_aminion", "shrine_athuri", "shrine_crator", "shrine_shmalor"],
    stats: [{ name: "services", type: "integer" }],
    tileTypes: {
      aa: { availability: "SOLID", sprite: "ALTAR_BOX" },
      __: { availability: "ROOM" },
      _x: { availability: "ROOM", sprite: "ALTAR_FLOOR_TEXTURE" },
      oo: { availability: "ROOM", sprite: "INNER_BOX" },
      tt: { availability: "SOLID", data: 2, sprite: "INNER_BOX" },
      xx: { availability: "ROOM" },
      c1: { availability: "SOLID", sprite: "ALTAR_FLOOR_TEXTURE" },
      c2: { availability: "SOLID", sprite: "ALTAR_FLOOR_TEXTURE" },
      tt2: { availability: "SOLID", data: 2, sprite: "INNER_BOX" },
      o2: { availability: "ROOM" },
      xx2: { availability: "ROOM" },
      cc: { availability: "SOLID", sprite: "EMBLEM_2X2" }
    },
    groups: [
    {
      min: 1,
      rotations: 3,
      items: [
        { tiles: [["_x", "_x", null, null, "_x", "_x"], ["oo", "oo", "oo", "oo", "oo", "oo"], ["oo", "xx", "aa", "aa", "xx", "oo"], ["oo", "tt", "c1", "c2", "tt", "oo"], ["oo", "xx", "aa", "aa", "xx", "oo"], ["oo", "oo", "oo", "oo", "oo", "oo"]], multiplier: 25.5, multiplierStats: 34 },
        { tiles: [["_x", "_x", null, null, "_x", "_x"], ["oo", "oo", "oo", "oo", "oo", "oo"], ["oo", "xx", "aa", "aa", "xx", "oo"], ["oo", "tt", "c1", "c2", "tt", "oo"], ["oo", "xx", "aa", "aa", "xx", "oo"], ["oo", "oo", "oo", "oo", "oo", "oo"], ["_x", "_x", null, null, "_x", "_x"]], multiplier: 28.5, multiplierStats: 38 },
        { tiles: [["_x", "_x", null, null, null, null, "_x", "_x"], ["_x", "oo", "oo", "oo", "oo", "oo", "oo", "_x"], [null, "oo", "xx", "aa", "aa", "xx", "oo", null], [null, "tt", "xx", "c1", "c2", "xx", "tt", null], [null, "oo", "xx", "aa", "aa", "xx", "oo", null], ["_x", "oo", "oo", "oo", "oo", "oo", "oo", "_x"], ["_x", "_x", null, null, null, null, "_x", "_x"]], multiplier: 31.5, multiplierStats: 42 },
        { tiles: [["_x", "_x", "_x", null, null, null, null, "_x", "_x", "_x"], ["_x", "oo", "oo", "oo", "oo", "oo", "oo", "oo", "oo", "_x"], ["_x", "oo", "xx2", "aa", "aa", "aa", "aa", "xx2", "oo", "_x"], [null, "oo", "xx2", "aa", "cc", "cc", "aa", "xx2", "oo", null], [null, "oo", "xx2", "aa", "cc", "cc", "aa", "xx2", "oo", null], ["_x", "oo", "xx2", "aa", "aa", "aa", "aa", "xx2", "oo", "_x"], ["_x", "tt2", "oo", "oo", "oo", "oo", "oo", "oo", "tt2", "_x"], ["_x", "_x", "_x", null, null, null, null, "_x", "_x", "_x"]], multiplier: 51, multiplierStats: 68 },
        { tiles: [["_x", "_x", "_x", "_x", null, null, null, null, "_x", "_x", "_x", "_x"], ["_x", "oo", "oo", "oo", "oo", "oo", "oo", "oo", "oo", "oo", "oo", "_x"], ["_x", "oo", "o2", "o2", "o2", "o2", "o2", "o2", "o2", "o2", "oo", "_x"], ["_x", "oo", "o2", "xx2", "aa", "aa", "aa", "aa", "xx2", "o2", "oo", "_x"], [null, "oo", "o2", "xx2", "aa", "cc", "cc", "aa", "xx2", "o2", "oo", null], [null, "oo", "o2", "xx2", "aa", "cc", "cc", "aa", "xx2", "o2", "oo", null], ["_x", "oo", "o2", "xx2", "aa", "aa", "aa", "aa", "xx2", "o2", "oo", "_x"], ["_x", "oo", "o2", "o2", "o2", "o2", "o2", "o2", "o2", "o2", "oo", "_x"], ["_x", "tt2", "oo", "oo", "oo", "oo", "oo", "oo", "oo", "oo", "tt2", "_x"], ["_x", "_x", "_x", "_x", null, null, null, null, "_x", "_x", "_x", "_x"]], multiplier: 81, multiplierStats: 108 }
      ]
    }
    ]
  },
  {
    id: "slaver",
    buildingIds: ["_slaver"],
    usesArea: true,
    mustBeIndoors: true,
    stats: [{ name: "prisoners", type: "integer" }],
    tileTypes: {
      tt: { availability: "ROOM_SOLID", canGoCandle: true, sprite: "TABLE_COMBO" },
      ss: { mustBeReachable: true, availability: "PENALTY4", data: 1, sprite: "BENCH_1X1" },
      sh: { availability: "PENALTY4", data: 2, sprite: "BENCH_1X1" }
    },
    groups: [
    {
      min: 0,
      rotations: 3,
      items: [
        { tiles: [["tt"], ["sh"], ["ss"]], multiplier: 1 },
        { tiles: [["tt", "tt"], ["sh", "sh"], ["ss", "ss"]], multiplier: 2 },
        { tiles: [["tt", "tt", "tt"], ["sh", "sh", "sh"], ["ss", "ss", "ss"]], multiplier: 3 },
        { tiles: [["tt", "tt", "tt", "tt"], ["sh", "sh", "sh", "sh"], ["ss", "ss", "ss", "ss"]], multiplier: 4 },
        { tiles: [["tt", "tt", "tt", "tt", "tt"], ["sh", "sh", "sh", "sh", "sh"], ["ss", "ss", "ss", "ss", "ss"]], multiplier: 5 }
      ]
    }
    ]
  },
  {
    id: "speaker",
    buildingIds: ["speaker_normal"],
    stats: [{ name: "workers", type: "employees" }, { name: "spectators", type: "services" }],
    tileTypes: {
      bb: { availability: "PENALTY4", sprite: "FRAME_COMBO" },
      b1: { availability: "ROOM", sprite: "FRAME_COMBO" }
    },
    groups: [
    {
      min: 1,
      rotations: 0,
      items: [
        { tiles: [["b1", "b1", "b1"], ["b1", "bb", "b1"], ["b1", "b1", "b1"]], multiplier: 1 }
      ]
    }
    ]
  },
  {
    id: "stage",
    buildingIds: ["stage_normal"],
    stats: [{ name: "workers", type: "integer" }, { name: "spectators", type: "services" }],
    tileTypes: {
      AA2: { availability: "PENALTY4", data: 1, sprite: "A_BOX" },
      aa: { availability: "ROOM", sprite: "A_BOX" },
      ai: { availability: "SOLID", canGoCandle: true, sprite: "A_BOX" },
      BB2: { availability: "PENALTY4", data: 1, sprite: "B_BOX" },
      bb: { availability: "ROOM", sprite: "B_BOX" },
      CC: { availability: "PENALTY4", data: 1, sprite: "C_BOX" },
      cc: { availability: "ROOM", sprite: "C_BOX" }
    },
    groups: [
    {
      min: 1,
      rotations: 1,
      items: [
        { tiles: [["ai", "aa", "aa", "aa", "aa", "aa", "aa", "aa", "ai"], ["aa", "bb", "bb", "bb", "bb", "bb", "bb", "bb", "aa"], ["aa", "bb", "cc", "cc", "cc", "cc", "cc", "bb", "aa"], ["aa", "bb", "cc", "CC", "CC", "CC", "cc", "bb", "aa"], ["aa", "bb", "cc", "CC", "cc", "CC", "cc", "bb", "aa"], ["aa", "bb", "cc", "CC", "CC", "CC", "cc", "bb", "aa"], ["aa", "bb", "cc", "cc", "cc", "cc", "cc", "bb", "aa"], ["aa", "bb", "bb", "bb", "bb", "bb", "bb", "bb", "aa"], ["ai", "aa", "aa", "aa", "aa", "aa", "aa", "aa", "ai"]], multiplier: 1 },
        { tiles: [["ai", "aa", "aa", "aa", "aa", "aa", "aa", "ai"], ["aa", "bb", "bb", "bb", "bb", "bb", "bb", "aa"], ["aa", "bb", "cc", "cc", "cc", "cc", "bb", "aa"], ["aa", "bb", "cc", "CC", "CC", "cc", "bb", "aa"], ["aa", "bb", "cc", "CC", "CC", "cc", "bb", "aa"], ["aa", "bb", "cc", "CC", "CC", "cc", "bb", "aa"], ["aa", "bb", "cc", "CC", "CC", "cc", "bb", "aa"], ["aa", "bb", "cc", "cc", "cc", "cc", "bb", "aa"], ["aa", "bb", "bb", "bb", "bb", "bb", "bb", "aa"], ["ai", "aa", "aa", "aa", "aa", "aa", "aa", "ai"]], multiplier: 1 },
        { tiles: [["ai", "aa", "aa", "aa", "aa", "aa", "ai"], ["aa", "bb", "bb", "bb", "bb", "bb", "aa"], ["aa", "bb", "cc", "cc", "cc", "bb", "aa"], ["aa", "bb", "cc", "CC", "cc", "bb", "aa"], ["aa", "bb", "cc", "CC", "cc", "bb", "aa"], ["aa", "bb", "cc", "CC", "cc", "bb", "aa"], ["aa", "bb", "cc", "CC", "cc", "bb", "aa"], ["aa", "bb", "cc", "CC", "cc", "bb", "aa"], ["aa", "bb", "cc", "CC", "cc", "bb", "aa"], ["aa", "bb", "cc", "CC", "cc", "bb", "aa"], ["aa", "bb", "cc", "CC", "cc", "bb", "aa"], ["aa", "bb", "cc", "cc", "cc", "bb", "aa"], ["aa", "bb", "bb", "bb", "bb", "bb", "aa"], ["ai", "aa", "aa", "aa", "aa", "aa", "ai"]], multiplier: 1 }
      ]
    }
    ]
  },
  {
    id: "station",
    buildingIds: ["_station"],
    tileTypes: {
      pp: { availability: "ROOM_SOLID", canGoCandle: true, data: 8, sprite: "TORCH_1X1" },
      dd: { availability: "ROOM_SOLID", canGoCandle: true, data: 8, sprite: "TORCH_1X1" },
      st: { availability: "ROOM_SOLID", data: 3, sprite: "CRATE_BOTTOM_1X1" },
      ww: { availability: "ROOM_SOLID", data: 1, sprite: "WORK_1X1" },
      __: { availability: "ROOM" },
      an: { availability: "ROOM_SOLID", data: 4, sprite: "ROOF_MID_1X1" },
      ae: { availability: "ROOM_SOLID", data: 4, sprite: "ROOF_EDGE_1X1" },
      af: { availability: "ROOM_SOLID", data: 5, sprite: "ANIMAL_TOP_1X1" },
      in: { availability: "ROOM", data: 1 }
    },
    groups: [
    {
      min: 0,
      rotations: 3,
      items: [
        { tiles: [[null, null, null, null, null, null, null], [null, "in", "af", "af", "af", "in", null], [null, "ae", "an", "an", "an", "ae", null], [null, "st", null, "ww", "pp", "ww", null], [null, "st", null, "ww", "in", "ww", null], [null, "st", null, "ww", "in", "ww", null], [null, "st", null, "ww", "in", "ww", null], [null, "st", null, "ww", "in", "ww", null], [null, "st", null, "ww", "in", "ww", null], [null, "st", null, "ww", "in", "ww", null], [null, "st", null, "ww", "in", "ww", null], [null, null, null, null, null, null, null]], multiplier: 1 },
        { tiles: [[null, null, null, null, null, null, null, null], [null, "in", "af", "af", "af", "af", "in", null], [null, "ae", "an", "an", "an", "an", "ae", null], [null, "st", "st", null, "ww", "pp", "ww", null], [null, "st", "st", null, "ww", "in", "ww", null], [null, "st", "st", null, "ww", "in", "ww", null], [null, "st", "st", null, "ww", "in", "ww", null], [null, "st", "st", null, "ww", "in", "ww", null], [null, "st", "st", null, "ww", "in", "ww", null], [null, "st", "st", null, "ww", "in", "ww", null], [null, "st", "st", null, "ww", "in", "ww", null], [null, null, null, null, null, null, null, null]], multiplier: 1.15 },
        { tiles: [[null, null, null, null, null, null, null, null, null, null, null], [null, "in", "af", "af", "af", "af", "af", "af", "af", "in", null], [null, "ae", "an", "an", "an", "an", "an", "an", "an", "ae", null], [null, "st", "st", null, "ww", "pp", "ww", null, "st", "st", null], [null, "st", "st", null, "ww", "in", "ww", null, "st", "st", null], [null, "st", "st", null, "ww", "in", "ww", null, "st", "st", null], [null, "st", "st", null, "ww", "in", "ww", null, "st", "st", null], [null, "st", "st", null, "ww", "in", "ww", null, "st", "st", null], [null, "st", "st", null, "ww", "in", "ww", null, "st", "st", null], [null, "st", "st", null, "ww", "in", "ww", null, "st", "st", null], [null, "st", "st", null, "ww", "in", "ww", null, "st", "st", null], [null, null, null, null, null, null, null, null, null, null, null]], multiplier: 1.6 }
      ]
    }
    ]
  },
  {
    id: "stockade",
    buildingIds: ["_stockade"],
    usesArea: true,
    stats: [{ name: "workers", type: "custom" }, { name: "prisoners", type: "custom" }],
    tileTypes: {
      oo: { availability: "ROOM" }
    },
    groups: [
    {
      min: 1,
      rotations: 3,
      items: [
        { tiles: [["oo", "oo", "oo"]], multiplier: 1 }
      ]
    }
    ]
  },
  {
    id: "stockpile",
    buildingIds: ["_stockpile"],
    usesArea: true,
    mustBeIndoors: true,
    stats: [{ name: "storage", type: "custom" }],
    tileTypes: {
      cr: { mustBeReachable: true, availability: "ROOM_SOLID", sprite: "CRATE_BOTTOM_1X1" },
      mm: { availability: "ROOM_SOLID", canGoCandle: true, sprite: "MISC_1X1" }
    },
    groups: [
    {
      min: 1,
      rotations: 3,
      items: [
        { tiles: [["cr", "mm"]], multiplier: 2, multiplierStats: 1 },
        { tiles: [["cr", "cr", "mm"]], multiplier: 3, multiplierStats: 2 },
        { tiles: [["cr", "cr", "cr", "mm"]], multiplier: 4, multiplierStats: 3 },
        { tiles: [["cr", "cr", "cr", "cr", "mm"]], multiplier: 5, multiplierStats: 4 },
        { tiles: [["cr", "cr", "cr", "cr", "cr", "mm"]], multiplier: 6, multiplierStats: 5 },
        { tiles: [["cr", "cr", "cr", "cr", "cr", "cr", "mm"]], multiplier: 7, multiplierStats: 6 },
        { tiles: [["cr", "cr"], ["mm", "mm"]], multiplier: 4, multiplierStats: 2 },
        { tiles: [["cr", "cr"], ["cr", "cr"], ["mm", "mm"]], multiplier: 6, multiplierStats: 4 },
        { tiles: [["cr", "cr"], ["cr", "cr"], ["cr", "cr"], ["mm", "mm"]], multiplier: 8, multiplierStats: 6 },
        { tiles: [["cr", "cr"], ["cr", "cr"], ["cr", "cr"], ["cr", "cr"], ["mm", "mm"]], multiplier: 10, multiplierStats: 8 },
        { tiles: [["cr", "cr"], ["cr", "cr"], ["cr", "cr"], ["cr", "cr"], ["cr", "cr"], ["mm", "mm"]], multiplier: 12, multiplierStats: 10 },
        { tiles: [["cr", "cr"], ["cr", "cr"], ["cr", "cr"], ["cr", "cr"], ["cr", "cr"], ["cr", "cr"], ["mm", "mm"]], multiplier: 14, multiplierStats: 12 }
      ]
    }
    ]
  },
  {
    id: "stocks",
    buildingIds: ["_stocks"],
    tileTypes: {
      ss: { availability: "AVOID_LIKE_FUCK", sprite: "BOX" },
      tt: { availability: "ROOM", sprite: "BOX" }
    },
    groups: [
    {
      min: 0,
      rotations: 3,
      items: [
        { tiles: [["tt", "tt", "tt"], ["tt", "ss", "tt"], ["tt", "tt", "tt"]], multiplier: 1 },
        { tiles: [["tt", "tt", "tt"], ["tt", "ss", "tt"], ["tt", "ss", "tt"], ["tt", "tt", "tt"]], multiplier: 2 },
        { tiles: [["tt", "tt", "tt"], ["tt", "ss", "tt"], ["tt", "ss", "tt"], ["tt", "ss", "tt"], ["tt", "tt", "tt"]], multiplier: 3 },
        { tiles: [["tt", "tt", "tt"], ["tt", "ss", "tt"], ["tt", "ss", "tt"], ["tt", "ss", "tt"], ["tt", "ss", "tt"], ["tt", "tt", "tt"]], multiplier: 4 },
        { tiles: [["tt", "tt", "tt"], ["tt", "ss", "tt"], ["tt", "ss", "tt"], ["tt", "ss", "tt"], ["tt", "ss", "tt"], ["tt", "ss", "tt"], ["tt", "tt", "tt"]], multiplier: 5 }
      ]
    }
    ]
  },
  {
    id: "tavern",
    buildingIds: ["tavern_normal"],
    usesArea: true,
    mustBeIndoors: true,
    stats: [{ name: "tables", type: "services" }, { name: "coziness", type: "relative" }],
    tileTypes: {
      pl: { availability: "ROOM_SOLID", sprite: "TABLE_COMBO" },
      st: { mustBeReachable: true, availability: "ROOM_SOLID", canGoCandle: true, sprite: "STORAGE_1X1" },
      ch: { mustBeReachable: true, availability: "AVOID_PASS", sprite: "CHAIR_1X1" },
      mm: { availability: "ROOM_SOLID", sprite: "MISC_1X1" },
      nn: { availability: "ROOM_SOLID", canGoCandle: true, sprite: "TABLE_COMBO" },
      sm: { availability: "ROOM_SOLID", canGoCandle: true, sprite: "STORAGE_1X1" },
      __: null,
      _carpet_combo: { availability: "ROOM", sprite: "CARPET_COMBO" }
    },
    groups: [
    {
      min: 0,
      rotations: 3,
      items: [
        { tiles: [["st", "pl", "st"], [null, "ch", null]], multiplier: 1 },
        { tiles: [["st", "pl", "pl", "st"], [null, "ch", "ch", null]], multiplier: 2 },
        { tiles: [["st", "pl", "pl", "pl", "st"], [null, "ch", "ch", "ch", null]], multiplier: 3 },
        { tiles: [["st", "pl", "pl", "pl", "pl", "st"], [null, "ch", "ch", "ch", "ch", null]], multiplier: 4 },
        { tiles: [["st", "pl", "pl", "pl", "pl", "pl", "st"], [null, "ch", "ch", "ch", "ch", "ch", null]], multiplier: 5 },
        { tiles: [["st", "pl", "pl", "pl", "pl", "pl", "pl", "st"], [null, "ch", "ch", "ch", "ch", "ch", "ch", null]], multiplier: 6 },
        { tiles: [["st", "pl", "pl", "pl", "pl", "pl", "pl", "pl", "st"], [null, "ch", "ch", "ch", "ch", "ch", "ch", "ch", null]], multiplier: 7 },
        { tiles: [["st", "pl", "pl", "pl", "pl", "pl", "pl", "pl", "pl", "st"], [null, "ch", "ch", "ch", "ch", "ch", "ch", "ch", "ch", null]], multiplier: 8 },
        { tiles: [[null, "ch", null], ["st", "pl", "st"], ["st", "pl", "st"], [null, "ch", null]], multiplier: 2 },
        { tiles: [[null, "ch", "ch", null], ["st", "pl", "pl", "st"], ["st", "pl", "pl", "st"], [null, "ch", "ch", null]], multiplier: 4 },
        { tiles: [[null, "ch", "ch", "ch", null], ["st", "pl", "pl", "pl", "st"], ["st", "pl", "pl", "pl", "st"], [null, "ch", "ch", "ch", null]], multiplier: 6 },
        { tiles: [[null, "ch", "ch", "ch", "ch", null], ["st", "pl", "pl", "pl", "pl", "st"], ["st", "pl", "pl", "pl", "pl", "st"], [null, "ch", "ch", "ch", "ch", null]], multiplier: 8 },
        { tiles: [[null, "ch", "ch", "ch", "ch", "ch", null], ["st", "pl", "pl", "pl", "pl", "pl", "st"], ["st", "pl", "pl", "pl", "pl", "pl", "st"], [null, "ch", "ch", "ch", "ch", "ch", null]], multiplier: 10 },
        { tiles: [[null, "ch", "ch", "ch", "ch", "ch", "ch", null], ["st", "pl", "pl", "pl", "pl", "pl", "pl", "st"], ["st", "pl", "pl", "pl", "pl", "pl", "pl", "st"], [null, "ch", "ch", "ch", "ch", "ch", "ch", null]], multiplier: 12 },
        { tiles: [[null, "ch", "ch", "ch", "ch", "ch", "ch", "ch", null], ["st", "pl", "pl", "pl", "pl", "pl", "pl", "pl", "st"], ["st", "pl", "pl", "pl", "pl", "pl", "pl", "pl", "st"], [null, "ch", "ch", "ch", "ch", "ch", "ch", "ch", null]], multiplier: 14 },
        { tiles: [[null, "ch", "ch", "ch", "ch", "ch", "ch", "ch", "ch", null], ["st", "pl", "pl", "pl", "pl", "pl", "pl", "pl", "pl", "st"], ["st", "pl", "pl", "pl", "pl", "pl", "pl", "pl", "pl", "st"], [null, "ch", "ch", "ch", "ch", "ch", "ch", "ch", "ch", null]], multiplier: 16 }
      ]
    },
    {
      min: 0,
      rotations: 3,
      items: [
        { tiles: [["nn"]], multiplier: 1 },
        { tiles: [["sm", "nn"]], multiplier: 2 },
        { tiles: [["mm", "st", "nn"]], multiplier: 3 },
        { tiles: [["mm", "sm", "nn", "mm"]], multiplier: 4 },
        { tiles: [["mm", "mm", "sm", "nn", "nn"]], multiplier: 5 },
        { tiles: [["mm", "mm", "sm", "nn", "nn", "st"]], multiplier: 6 },
        { tiles: [["mm", "mm", "sm", "nn", "nn", "sm", "mm"]], multiplier: 7 },
        { tiles: [["sm", "mm"], ["sm", "nn"]], multiplier: 4 },
        { tiles: [["mm", "sm", "mm"], ["mm", "sm", "nn"]], multiplier: 6 },
        { tiles: [["mm", "sm", "mm", "mm"], ["mm", "sm", "nn", "nn"]], multiplier: 8 },
        { tiles: [["mm", "mm", "sm", "mm", "mm"], ["mm", "mm", "sm", "nn", "nn"]], multiplier: 10 },
        { tiles: [["mm", "mm", "sm", "mm", "mm", "sm"], ["mm", "mm", "sm", "nn", "nn", "sm"]], multiplier: 12 },
        { tiles: [["mm", "mm", "sm", "mm", "mm", "sm", "mm"], ["mm", "mm", "sm", "nn", "nn", "sm", "mm"]], multiplier: 14 }
      ]
    },
    {
      min: 1,
      rotations: 0,
      items: [
        { tiles: [["_carpet_combo"]], multiplier: 1 },
        { tiles: [["_carpet_combo", "_carpet_combo"]], multiplier: 2 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 3 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 4 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 5 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 6 },
        { tiles: [["_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo"]], multiplier: 4 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 6 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 8 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 10 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 12 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 9 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 12 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 15 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 18 },
        { tiles: [["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"], ["_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo", "_carpet_combo"]], multiplier: 21 }
      ]
    }
    ]
  },
  {
    id: "temple",
    buildingIds: ["temple_aminion", "temple_athuri", "temple_crator", "temple_shmalor"],
    usesArea: true,
    mustBeIndoors: true,
    stats: [{ name: "priests", type: "employees" }, { name: "worshippers", type: "services" }, { name: "decor", type: "relative" }, { name: "grandure", type: "custom" }, { name: "space", type: "custom" }],
    tileTypes: {
      wo: { availability: "ROOM", sprite: "PEDISTAL_BOX" },
      __: { availability: "ROOM", sprite: "PEDISTAL_BOX" },
      es: { availability: "AVOID_LIKE_FUCK", sprite: "ALTAR_BOX" },
      eb: { availability: "ROOM", sprite: "EMBLEM_2X2" },
      al: { availability: "AVOID_LIKE_FUCK", sprite: "ALTAR_BOX" },
      ap: { availability: "AVOID_LIKE_FUCK", sprite: "ALTAR_BOX" },
      b0: { availability: "ROOM_SOLID", sprite: "NICHE_A_1X1" },
      b1: { availability: "ROOM_SOLID", sprite: "NICHE_B_1X1" },
      b2: { availability: "ROOM_SOLID", sprite: "NICHE_C_1X1" },
      b3: { availability: "ROOM_SOLID", sprite: "NICHE_D_1X1" },
      ca: { availability: "ROOM_SOLID", canGoCandle: true, sprite: "PEDISTAL_BOX" },
      sA: { availability: "ROOM_SOLID", sprite: "COFFIN_A_1X1" },
      sB: { availability: "ROOM_SOLID", sprite: "COFFIN_A_1X1" },
      sC: { availability: "ROOM_SOLID", sprite: "COFFIN_A_1X1" },
      cs: { availability: "ROOM_SOLID", canGoCandle: true, sprite: "TORCH_1X1" },
      _floor_path: { availability: "ROOM" }
    },
    groups: [
    {
      min: 0,
      rotations: 3,
      items: [
        { tiles: [[null, "wo", "wo", null, "wo", "wo", null], [null, null, "al", "ap", "al", null, null], ["wo", "ca", "al", "es", "al", "ca", "wo"], [null, null, "al", "ap", "al", null, null], [null, "wo", "wo", null, "wo", "wo", null]], multiplier: 1 },
        { tiles: [["wo", "wo", "wo", null, "wo", null, "wo", "wo", "wo"], ["wo", null, "al", "ap", "al", "ap", "al", null, "wo"], [null, "ca", "al", "es", "al", "es", "al", "ca", null], ["wo", null, "al", "ap", "al", "ap", "al", null, "wo"], ["wo", "wo", "wo", null, "wo", null, "wo", "wo", "wo"]], multiplier: 1.8 },
        { tiles: [["wo", "wo", "wo", null, "wo", null, "wo", null, "wo", "wo", "wo"], ["wo", null, "al", "ap", "al", "ap", "al", "ap", "al", null, "wo"], ["wo", "ca", "al", "es", "al", "es", "al", "es", "al", "ca", "wo"], ["wo", null, "al", "ap", "al", "ap", "al", "ap", "al", null, "wo"], ["wo", "wo", "wo", null, "wo", null, "wo", null, "wo", "wo", "wo"]], multiplier: 2.2 }
      ]
    },
    {
      min: 0,
      rotations: 3,
      items: [
        { tiles: [["sB", "sC"]], multiplier: 2 },
        { tiles: [["sB", "sA", "sC"]], multiplier: 3 },
        { tiles: [["sB", "sA", "sA", "sC"]], multiplier: 4 },
        { tiles: [["b3", "b1", "b0", "b1", "b3"]], multiplier: 5 },
        { tiles: [["b3", "b1", "b2", "b0", "b1", "b2", "b3"]], multiplier: 7 },
        { tiles: [["b3", "b1", "b2", "b1", "b0", "b1", "b2", "b1", "b3"]], multiplier: 9 },
        { tiles: [["b3", "b1", "b2", "b1", "b1", "b0", "b1", "b1", "b2", "b1", "b3"]], multiplier: 11 }
      ]
    },
    {
      min: 0,
      rotations: 3,
      items: [
        { tiles: [["cs"]], multiplier: 1 }
      ]
    },
    {
      min: 0,
      rotations: 3,
      items: [
        { tiles: [["eb", "eb"], ["eb", "eb"]], multiplier: 1 }
      ]
    },
    {
      min: 1,
      rotations: 0,
      items: [
        { tiles: [["_floor_path"]], multiplier: 1 },
        { tiles: [["_floor_path", "_floor_path"]], multiplier: 2 },
        { tiles: [["_floor_path", "_floor_path", "_floor_path"]], multiplier: 3 },
        { tiles: [["_floor_path", "_floor_path", "_floor_path", "_floor_path"]], multiplier: 4 },
        { tiles: [["_floor_path", "_floor_path", "_floor_path", "_floor_path", "_floor_path"]], multiplier: 5 },
        { tiles: [["_floor_path", "_floor_path", "_floor_path", "_floor_path", "_floor_path", "_floor_path"]], multiplier: 6 },
        { tiles: [["_floor_path", "_floor_path"], ["_floor_path", "_floor_path"]], multiplier: 4 },
        { tiles: [["_floor_path", "_floor_path", "_floor_path"], ["_floor_path", "_floor_path", "_floor_path"]], multiplier: 6 },
        { tiles: [["_floor_path", "_floor_path", "_floor_path", "_floor_path"], ["_floor_path", "_floor_path", "_floor_path", "_floor_path"]], multiplier: 8 },
        { tiles: [["_floor_path", "_floor_path", "_floor_path", "_floor_path", "_floor_path"], ["_floor_path", "_floor_path", "_floor_path", "_floor_path", "_floor_path"]], multiplier: 10 },
        { tiles: [["_floor_path", "_floor_path", "_floor_path", "_floor_path", "_floor_path", "_floor_path"], ["_floor_path", "_floor_path", "_floor_path", "_floor_path", "_floor_path", "_floor_path"]], multiplier: 12 },
        { tiles: [["_floor_path", "_floor_path", "_floor_path"], ["_floor_path", "_floor_path", "_floor_path"], ["_floor_path", "_floor_path", "_floor_path"]], multiplier: 9 },
        { tiles: [["_floor_path", "_floor_path", "_floor_path", "_floor_path"], ["_floor_path", "_floor_path", "_floor_path", "_floor_path"], ["_floor_path", "_floor_path", "_floor_path", "_floor_path"]], multiplier: 12 },
        { tiles: [["_floor_path", "_floor_path", "_floor_path", "_floor_path", "_floor_path"], ["_floor_path", "_floor_path", "_floor_path", "_floor_path", "_floor_path"], ["_floor_path", "_floor_path", "_floor_path", "_floor_path", "_floor_path"]], multiplier: 15 },
        { tiles: [["_floor_path", "_floor_path", "_floor_path", "_floor_path", "_floor_path", "_floor_path"], ["_floor_path", "_floor_path", "_floor_path", "_floor_path", "_floor_path", "_floor_path"], ["_floor_path", "_floor_path", "_floor_path", "_floor_path", "_floor_path", "_floor_path"]], multiplier: 18 },
        { tiles: [["_floor_path", "_floor_path", "_floor_path", "_floor_path", "_floor_path", "_floor_path", "_floor_path"], ["_floor_path", "_floor_path", "_floor_path", "_floor_path", "_floor_path", "_floor_path", "_floor_path"], ["_floor_path", "_floor_path", "_floor_path", "_floor_path", "_floor_path", "_floor_path", "_floor_path"]], multiplier: 21 }
      ]
    }
    ]
  },
  {
    id: "tomb",
    buildingIds: ["tomb_normal"],
    usesArea: true,
    mustBeIndoors: true,
    stats: [{ name: "workers", type: "employees" }, { name: "services", type: "integer" }, { name: "respekk", type: "custom" }],
    tileTypes: {
      ss: { availability: "SOLID", sprite: "MONUMENT_1x1" },
      sm: { availability: "SOLID", sprite: "MONUMENT_2x2" },
      sl: { availability: "SOLID", sprite: "MONUMENT_3x3" },
      h1: { availability: "SOLID", sprite: "HEAD_BOTTOM_1X1" },
      t1: { mustBeReachable: true, availability: "SOLID", data: 1, sprite: "TAIL_BOTTOM_1X1" },
      st: { availability: "SOLID", canGoCandle: true, sprite: "STONE_1X1" },
      __: { availability: "ROOM" }
    },
    groups: [
    {
      min: 1,
      rotations: 3,
      items: [
        { tiles: [["st", "h1", "st"], [null, "t1", null]], multiplier: 1 },
        { tiles: [["st", "h1", "h1", "st"], [null, "t1", "t1", null]], multiplier: 2 },
        { tiles: [["st", "h1", "h1", "st", "h1", "st"], [null, "t1", "t1", null, "t1", null]], multiplier: 3 },
        { tiles: [["st", "h1", "h1", "st", "h1", "h1", "st"], [null, "t1", "t1", null, "t1", "t1", "st"]], multiplier: 4 },
        { tiles: [["st", "h1", "h1", "st", "h1", "h1", "st", "h1", "st"], [null, "t1", "t1", null, "t1", "t1", null, "t1", null]], multiplier: 5 },
        { tiles: [["st", "h1", "h1", "st", "h1", "h1", "st", "h1", "h1", "st"], [null, "t1", "t1", null, "t1", "t1", null, "t1", "t1", null]], multiplier: 6 }
      ]
    },
    {
      min: 0,
      rotations: 3,
      items: [
        { tiles: [["ss"]], multiplier: 1 },
        { tiles: [["sm", "sm"], ["sm", "sm"]], multiplier: 4 },
        { tiles: [["sl", "sl", "sl"], ["sl", "sl", "sl"], ["sl", "sl", "sl"]], multiplier: 9 }
      ]
    }
    ]
  },
  {
    id: "transport",
    buildingIds: ["_transport"],
    stats: [{ name: "crates", type: "custom" }],
    tileTypes: {
      pp: { availability: "ROOM_SOLID", canGoCandle: true, sprite: "TORCH_1X1" },
      mm: { availability: "ROOM", sprite: "GROUND_THING_1X1" },
      ww: { availability: "ROOM_SOLID" },
      xx: { availability: "ROOM_SOLID", data: 1 },
      __: { availability: "ROOM" },
      an: { availability: "ROOM_SOLID", data: 1 },
      c0: { availability: "ROOM_SOLID", data: 1 },
      c1: { availability: "ROOM_SOLID", data: 2 },
      c2: { availability: "ROOM_SOLID", data: 3 },
      c3: { availability: "ROOM_SOLID", data: 4 }
    },
    groups: [
    {
      min: 0,
      rotations: 3,
      items: [
        { tiles: [["pp", null, null, null, "pp"], [null, null, null, null, null], ["mm", "ww", "an", "ww", "mm"], ["mm", "ww", "c0", "ww", "mm"], [null, "ww", "xx", "ww", null], ["mm", "ww", "c1", "ww", "mm"], ["mm", "ww", "c2", "ww", "mm"], [null, "ww", "xx", "ww", null], ["mm", "ww", "c3", "ww", "mm"], ["mm", "ww", "ww", "ww", "mm"], [null, null, null, null, null], ["pp", null, null, null, "pp"]], multiplier: 1 }
      ]
    }
    ]
  },
  {
    id: "university",
    buildingIds: ["university_normal"],
    usesArea: true,
    mustBeIndoors: true,
    stats: [{ name: "students", type: "integer" }, { name: "quality", type: "efficiency" }],
    tileTypes: {
      po: { availability: "AVOID_PASS", sprite: "PODIUM_COMBO" },
      pc: { availability: "AVOID_PASS", data: 2, sprite: "PODIUM_COMBO" },
      bb: { mustBeReachable: true, availability: "AVOID_PASS", data: 1, sprite: "BENCH_1X1" },
      sh: { availability: "ROOM_SOLID", sprite: "SHELF_1X1" },
      ca: { availability: "ROOM_SOLID", canGoCandle: true, sprite: "CARPET_COMBO" },
      cc: { availability: "ROOM", sprite: "CARPET_COMBO" },
      __: null
    },
    groups: [
    {
      min: 1,
      rotations: 3,
      items: [
        { tiles: [["bb", "po", "pc", "po", "bb"], ["ca", "bb", "bb", "bb", "ca"]], multiplier: 6 },
        { tiles: [["bb", "po", "pc", "po", "bb"], ["bb", "po", "po", "po", "bb"], ["cc", "bb", "bb", "bb", "cc"], ["ca", "bb", "cc", "bb", "ca"]], multiplier: 9 },
        { tiles: [["bb", "po", "po", "pc", "po", "po", "bb"], ["bb", "po", "po", "po", "po", "po", "bb"], ["cc", "bb", "bb", "cc", "bb", "bb", "cc"], ["ca", "bb", "bb", "cc", "bb", "bb", "ca"]], multiplier: 13 },
        { tiles: [["bb", "bb", "po", "po", "po", "po", "po", "bb", "bb"], ["cc", "cc", "po", "po", "pc", "po", "po", "cc", "cc"], ["bb", "bb", "po", "po", "po", "po", "po", "bb", "bb"], ["cc", "cc", "bb", "bb", "cc", "bb", "bb", "cc", "cc"], ["ca", "cc", "bb", "bb", "cc", "bb", "bb", "cc", "ca"], [null, null, "bb", "bb", "cc", "bb", "bb", null, null]], multiplier: 21 }
      ]
    },
    {
      min: 0,
      rotations: 3,
      items: [
        { tiles: [["ca"]], multiplier: 1 },
        { tiles: [["ca", "sh"]], multiplier: 2 },
        { tiles: [["ca", "sh", "sh"]], multiplier: 3 },
        { tiles: [["ca", "sh", "sh", "sh"]], multiplier: 4 },
        { tiles: [["ca", "sh", "sh", "sh", "sh"]], multiplier: 5 },
        { tiles: [["ca", "sh"], ["ca", "sh"]], multiplier: 4 },
        { tiles: [["ca", "sh", "sh"], ["ca", "sh", "sh"]], multiplier: 6 },
        { tiles: [["ca", "sh", "sh", "sh"], ["ca", "sh", "sh", "sh"]], multiplier: 8 },
        { tiles: [["ca", "sh", "sh", "sh", "sh"], ["ca", "sh", "sh", "sh", "sh"]], multiplier: 10 },
        { tiles: [["ca", "sh", "sh", "sh", "sh", "sh"], ["ca", "sh", "sh", "sh", "sh", "sh"]], multiplier: 12 }
      ]
    }
    ]
  },
  {
    id: "waterpump",
    buildingIds: ["_waterpump"],
    stats: [{ name: "workers", type: "employees" }],
    tileTypes: {
      w1: { availability: "SOLID", data: 4 },
      w2: { availability: "SOLID", data: 5 },
      w3: { availability: "SOLID", data: 6 },
      ou: { availability: "SOLID" },
      pi: { availability: "SOLID", sprite: "PIPE_1X1" },
      in: { availability: "SOLID", sprite: "PIPE_1X1" },
      bo: { availability: "SOLID", sprite: "FRAME_COMBO" },
      b1: { availability: "SOLID" },
      b2: { availability: "SOLID" },
      b3: { availability: "SOLID" },
      oo: { availability: "SOLID" },
      mm: { availability: "SOLID", sprite: "MISC_1X1" },
      __: { availability: "ROOM" }
    },
    groups: [
    {
      min: 1,
      rotations: 3,
      items: [
        { tiles: [[null, "mm", "pi", "ou", "pi", "mm", null], [null, "w2", "oo", "oo", "oo", "w2", null], [null, "w1", "oo", "oo", "oo", "w1", null], [null, "w3", "b1", "b2", "b3", "w3", null], [null, "mm", "in", "in", "in", "mm", null]], multiplier: 1 },
        { tiles: [[null, "mm", "pi", "ou", "pi", "mm", null], [null, "w2", "bo", "bo", "bo", "w2", null], [null, "w1", "bo", "bo", "bo", "w1", null], [null, "w3", "oo", "oo", "oo", "w3", null], [null, "w2", "oo", "oo", "oo", "w2", null], [null, "w1", "oo", "oo", "oo", "w1", null], [null, "w3", "b1", "b2", "b3", "w3", null], [null, "mm", "in", "in", "in", "mm", null]], multiplier: 2 },
        { tiles: [[null, "mm", "pi", "ou", "pi", null, null], [null, "w2", "bo", "bo", "bo", "w2", null], [null, "w1", "b1", "b2", "b3", "w1", null], [null, "w3", "bo", "bo", "bo", "w3", null], [null, "w2", "oo", "oo", "oo", "w2", null], [null, "w1", "oo", "oo", "oo", "w1", null], [null, "w3", "oo", "oo", "oo", "w3", null], [null, "w2", "oo", "oo", "oo", "w2", null], [null, "w1", "oo", "oo", "oo", "w1", null], [null, "w3", "b1", "b2", "b3", "w3", null], [null, "mm", "in", "in", "in", "mm", null]], multiplier: 3 },
        { tiles: [[null, "mm", "pi", "ou", "pi", "mm", null], [null, "w2", "bo", "bo", "bo", "w2", null], [null, "w1", "b1", "b2", "b3", "w1", null], [null, "w3", "bo", "bo", "bo", "w3", null], [null, "w2", "oo", "oo", "oo", "w2", null], [null, "w1", "oo", "oo", "oo", "w1", null], [null, "w3", "oo", "oo", "oo", "w3", null], [null, "w2", "oo", "oo", "oo", "w2", null], [null, "w1", "oo", "oo", "oo", "w1", null], [null, "w3", "oo", "oo", "oo", "w3", null], [null, "w2", "bo", "bo", "bo", "w2", null], [null, "w1", "b1", "b2", "b3", "w1", null], [null, "w3", "bo", "bo", "bo", "w3", null], [null, "mm", "in", "in", "in", "mm", null]], multiplier: 4 }
      ]
    }
    ]
  },
  {
    id: "well",
    buildingIds: ["well_normal"],
    stats: [{ name: "services", type: "integer" }],
    tileTypes: {
      ww: { availability: "SOLID", sprite: "STONE_RING_COMBO" },
      ss: { availability: "ROOM", data: 1, sprite: "BUCKET_1X1" },
      __: { availability: "ROOM" }
    },
    groups: [
    {
      min: 1,
      rotations: 1,
      items: [
        { tiles: [[null, "ss", null], ["ss", "ww", "ss"], [null, "ss", null]], multiplier: 3, multiplierStats: 1 },
        { tiles: [[null, "ss", "ss", null], ["ss", "ww", "ww", "ss"], ["ss", "ww", "ww", "ss"], [null, "ss", "ss", null]], multiplier: 5, multiplierStats: 2 },
        { tiles: [[null, "ss", "ss", "ss", null], ["ss", "ww", "ww", "ww", "ss"], ["ss", "ww", "ww", "ww", "ss"], ["ss", "ww", "ww", "ww", "ss"], [null, "ss", "ss", "ss", null]], multiplier: 6, multiplierStats: 3 }
      ]
    }
    ]
  },
  {
    id: "woodcutter",
    buildingIds: ["_woodcutter"],
    usesArea: true,
    mustBeOutdoors: true,
    stats: [{ name: "workers", type: "custom" }, { name: "efficiency", type: "efficiency" }, { name: "irri", type: "irrigation" }, { name: "output", type: "production" }],
    tileTypes: {
      ss: { mustBeReachable: true, availability: "ROOM_SOLID", data: 2, sprite: "SLAB_1X1" },
      sA: { mustBeReachable: true, availability: "ROOM_SOLID", data: 2, sprite: "STORAGE_1X1_TOP" },
      sm: { mustBeReachable: true, availability: "ROOM_SOLID", data: 2, sprite: "STORAGE_1X1_MID" },
      sc: { mustBeReachable: true, availability: "ROOM_SOLID", data: 2, sprite: "STORAGE_1X1_END" },
      cc: { availability: "ROOM_SOLID", canGoCandle: true, sprite: "SLAB_1X1" },
      ms: { availability: "ROOM_SOLID", sprite: "AUX_1X1" },
      mA: { availability: "ROOM_SOLID", sprite: "AUX_MEDIUM_A_1X1" },
      mB: { availability: "ROOM_SOLID", sprite: "AUX_MEDIUM_B_1X1" },
      ml: { availability: "ROOM_SOLID", sprite: "AUX_BIG_2X2" },
      ww: { mustBeReachable: true, availability: "ROOM_SOLID", data: 1, sprite: "WORK_1X1" }
    },
    groups: [
    {
      min: 1,
      max: 1,
      rotations: 3,
      items: [
        { tiles: [["ss", "cc"], ["ss", "cc"]], multiplier: 6, multiplierStats: 2 },
        { tiles: [["sA", "sc", "cc"], ["sA", "sc", "cc"]], multiplier: 8, multiplierStats: 4 },
        { tiles: [["sA", "sm", "sc", "cc"], ["sA", "sm", "sc", "cc"]], multiplier: 10, multiplierStats: 6 },
        { tiles: [["sA", "sm", "sm", "sc", "cc"], ["sA", "sm", "sm", "sc", "cc"]], multiplier: 12, multiplierStats: 8 },
        { tiles: [["sA", "sm", "sm", "sm", "sc", "cc"], ["sA", "sm", "sm", "sm", "sc", "cc"]], multiplier: 14, multiplierStats: 10 },
        { tiles: [["sA", "sm", "sm", "sm", "sm", "sc", "cc"], ["sA", "sm", "sm", "sm", "sm", "sc", "cc"]], multiplier: 16, multiplierStats: 12 },
        { tiles: [["sA", "sm", "sm", "sm", "sm", "sm", "sc", "cc"], ["sA", "sm", "sm", "sm", "sm", "sm", "sc", "cc"]], multiplier: 18, multiplierStats: 14 },
        { tiles: [["sA", "sm", "sm", "sm", "sm", "sm", "sm", "sc", "cc"], ["sA", "sm", "sm", "sm", "sm", "sm", "sm", "sc", "cc"]], multiplier: 20, multiplierStats: 16 },
        { tiles: [["sA", "sm", "sm", "sm", "sm", "sm", "sm", "sm", "sc", "cc"], ["sA", "sm", "sm", "sm", "sm", "sm", "sm", "sm", "sc", "cc"]], multiplier: 22, multiplierStats: 18 },
        { tiles: [["sA", "sm", "sm", "sm", "sm", "sm", "sm", "sm", "sm", "sc", "cc"], ["sA", "sm", "sm", "sm", "sm", "sm", "sm", "sm", "sm", "sc", "cc"]], multiplier: 24, multiplierStats: 20 }
      ]
    },
    {
      min: 0,
      rotations: 3,
      items: [
        { tiles: [["ms"]], multiplier: 1 },
        { tiles: [["ms", "ww"]], multiplier: 2 },
        { tiles: [["ms", "ww", "cc"]], multiplier: 3 },
        { tiles: [["ms", "ww", "cc", "ms"]], multiplier: 4 },
        { tiles: [["ms", "ww"], ["cc", "ms"]], multiplier: 4 },
        { tiles: [["ms", "ww", "cc"], ["ww", "ms", "ms"]], multiplier: 6 },
        { tiles: [["ms", "ww", "cc", "ms"], ["ms", "mA", "mB", "ww"]], multiplier: 8 },
        { tiles: [["ww", "ml", "ml", "ww", "cc"], ["ww", "ml", "ml", "ww", "ms"]], multiplier: 10 },
        { tiles: [["ww", "ml", "ml", "mA", "ww", "cc"], ["ww", "ml", "ml", "mB", "ww", "ms"]], multiplier: 12 },
        { tiles: [["ww", "ml", "ml", "mA", "ww", "cc", "mA"], ["ww", "ml", "ml", "mB", "ww", "ms", "mB"]], multiplier: 14 }
      ]
    }
    ]
  },
  {
    id: "workshop",
    buildingIds: ["workshop_bowyer", "workshop_bowyer_bow", "workshop_carpenter", "workshop_carpenter_furniture", "workshop_carpenter_weapon_spear_1", "workshop_carpenter_weapon_spear_2", "workshop_carpenter_weapon_hammer", "workshop_carpenter_weapon_shield", "workshop_jewelry", "workshop_jewelry_jewelry", "workshop_mason", "workshop_mason_stone_cut", "workshop_mechanic", "workshop_mechanic_machinery", "workshop_paper", "workshop_paper_paper", "workshop_pottery", "workshop_pottery_pottery", "workshop_ration", "workshop_ration_ration_0", "workshop_ration_ration_1", "workshop_ration_ration_2", "workshop_ration_ration_3", "workshop_ration_ration_4", "workshop_ration_ration_5", "workshop_smithy", "workshop_smithy_tool", "workshop_smithy_armour_plate", "workshop_smithy_weapon_short", "workshop_smithy_weapon_slash", "workshop_smithy_weapon_hammer", "workshop_tailor", "workshop_tailor_clothes_0", "workshop_tailor_clothes_1", "workshop_tailor_armour_leather"],
    usesArea: true,
    mustBeIndoors: true,
    stats: [{ name: "workers", type: "employees" }, { name: "efficiency", type: "efficiency" }, { name: "output", type: "production" }],
    tileTypes: {
      ff: { mustBeReachable: true, availability: "ROOM_SOLID", data: 3, sprite: "TABLE_COMBO" },
      ww: { availability: "ROOM_SOLID", data: 4, sprite: "TABLE_COMBO" },
      cc: { availability: "ROOM_SOLID", canGoCandle: true, sprite: "TABLE_COMBO" },
      mm: { availability: "ROOM_SOLID", sprite: "MISC_BELOW_1X1" },
      ss: { mustBeReachable: true, availability: "AVOID_PASS", sprite: "CHAIR_1X1" },
      s1: { availability: "ROOM_SOLID", canGoCandle: true, sprite: "TABLE_COMBO" },
      s2: { mustBeReachable: true, availability: "ROOM_SOLID", data: 2, sprite: "TABLE_COMBO" },
      __: null
    },
    groups: [
    {
      min: 1,
      max: 1,
      rotations: 3,
      items: [
        { tiles: [["s1", "s2"]], multiplier: 2 },
        { tiles: [["s1", "s2", "s2"]], multiplier: 3 },
        { tiles: [["s1", "s2", "s2", "s2"]], multiplier: 4 },
        { tiles: [["s1", "s2", "s2", "s2", "s2"]], multiplier: 5 },
        { tiles: [["s1", "s2", "s2", "s2", "s2", "s2"]], multiplier: 6 },
        { tiles: [["s1", "s2", "s2", "s2", "s2", "s2", "s2"]], multiplier: 7 },
        { tiles: [["s1", "s2", "s2", "s2", "s2", "s2", "s2", "s2"]], multiplier: 8 },
        { tiles: [["s1", "s2", "s2", "s2", "s2", "s2", "s2", "s2", "s2"]], multiplier: 9 },
        { tiles: [["s1", "s2", "s2", "s2", "s2", "s2", "s2", "s2", "s2", "s2"]], multiplier: 10 },
        { tiles: [["s1", "s2"], ["s1", "s2"]], multiplier: 4 },
        { tiles: [["s1", "s2", "s2"], ["s1", "s2", "s2"]], multiplier: 6 },
        { tiles: [["s1", "s2", "s2", "s2"], ["s1", "s2", "s2", "s2"]], multiplier: 8 },
        { tiles: [["s1", "s2", "s2", "s2", "s2"], ["s1", "s2", "s2", "s2", "s2"]], multiplier: 10 },
        { tiles: [["s1", "s2", "s2", "s2", "s2", "s2"], ["s1", "s2", "s2", "s2", "s2", "s2"]], multiplier: 12 },
        { tiles: [["s1", "s2", "s2", "s2", "s2", "s2", "s2"], ["s1", "s2", "s2", "s2", "s2", "s2", "s2"]], multiplier: 14 },
        { tiles: [["s1", "s2", "s2", "s2", "s2", "s2", "s2", "s2"], ["s1", "s2", "s2", "s2", "s2", "s2", "s2", "s2"]], multiplier: 16 },
        { tiles: [["s1", "s2", "s2", "s2", "s2", "s2", "s2", "s2", "s2"], ["s1", "s2", "s2", "s2", "s2", "s2", "s2", "s2", "s2"]], multiplier: 18 },
        { tiles: [["s1", "s2", "s2", "s2", "s2", "s2", "s2", "s2", "s2", "s2"], ["s1", "s2", "s2", "s2", "s2", "s2", "s2", "s2", "s2", "s2"]], multiplier: 20 }
      ]
    },
    {
      min: 1,
      rotations: 3,
      items: [
        { tiles: [["ff", "ww", "cc"], [null, "ss", "mm"]], multiplier: 2 },
        { tiles: [["ww", "ff", "ww", "cc"], ["ss", null, "ss", "mm"]], multiplier: 3 },
        { tiles: [["ww", "ff", "ww", "cc", "ww", "ff"], ["ss", null, "ss", "mm", "ss", null]], multiplier: 5 },
        { tiles: [["ww", "ff", "ww", "cc", "ww", "ff", "ww"], ["ss", null, "ss", "mm", "ss", null, "ss"]], multiplier: 6 },
        { tiles: [["ww", "ff", "ww", "cc", "ww", "ff", "ww", "cc", "ww", "ff"], ["ss", null, "ss", "mm", "ss", null, "ss", "mm", "ss", null]], multiplier: 8 },
        { tiles: [["ww", "ff", "ww", "cc", "ww", "ff", "ww", "cc", "ww", "ff", "ww"], ["ss", null, "ss", "mm", "ss", null, "ss", "mm", "ss", null, "ss"]], multiplier: 9 },
        { tiles: [["ww", "ff", "ww", "cc", "ww", "ff", "ww", "cc", "ww", "ff", "ww", "cc", "ww", "ff"], ["ss", null, "ss", "mm", "ss", null, "ss", "mm", "ss", null, "ss", "mm", "ss", null]], multiplier: 11 },
        { tiles: [["ww", "ff", "ww", "cc", "ww", "ff", "ww", "cc", "ww", "ff", "ww", "cc", "ww", "ff", "ww"], ["ss", null, "ss", "mm", "ss", null, "ss", "mm", "ss", null, "ss", "mm", "ss", null, "ss"]], multiplier: 12 },
        { tiles: [["mm", "cc", "cc", "mm"], ["ss", "ww", "ww", "ss"], [null, "ff", "ff", null]], multiplier: 4 },
        { tiles: [["mm", "cc", "cc", "mm"], ["ss", "ww", "ww", "ss"], [null, "ff", "ff", null], ["ss", "ww", "ww", "ss"]], multiplier: 6 },
        { tiles: [["mm", "cc", "cc", "mm"], ["ss", "ww", "ww", "ss"], [null, "ff", "ff", null], ["ss", "ww", "ww", "ss"], ["mm", "cc", "cc", "mm"], ["ss", "ww", "ww", "ss"], [null, "ff", "ff", null]], multiplier: 10 },
        { tiles: [["mm", "cc", "cc", "mm"], ["ss", "ww", "ww", "ss"], [null, "ff", "ff", null], ["ss", "ww", "ww", "ss"], ["mm", "cc", "cc", "mm"], ["ss", "ww", "ww", "ss"], [null, "ff", "ff", null], ["ss", "ww", "ww", "ss"]], multiplier: 12 },
        { tiles: [["mm", "cc", "cc", "mm"], ["ss", "ww", "ww", "ss"], [null, "ff", "ff", null], ["ss", "ww", "ww", "ss"], ["mm", "cc", "cc", "mm"], ["ss", "ww", "ww", "ss"], [null, "ff", "ff", null], ["ss", "ww", "ww", "ss"], ["mm", "cc", "cc", "mm"], ["ss", "ww", "ww", "ss"], [null, "ff", "ff", null]], multiplier: 14 },
        { tiles: [["mm", "cc", "cc", "mm"], ["ss", "ww", "ww", "ss"], [null, "ff", "ff", null], ["ss", "ww", "ww", "ss"], ["mm", "cc", "cc", "mm"], ["ss", "ww", "ww", "ss"], [null, "ff", "ff", null], ["ss", "ww", "ww", "ss"], ["mm", "cc", "cc", "mm"], ["ss", "ww", "ww", "ss"], [null, "ff", "ff", null], ["ss", "ww", "ww", "ss"]], multiplier: 16 }
      ]
    },
    {
      min: 0,
      rotations: 3,
      items: [
        { tiles: [["cc"]], multiplier: 1 },
        { tiles: [["cc", "mm"]], multiplier: 2 },
        { tiles: [["mm", "cc", "mm"]], multiplier: 3 },
        { tiles: [["mm", "cc", "mm", "mm"]], multiplier: 4 },
        { tiles: [["mm", "cc", "mm", "cc", "mm"]], multiplier: 5 },
        { tiles: [["mm", "cc", "mm", "mm", "cc", "mm"]], multiplier: 6 },
        { tiles: [["cc", "cc"], ["mm", "mm"]], multiplier: 4 },
        { tiles: [["mm", "mm"], ["cc", "cc"], ["mm", "mm"]], multiplier: 6 },
        { tiles: [["mm", "mm"], ["cc", "cc"], ["cc", "cc"], ["mm", "mm"]], multiplier: 8 },
        { tiles: [["mm", "mm"], ["mm", "mm"], ["cc", "cc"], ["cc", "cc"], ["mm", "mm"]], multiplier: 10 },
        { tiles: [["mm", "mm"], ["mm", "mm"], ["cc", "cc"], ["cc", "cc"], ["mm", "mm"], ["mm", "mm"]], multiplier: 12 }
      ]
    }
    ]
  },
];
