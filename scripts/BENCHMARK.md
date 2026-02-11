# Optimizer Benchmark

Semi-manual regression tests for `display/optimizer.js`. The optimizer is deterministic (seeded PRNG), so the same input always produces the same output - but code changes can shift results.

## Tools

**`run-optimizer.js`** - `node scripts/run-optimizer.js <save-string-or-URL> [--decode]`
- Runs optimizer, outputs save string to stdout (progress on stderr)
- `--decode` also runs `decode-plan.js` on the result

**`decode-plan.js`** - `node scripts/decode-plan.js <save-string-or-URL> [--verbose]`
- Prints header, ASCII grid, and stat totals
- `--verbose` adds placements table, group info, and tile type details

## Test Cases

### 1. Bakery - 20x15
Full rectangle, employees stat.
- Starter: `http://localhost:8080/#planner/AuMrSk3LzEstik9KzE4tqhThZ2Bg__-v_v9zPAQDCAAA`
- Best: **47 workers** - `http://localhost:8080/#planner/AQ5yZWZpbmVyX2Jha2VyeRQPAAAH__5__-f__n__5__-e_3n735__-f__n__5__-f__n__4AAAATAgEACAUAAQIBBQIBAA0KAAMDAQgAAwAGEQACAwgJAAMDCQEAAQELCwECAQEEAAMBDAIAAwEECAIAAQsBAgAADQ4CAAABEAIBAAYKAgAABw0CAQAHCAADAgEBAgIBAhECAAMABw`
- Runtime: **2.5s**

### 2. Carpenter - 20x15
Full rectangle, employees stat.
- Starter: `http://localhost:8080/#planner/AhMqzy_KLs7IL4hPTiwqSM0rSS0S4WdgYP__r_7_czwEAwgAAA`
- Best: **59 workers, 1 door** - `http://localhost:8080/#planner/ARJ3b3Jrc2hvcF9jYXJwZW50ZXIUDwAAB__-f__n__5__-f__nv95-9-f__n__5__-f__n__5__-AAAAHwEAAAoOAQMAAQkCAAAECAECAgQEAgABCQsCAQAHDQIAAAcLAgIACQ4CAAAKAQIHAQEGAgAACwECAQEGDwECAgkHAQMDAQEBAgIHAwECAgQLAQAACgMCAAAEBAIDAA0PAQMCDAEBAgEHEQIBAAgBAAABBwkBAgIMCAECAQERAgAADQ4BAAABAwIAAAYEAgAABAsCAAAJAQICAAYLAQAQ`
- Runtime: **10.5s**

### 3. Hunter - 20x15
Full rectangle, employees stat.
- Starter: `http://localhost:8080/#planner/AuPNKM0rSS2Kz8svyk3MEeFnYGD__6_-_3M8BAMIAAA`
- Best: **29 workers, 1 door** - `http://localhost:8080/#planner/AQ1odW50ZXJfbm9ybWFsFA8AAAf__n__5__-f__n__57_efvfn__5__-f__n__5__-f__gAAADUBAAAHEgEAAAUOAQIBARIBAgABBAABAQgMAAAAAw0BAAABCAAAAQsBAQAADQsAAQELBgEAAA0FAQAAAwcBAgEEEgAAAQsSAQAADREBAAANCAEAAAIEAQQABAQBBgABDwEAAA0OAAEBCwkBAAAHAQABAQsPAAABCBIBAAAGEAEAAA0CAAABCAEBAAACBQAAAQMQAQEDBg0BBAAFBAEIAAEKAQAABQ0AAQELAwEAAAcGAAEBCA8AAAMEAwECAAYGAAABCAkBAQEFAQEAAAEJAAAABgoAAQEIAwEBAAUKAQMDAQEAAQEIBgABAQsMAQAAAwgAAAADCgEAAAUMAAABCAoBAAAGBAEFAAECAQAH`
- Runtime: **3.3s**

### 4. Lavatory - 12x12 semi-round
Non-rectangular room. Primary stat: services (latrines).
- Starter: `http://localhost:8080/#planner/AuPPSSxLLMkvqozPyy_KTczh4WFg-CDf_Kf--T8gsj_4g58BCAA`
- Best: **20 latrines** - `http://localhost:8080/#planner/AQ9sYXZhdG9yeV9ub3JtYWwMDAAA4A-A-B_j_j_j_j-A-A8AAAYBAgAKBAABAwUCAAEBBAkABQEDBQEEAAEFAAUBBgUFAAQJCQEIAgMBAw`
- Runtime: **2.5s**

### 5. Lavatory - 15x15
Known optimum from discord: 56. Starter: `http://localhost:8080/#planner/AuPPSSxLLMkvqozPyy_KTczh52dg-P_z_-f_z_-f_z__v_2_-j9wbgMDEAAA`
- Best: **56 latrines** - `http://localhost:8080/#planner/AQ9sYXZhdG9yeV9ub3JtYWwPDwAA__n_8__n_8__n18_fn_8__n_8__n_8__gAAABwAIAQgGAAkBBwIACAEHCgAIAQEKAAUAAgYBBwACAQEFAAUCCAABDgkEAA4FBg4ACQoAAA0`
- Runtime: **2.3s**

### 6. Smithy - 40x40
Stress test. Regular pillar grid (spacing 5) for structural stability, tiling constructive strategy.
- Starter: `http://localhost:8080/#planner/AuMvzy_KLs7IL4gvzs0syajU0GAAgfr_____G7IEAwQAAA`
- Best: **324 employees, 100% efficiency, 0 unsupported tiles** (was 334/95%/457 unsupported)
- Runtime: **~147s**
