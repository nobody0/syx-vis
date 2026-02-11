# Optimizer Benchmark

Semi-manual regression tests for `display/optimizer.js`. The optimizer is deterministic (seeded PRNG), so the same input always produces the same output - but code changes can shift results.

## Tools

**`run-optimizer.js`** - `node scripts/run-optimizer.js <save-string-or-URL> [--decode] [--trace] [--walk]`
- Runs optimizer, outputs save string to stdout (progress on stderr)
- `--decode` also runs `decode-plan.js` on the result (includes walk distance)
- `--walk` prints avg/max walk distance metrics
- `--trace` prints per-phase timing breakdown

**`decode-plan.js`** - `node scripts/decode-plan.js <save-string-or-URL> [--verbose]`
- Prints header, ASCII grid, and stat totals
- `--verbose` adds placements table, group info, and tile type details

## Test Cases

### 1. Bakery - 20x15
Full rectangle, employees stat.
- Starter: `http://localhost:8080/#planner/AuMrSk3LzEstik9KzE4tqhThZ2Bg__-v_v9zPAQDCAAA`
- Best: **47 workers** (walk avg=10.3, max=25)
- Runtime: **2.6s**

### 2. Carpenter - 20x15
Full rectangle, employees stat.
- Starter: `http://localhost:8080/#planner/AhMqzy_KLs7IL4hPTiwqSM0rSS0S4WdgYP__r_7_czwEAwgAAA`
- Best: **59 workers, 1 door** (walk avg=13.2, max=24)
- Runtime: **12.5s**

### 3. Hunter - 20x15
Full rectangle, employees stat.
- Starter: `http://localhost:8080/#planner/AuPNKM0rSS2Kz8svyk3MEeFnYGD__6_-_3M8BAMIAAA`
- Best: **29 workers, 1 door** (walk avg=15.3, max=22)
- Runtime: **3.4s**

### 4. Lavatory - 12x12 semi-round
Non-rectangular room. Primary stat: services (latrines).
- Starter: `http://localhost:8080/#planner/AuPPSSxLLMkvqozPyy_KTczh4WFg-CDf_Kf--T8gsj_4g58BCAA`
- Best: **20 latrines** (walk avg=4.7, max=9)
- Runtime: **2.6s**

### 5. Lavatory - 15x15
Known optimum from discord: 56. Starter: `http://localhost:8080/#planner/AuPPSSxLLMkvqozPyy_KTczh52dg-P_z_-f_z_-f_z__v_2_-j9wbgMDEAAA`
- Best: **56 latrines** (walk avg=4.8, max=11)
- Runtime: **2.4s**

### 6. Smithy - 40x40
Stress test. Regular pillar grid (spacing 5) for structural stability, tiling constructive strategy.
- Starter: `http://localhost:8080/#planner/AuMvzy_KLs7IL4gvzs0syajU0GAAgfr_____G7IEAwQAAA`
- Best: **324 employees, 100% efficiency, 0 unsupported tiles** (walk avg=55.7, max=111)
- Runtime: **~156s**
