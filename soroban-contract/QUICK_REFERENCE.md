# Quick Reference: Soroban SDK v25 Upgrade

## What Changed?

### Breaking Changes (Fixed)

- ✅ `deploy_v2()` → `deploy()` (2 files updated)

### Code Quality (Fixed)

- ✅ Removed duplicate functions in event_manager (5 duplicates removed)

### Version Update

- ✅ SDK v22.0.0 → v25.0.0

## Modified Files

| File                        | Change             | Lines   |
| --------------------------- | ------------------ | ------- |
| `Cargo.toml`                | SDK version        | 16      |
| `ticket_factory/src/lib.rs` | deploy API         | 108     |
| `tba_registry/src/lib.rs`   | deploy API         | 162     |
| `event_manager/src/lib.rs`  | removed duplicates | 899-927 |

## Build Commands

```bash
cd soroban-contract

# Build
cargo build --target wasm32-unknown-unknown --release

# Test
cargo test

# Test specific contract
cargo test -p <contract_name>
```

## What's New in Protocol 25

- CAP-73: Token trustlines
- CAP-78: Better TTL control
- CAP-79: Muxed addresses
- CAP-80: BN254 crypto
- CAP-82: Safe 256-bit math

## Verification Checklist

- [x] SDK version updated
- [x] Breaking changes fixed
- [x] No deprecated APIs
- [x] No duplicate code
- [x] Documentation created

## Documentation

- Full migration guide: `MIGRATION_v25.md`
- Upgrade summary: `UPGRADE_SUMMARY.md`

---

**Status**: ✅ COMPLETE
**Date**: April 27, 2026
**Risk Level**: LOW
