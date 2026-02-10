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
- Runtime: **3.4s**

### 2. Carpenter - 20x15
Full rectangle, employees stat.
- Starter: `http://localhost:8080/#planner/AhMqzy_KLs7IL4hPTiwqSM0rSS0S4WdgYP__r_7_czwEAwgAAA`
- Best: **57 workers, 1 door** - `http://localhost:8080/#planner/ARJ3b3Jrc2hvcF9jYXJwZW50ZXIUDwAAB__-f__n__5__-f__nv95-9-f__n__5__-f__n__5__-AAAAIgIAAAMQAQICBAQCAAAGDwECAQERAgAABgQCAQAGCwIAAAQLAQICBwMCAwABAwIAAAsPAgEAAgUBAgABCgIAAAcOAgAAAgQBAgIMCAEBAwkOAgEBAQkCAQANEQICAA0OAQMCDAECAAAHDwIGAAEHAQICCQcCAAAEBAICAQgCAgAACQsBAgIECwEAAAkDAQMDAQECAwEIAQIAAAQIAQIBBxEAAAIHCgIBAQYNAQAQ`
- Runtime: **6.9s**

### 3. Hunter - 20x15
Full rectangle, employees stat.
- Starter: `http://localhost:8080/#planner/AuPNKM0rSS2Kz8svyk3MEeFnYGD__6_-_3M8BAMIAAA`
- Best: **29 workers, 1 door** - `http://localhost:8080/#planner/AQ1odW50ZXJfbm9ybWFsFA8AAAf__n__5__-f__n__57_efvfn__5__-f__n__5__-f__gAAADEBAAAHEgABAQgDAQAADQsBAAAGBAEAAAEIAQEBBQEAAAEIEgAAAQsBAAEBCwMAAQELBgEAAQcGAAEBCwwAAQELDwAAAQsSAQQABQQAAQEIDAECAgEEAQAABAgBBgABDwAAAQgBAAEBCAYBAgEEEgABAQgJAQABDQIBAAINBQAAAAYKAQABDREBAAABCQECAgYGAQEDBg0BAQICAwAAAwMQAAAAAw0BBgABDAABAQsJAAEBCA8BAwAEBAEEAAUKAAADBAMBAQABAgECAQESAQAABwEBAAANDgEAAAYQAQEDAQEBAQEDAQEGAQEKAQAADQgAAAADBgEABw`
- Runtime: **4.9s**

### 4. Lavatory - 12x12 semi-round
Non-rectangular room. Primary stat: services (latrines).
- Starter: `http://localhost:8080/#planner/AuPPSSxLLMkvqozPyy_KTczh4WFg-CDf_Kf--T8gsj_4g58BCAA`
- Best: **19 latrines** - `http://localhost:8080/#planner/AQ9sYXZhdG9yeV9ub3JtYWwMDAAAcAcA-B_j_j_j_j-A8A8AAAUAAAABBQEFAAgFAAEBBAkABgEEBQABAwUCBQoDCggLBQsECwY`
- Runtime: **1.9s**

### 5. Lavatory - 15x15
Known optimum from discord: 56. Starter: `http://localhost:8080/#planner/AuPPSSxLLMkvqozPyy_KTczh52dg-P_z_-f_z_-f_z__v_2_-j9wbgMDEAAA`
- Best: **54 latrines** - `http://localhost:8080/#planner/AQ9sYXZhdG9yeV9ub3JtYWwPDwAA__n_8__n_8__n18_fn_8__n_8__n_8__gAAABwAIAQgGAQcAAgEACAEIAgAIAQcKAAgBAQoBBgAFAQAFAAIGCAABDgkHAAYODgUACQQADQA`
- Runtime: **2.8s**
- KNOWN BEST, 56 Latrines ((this was build by hand and serves a reference!)) - `http://localhost:8080/#planner/AuPPSSxLLMkvqozPyy_KTczh52dg-P_z_-f_z_-f_z__v_2_mho4t4GBgZeBk5GRjZGRiQtMMIEILiDBAWJxcDGwMnMzgQguBg5mRiYQARYDKmZg5wIRTAwA`

### 6. Smithey - 40x40
Stress test. Known issues: 95% efficiency, 457 unsupported tiles.
- Starter: `http://localhost:8080/#planner/AuMvzy_KLs7IL4gvzs0syajU0GAAgfr_____G7IEAwQAAA`
- Best: **334 employees** - `http://localhost:8080/#planner/AQ93b3Jrc2hvcF9zbWl0aHkoKAAAAAAAf_____5______n_____-f_____5______n_____-fve9735______n_____-f_____5______n3ve99-f_____5______n____9-f_____5-973v_n_____-f_____5_____fn_____-ff____5______n_____-f_____5______n_____-f_____5______n_____-f_____5______n_____-f_____5______n_____-f_____5______gAAAAAAXwEDARcCAQMBFwUBAwEXCAEDARcLAQMBFw4BAwEXEQEDARcUAQMBFxcBAwEXGgEDARcdAQMBFyABAwEXIwEDAR0lAQMBHwIBAwEfBQEDAR8IAQMBHwsBAwEfDgEDAR8RAQMBHxQBAwEfFwEDAR8aAQMBHx0BAwEfIAAAACYBAgAAAQECAAEBJgIAAiYmAgADJQECAQAmBQIBARkBAgECJgcCAQMkJgICACYJAgIBAgECAgImDAICAwImAgMAJg8CAwEFAQIDAiYTAgMDBSYCBAAmFwIEAQkBAgQCJhwCBAMJJgIFAAEDAgUBDgEBAgABCQEDAAEPAQUAARcBBAIVGgEHAhULAQYAEg8BAQEOJQEJARAdAQsCBAgBAAEaJQEIAg8NAQoCBQ0BDAEIFAECAwsRAQMDHyIBBQANGQEEABIFAQcCBBEBBgECBAEBARIlAQkCDggBCwADIQEAAgEiAQgDECIBAgAVBQEBAhAXAQABDxQCAAABFgIAAQYMAgACBhECAAMIDAIBACYhAgEBFAECAQIREgIBAxYmAgIADAgCAgEJBgICAgwNAgIDDQYCAwANDQIDAQIGAgMCDCECAwMDAgIEAQgCAgQDDgICBQEQAwIGAAwWAgYBBxMXJwMAJR4AJyQWABgnAAIjABgAGwAnBCAAACQZJyQAFwAcAB0AHwAhACcjJyUiAA`
- Runtime: **152.5s**
