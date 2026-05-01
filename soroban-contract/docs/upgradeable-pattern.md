# Upgradeable Contract Pattern

This document describes the upgrade-safe contract pattern used by every
production CrowdPass Soroban contract, and the reference implementation that
illustrates it end-to-end.

## Why this pattern exists

Soroban contracts can replace their own bytecode through
`Env::deployer().update_current_contract_wasm`. Used naively that primitive
is dangerous: a single compromised admin key can swap in arbitrary code
instantly, with no notice and no audit window. CrowdPass therefore wraps the
primitive in a small shared library, `contracts/upgradeable`, that adds three
guarantees:

1. **Authenticated admin** — only the address recorded as admin at deploy
   time (or the current admin after a transfer) can touch upgrade state.
2. **Timelocked upgrade** — upgrades are scheduled, not executed. The new
   WASM hash sits in storage for `UPGRADE_DELAY_LEDGERS` (~24 h on mainnet
   with 5-second ledgers) before anyone can commit it.
3. **Emergency pause** — every state-mutating entry point checks
   `require_not_paused`, so the admin can freeze user-facing functionality
   during an incident without performing an upgrade.

A monotonic version counter and a structured event for every state change
give off-chain observability for free.

## Reference implementation

`contracts/upgradeable_reference` is a deliberately minimal contract whose
only job is to demonstrate the pattern. It stores a single counter and
exposes one mutation (`increment`) so the wiring around it is easy to read.
Every method that a production contract needs to expose is present:

| Method                     | Purpose                                                  |
| -------------------------- | -------------------------------------------------------- |
| `__constructor(admin)`     | Records admin, seeds version 1, initialises state        |
| `increment(caller)`        | Example mutation, gated by `require_not_paused`          |
| `get()`                    | Example read view                                        |
| `pause()` / `unpause()`    | Admin-only emergency pause                               |
| `is_paused()`              | Public pause state                                       |
| `schedule_upgrade(hash)`   | Admin-only; records pending WASM hash and ledger         |
| `cancel_upgrade()`         | Admin-only; aborts a pending schedule                    |
| `commit_upgrade()`         | Admin-only; swaps WASM after timelock elapses            |
| `transfer_admin(new)`      | Admin-only; rotates admin                                |
| `admin()` / `version()`    | Public views for off-chain monitoring                    |

## Lifecycle

```
deploy                                schedule          commit
  │                                       │                 │
  │  init_version=1, admin=A              │ store           │ require admin
  │                                       │ (hash, sched)   │ assert ledger ≥ sched + DELAY
  ▼                                       ▼                 ▼
[ v1, unpaused ]──pause──▶[ v1, paused ]──schedule──▶[ pending ]──commit──▶[ v2 ]
                                                                      ▲
                                                                cancel│
                                                                  ────┘
```

## Authoring a new upgradeable contract

1. Add `upgradeable = { path = "../upgradeable" }` to the contract's
   `Cargo.toml` and `use upgradeable as upg;` at the top of `lib.rs`.
2. In `__constructor`, call `upg::set_admin(&env, &admin)` and
   `upg::init_version(&env)` before setting any other state.
3. At the top of every mutating method, call `upg::require_not_paused(&env)`.
   Place it before authentication so paused contracts give a consistent
   reason rather than "unauthorized."
4. Re-export the eight upgrade methods from the table above as thin
   delegators to the `upg::` helpers. Tooling expects this exact shape.
5. Use `upg::extend_persistent_ttl` and `upg::extend_instance_ttl` to keep
   storage alive — the helpers use the canonical thresholds so all
   contracts share a single TTL budget.

`contracts/upgradeable_reference/src/lib.rs` is the canonical template: copy
it and replace the counter with your domain logic.

## Deployment workflow

1. Deploy v1 with the chosen admin key.
2. Build and `soroban contract install` the new WASM, capture its hash.
3. Call `schedule_upgrade(hash)`. Announce the schedule and hash publicly
   so users have time to inspect the diff.
4. After `UPGRADE_DELAY_LEDGERS` ledgers have elapsed, call
   `commit_upgrade()`. The contract version increments and an `upgraded`
   event is emitted carrying the old and new versions.
5. If a problem is discovered during the window, call `cancel_upgrade()`.
   The pending entry is removed and an `upg_cncl` event is emitted.

## Testing

`contracts/upgradeable_reference/src/test.rs` contains the canonical test
matrix:

- Initial state (admin recorded, version = 1, not paused).
- Pause guard: mutations succeed before pause, panic with `contract is
  paused` after pause, succeed again after unpause.
- Timelock: `commit_upgrade` panics with `no pending upgrade` if nothing was
  scheduled, panics with `timelock not elapsed` if committed too early, and
  `cancel_upgrade` clears the schedule (a subsequent commit panics with `no
  pending upgrade`).
- Admin transfer: `admin()` reflects the new owner; `version()` is unchanged
  by an admin rotation.

Production contracts should add the same matrix on top of their domain
tests.

## Security notes

- The admin is a single address. For production deployments this should be
  a multisig or governance contract, not an EOA.
- The timelock is enforced against ledger sequence, not wall-clock time, so
  the effective delay scales with ledger close time. The constant lives in
  `contracts/upgradeable/src/lib.rs` and should be reviewed before each
  release.
- `commit_upgrade` removes the pending entry **before** calling
  `update_current_contract_wasm` (checks-effects-interactions) so a
  reverting upgrade cannot be re-committed without a fresh schedule.
- An upgrade can change the storage layout. Migration logic that reads
  legacy keys should run in the new contract's first call after upgrade,
  not in a constructor (which does not run on upgrade).
