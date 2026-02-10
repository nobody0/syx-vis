# Optimizer Benchmark

Semi-manual regression tests for `display/optimizer.js`. The optimizer is deterministic
(seeded PRNG via `mulberry32`), so the same input always produces the same output —
but code changes can shift results. Visual inspection of layouts also matters, so these
cannot be fully automated.

## Tool Reference

### `run-optimizer.js`

```
node scripts/run-optimizer.js <save-string-or-URL> [--decode]
```

Runs the simulated-annealing optimizer on a planner save string.

- Accepts a base64url save string or a full `#planner/...` URL
- Outputs the optimized save string to **stdout** (status/progress on stderr)
- `--decode` — also runs `decode-plan.js` on the result to show the decoded layout

**Example:**
```bash
# Optimize and capture the result:
RESULT=$(node scripts/run-optimizer.js "http://localhost:3000/#planner/AuMr...")

# Optimize and print decoded stats:
node scripts/run-optimizer.js "AuMr..." --decode
```

### `decode-plan.js`

```
node scripts/decode-plan.js <save-string-or-URL> [--verbose]
```

Decodes a planner save string into a human-readable layout with stats.

- Prints: header (building, dimensions, tile count), ASCII grid, placements table, stat totals
- `--verbose` — also shows group info (item counts, min/max, rotations) and tile type details

**Example:**
```bash
node scripts/decode-plan.js "http://localhost:3000/#planner/Aj2N..."
```

## Benchmark Workflow

1. **Optimize** the empty room starter URL:
   ```bash
   RESULT=$(node scripts/run-optimizer.js "<starter-url>")
   ```

2. **Decode** the result and compare stats against the previous best:
   ```bash
   node scripts/decode-plan.js "$RESULT"
   ```

3. **Visually inspect** in the browser (requires `npx serve .`):
   ```
   http://localhost:3000/#planner/<paste RESULT here>
   ```

4. **Compare** against the previous best — check that the primary stat hasn't regressed
   and the layout looks reasonable (no pathological placements, furniture outside room, etc.)

## Test Cases

### 1. Bakery — 20x15 rectangle, 42 workers

Full rectangular room, employees stat.

Starter (empty room):
```
http://localhost:3000/#planner/AuMrSk3LzEstik9KzE4tqhThZ2Bg__-v_v9zPAQDCAAA
```

Previous best — **42 workers**:
```
http://localhost:3000/#planner/Aj2NzQoCMQyEZ5LV_qysrPp-olBBBA-9eXD3cfsGHltTBA8Z5guZyZTT7f5M-Xy9PFJ-nfaAa5-1lVbXUmp9t7IsP_wLgCMUnAUgBRwJ5W7sOHQn3TmICIVgtJNw6InJ0EeoBovBK-3bxup0sBFvu60DNURO8Qs
```

### 2. Carpenter — 20x15 rectangle, 56 workers

Full rectangular room, employees stat.

Starter (empty room):
```
http://localhost:3000/#planner/AhMqzy_KLs7IL4hPTiwqSM0rSS0S4WdgYP__r_7_czwEAwgAAA
```

Previous best — **56 workers**:
```
http://localhost:3000/#planner/Aj2N3QqCQBCFz8y6u6aupvQSPVVECEGQYUFX2eN62RtkZwq6cPB8e366-zCersfhsjvsx0t_vvXjpgHi8n4uM8-L57HM0_ST_wNgy09EVKRVIIlCUqdQcWTRmGRk4u0lmKxMJrPUolqpscbY2mROqeZlHpqx2VkU0ZGVlHCFDdU2xJgmxiSwFKEk84HSWUuItshxjUEcVvyD_zIndLAAOX1SeIE61iMLWqFuPw
```

### 3. Hunter — 20x15 rectangle, 26 workers

Full rectangular room, employees stat.

Starter (empty room):
```
http://localhost:3000/#planner/AuPNKM0rSS2Kz8svyk3MEeFnYGD__6_-_3M8BAMIAAA
```

Previous best — **26 workers**:
```
http://localhost:3000/#planner/Aj2OSw7CMBBDZ5LmQz60VByF-yAWSCygSBUsKcftkhtQbJBYxHoeeZypp_twO4774TpeDudtKxKW93OZIS_IY5mn6Wf_IiI7PFU1UpXUkTpSA9JASqQKqpxVzmqiVLXiMxKmBzmS6xEJ-t0HeQuKpOBIPdZihm0KyJICmyObXcM1_ub5R4ggy6syCzKvMp7hNWwyoNSCCmfZM7wGNY5hlqaiTlLiVdxdeVUpG4XFgcYbSEzoz0U-
```

### 4. Lavatory — 12x12 semi-round, 17 latrines

Non-rectangular (semicircular) room shape. Tests optimizer handling of irregular geometry.
Primary stat is services (latrines), not employees.

Starter (empty room):
```
http://localhost:3000/#planner/AuPPSSxLLMkvqozPyy_KTczh4WFg-CDf_Kf--T8gsj_4g58BCAA
```

Previous best — **17 latrines**:
```
http://localhost:3000/#planner/AQ9sYXZhdG9yeV9ub3JtYWwMDAAA8A8A8A8H_n_n_h_h8B8AAAQABQACBAEFAAkEAAEBBQkABAIGAQA
```

### 5. Lavatory — 15x15, 47 latrines

a discord reported with known optimum with 56 http://localhost:3000/#planner/AuPPSSxLLMkvqozPyy_KTczh52dg-P_z_-f_z_-f_z__v_2_mho4t4GBgZeBk5GRjZGRiQtMMIEILiDBAWJxcDGwMnMzgQguBg5mRiYQARYDKmZg5wIRTAwA

Starter (empty room):
```
http://localhost:3000/#planner/AuPPSSxLLMkvqozPyy_KTczh52dg-P_z_-f_z_-f_z__v_2_-j9wbgMDEAAA
```

Previous best — **47 latrines**:
```
http://localhost:3000/#planner/AuPPSSxLLMkvqozPyy_KTczh52fg-P_x_-f_z_8f_z-_3n5f_Z__P_8_BnL6_zMwMHAzsDKwMzKyM7BzAlnMIC4XFwMbIxMTAyszIxuQ4AaxuNkYWRlY2BgYmDhYGZmYmbgYAA
```


Previous best — **53 latrines**:

## Notes

- The optimizer is deterministic per input — if the code hasn't changed, results should be identical.
- Regressions in primary stat scores indicate a bug or unintended behavioral change.
- Always visually inspect: a higher score with pathological layout (blocked walkways, wasted tiles) is still a regression.
- The lavatory test specifically exercises non-rectangular rooms, which are common in real gameplay.
- The `--decode` flag on `run-optimizer.js` is the quickest way to get a full stat breakdown after optimization.
