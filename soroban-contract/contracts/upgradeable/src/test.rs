#![cfg(test)]

extern crate std;

use soroban_sdk::{contract, testutils::Address as _, Env};

use crate::{
    cancel_upgrade, commit_upgrade, get_admin, get_version, init_version, is_paused,
    require_not_paused, schedule_upgrade, set_admin, transfer_admin, UPGRADE_DELAY_LEDGERS,
};

#[contract]
struct DummyContract;

#[test]
fn test_upgrade_flow_and_pause_guard() {
    let env = Env::default();
    env.mock_all_auths();
    let dummy_id = env.register(DummyContract, ());

    env.as_contract(&dummy_id, || {
        let admin = soroban_sdk::Address::generate(&env);
        set_admin(&env, &admin);
        init_version(&env);

        assert_eq!(get_admin(&env), admin);
        assert_eq!(get_version(&env), 1);

        require_not_paused(&env);
        assert!(!is_paused(&env));

        let new_wasm = soroban_sdk::BytesN::from_array(&env, &[7u8; 32]);
        schedule_upgrade(&env, new_wasm.clone());
        cancel_upgrade(&env);

        schedule_upgrade(&env, new_wasm);
        let scheduled_at = env.ledger().sequence();
        env.ledger()
            .set_sequence_number(scheduled_at + UPGRADE_DELAY_LEDGERS);
        commit_upgrade(&env);
        assert_eq!(get_version(&env), 2);

        assert!(!is_paused(&env));
    });
}

#[test]
fn test_transfer_admin_updates_admin() {
    let env = Env::default();
    env.mock_all_auths();
    let dummy_id = env.register(DummyContract, ());

    env.as_contract(&dummy_id, || {
        let admin = soroban_sdk::Address::generate(&env);
        let new_admin = soroban_sdk::Address::generate(&env);

        set_admin(&env, &admin);
        init_version(&env);

        transfer_admin(&env, new_admin.clone());
        assert_eq!(get_admin(&env), new_admin);
    });
}
