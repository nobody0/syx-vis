# Optimizer Benchmark

Semi-manual regression tests for `display/optimizer.js`. The optimizer is deterministic (seeded PRNG), so the same input always produces the same output — but code changes can shift results.

## Tools

**`run-optimizer.js`** — `node scripts/run-optimizer.js <save-string-or-URL> [--decode]`
- Runs simulated-annealing optimizer, outputs save string to stdout (progress on stderr)
- `--decode` also runs `decode-plan.js` on the result

**`decode-plan.js`** — `node scripts/decode-plan.js <save-string-or-URL> [--verbose]`
- Prints header, ASCII grid, and stat totals
- `--verbose` adds placements table, group info, and tile type details

## Test Cases

### 1. Bakery — 20x15
Full rectangle, employees stat.
- Starter: `http://localhost:3000/#planner/AuMrSk3LzEstik9KzE4tqhThZ2Bg__-v_v9zPAQDCAAA`
- Best: **43 workers** — `http://localhost:3000/#planner/AQ5yZWZpbmVyX2Jha2VyeRQPAAAH__5__-f__n_v5__-ff_nfn5__-f__n__5__-f__n__4AAAATAAMAARECAAABAQIBAQoBAAMBDAsCAAABBwADAQwDAgAAAgkAAwICAQIAAAEKAgABCRIAAwIBDgIAAAYLAAMDCQMCAAAFCwACAQQEAgEACAYCAQEBDQEAAAYHAAADCQwFAAQAEA4CAAYABQ`

### 2. Carpenter — 20x15
Full rectangle, employees stat.
- Starter: `http://localhost:3000/#planner/AhMqzy_KLs7IL4hPTiwqSM0rSS0S4WdgYP__r_7_czwEAwgAAA`
- Best: **56 workers** — `http://localhost:3000/#planner/Aj2N3QqCQBCFz8y6u6aupvQSPVVECEGQYUFX2eN62RtkZwq6cPB8e366-zCersfhsjvsx0t_vvXjpgHi8n4uM8-L57HM0_ST_wNgy09EVKRVIIlCUqdQcWTRmGRk4u0lmKxMJrPUolqpscbY2mROqeZlHpqx2VkU0ZGVlHCFDdU2xJgmxiSwFKEk84HSWUuItshxjUEcVvyD_zIndLAAOX1SeIE61iMLWqFuPw`

### 3. Hunter — 20x15
Full rectangle, employees stat.
- Starter: `http://localhost:3000/#planner/AuPNKM0rSS2Kz8svyk3MEeFnYGD__6_-_3M8BAMIAAA`
- Best: **26 workers** — `http://localhost:3000/#planner/Aj2OSw7CMBBDZ5LmQz60VByF-yAWSCygSBUsKcftkhtQbJBYxHoeeZypp_twO4674TpeDudtKxKW93OZIS_IY5mn6Wf_IiI7PFU1UpXUkTpSA9JASqQKqpxVzmqiVLXiMxKmBzmS6xEJ-t0HeQuKpOBIPdZihm0KyJICmyObXcM1_ub5R4ggy6syCzKvMp7hNWwyoNSCCmfZM7wGNY5hlqaiTlLiVdxdeVUpG4XFgcYbSEzoz0U-`

### 4. Lavatory — 12x12 semi-round
Non-rectangular room. Primary stat: services (latrines).
- Starter: `http://localhost:3000/#planner/AuPPSSxLLMkvqozPyy_KTczh4WFg-CDf_Kf--T8gsj_4g58BCAA`
- Best: **17 latrines** — `http://localhost:3000/#planner/AQ9sYXZhdG9yeV9ub3JtYWwMDAAA8A8A8A8H_n_n_h_h8B8AAAQABQACBAEFAAkEAAEBBQkABAIGAQA`

### 5. Lavatory — 15x15
Known optimum from discord: 56. Starter: `http://localhost:3000/#planner/AuPPSSxLLMkvqozPyy_KTczh52dg-P_z_-f_z_-f_z__v_2_-j9wbgMDEAAA`
- Best: **53 latrines** — `http://localhost:3000/#planner/AuPPSSxLLMkvqozPyy_KTczh52fg-P_x_-f_z_8f_z-_3n5f_Z__P8Hc8_8bGBi4GNgY2BkZ2RnYOYEsZhCXC0gwMjExsDIysgEJbhCLm42RlYGFjYGBgYONAQA`

### 6. Smithey — 40x40
Stress test. Known issues: 95% efficiency, 457 unsupported tiles, no doors.
- Starter: `http://localhost:3000/#planner/AuMvzy_KLs7IL4gvzs0syajU0GAAgfr_____G7IEAwQAAA`
- Best: **314 employees** — `http://localhost:3000/#planner/Aq1S227TQBTcs2vv-pLYjm9x4viSuIn6V7wWIVREkRBCpB_FM-LP4BP62AcEYcYVEkJ9pFFHZ2fm3Hadvr99--ru5vbNi7vXL9_dfLi-Vvy7v1wuv56DT3P08P3r-f7nj8e_hPOf6PzEffz28E_u-cnyOB-_PF_-_8C8wmf8i8ZPjlqp0xyctNLiSaDE16IkBCexGCULWKTQSChoqcjV5DpYdEduECOOpWSET_bkDuJLMnMTuStwRmtlPI3yJw11Q9UTqD5AW0HnowfOkQvIhQATCTNS8fRxBTWmuqC6FHItV0ApScilzMggmBXTWpp33LWj0Is4teT0i4FV9hB6TjVqYDRAzWOklTl2KyvUK9dUBWq1EicmgbpcQE1xL3rPonvmVrVY8QNUzgHiIqgLB3XivtaJ1VkGNc2hXvGyfavFWB-5QYTcbKQvhmpz3sYGuXYQUa7klRRoaRseua_bIlryNtwAIXASqnzLI0dzELTbSyiZAVc4Wlg02MAXkwvRTaIK60etxKrEc6sEm0vWw-claO4jTaUj1JqVA04QNHwUjhYO2io_g7oL2Re7SXrgA6C5KXipYSTKxLzOzSBKxzv48DR484ar1ogsPhXl-4j6LT-6CZARSks4ADZrQOsAWx4HRgMsOjQs2gD6DgXGFtHYIzowOiDSU05AI1N7gHUCaJeAgTChgDIoqvHAGGMHiJGh6hWhAjQcreHMW4BpCs5CS4t6qsNouqOvZ8ZIbpyjkgBVTSkyfMM96MO3DMjVbw`
