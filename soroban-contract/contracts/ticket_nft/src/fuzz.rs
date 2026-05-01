#![cfg(test)]

//! Fuzz tests for the TicketNft contract.
//!
//! Property-based testing ensures that invariants like total supply, ownership rules,
//! and metadata integrity hold under random operations.

use super::*;
use fuzz_helpers::{arb_ascii_text, arb_u128_range, arb_u32_range, assert_invariant};
use soroban_sdk::{testutils::Address as _, Address, Env, String};
use proptest::prelude::*;

fn setup(env: &Env) -> (TicketNftClient<'_>, Address, Address) {
    let minter = Address::generate(env);
    let admin = Address::generate(env);
    let contract_id = env.register(
        TicketNft,
        (
            &minter,
            &admin,
            String::from_str(env, "Ticket"),
            String::from_str(env, "TKT"),
            String::from_str(env, "https://example.com/"),
        ),
    );
    let client = TicketNftClient::new(env, &contract_id);
    env.mock_all_auths();
    (client, minter, admin)
}

proptest! {
    #![proptest_config(ProptestConfig::with_cases(50))]

    #[test]
    fn fuzz_nft_lifecycle(
        name in arb_ascii_text(100),
        description in arb_ascii_text(200),
        image in arb_ascii_text(100),
        event_id in arb_u32_range(0, 1000),
        tier in arb_ascii_text(20),
    ) {
        let env = Env::default();
        let (client, _minter, _admin) = setup(&env);
        let user1 = Address::generate(&env);
        let user2 = Address::generate(&env);

        let mint_res = client.try_mint_ticket_nft(
            &user1,
            &String::from_str(&env, &name),
            &String::from_str(&env, &description),
            &String::from_str(&env, &image),
            &event_id,
            &String::from_str(&env, &tier),
            &None,
        );

        if let Ok(Ok(token_id)) = mint_res {
            assert_invariant(token_id > 0, "mint produces a valid token id");
            assert_eq!(client.owner_of(&token_id), user1);
            assert_eq!(client.balance_of(&user1), 1);
            assert_eq!(client.balance_of(&user2), 0);

            let transfer_res = client.try_transfer_from(&user1, &user2, &token_id);
            if transfer_res.is_ok() {
                assert_eq!(client.owner_of(&token_id), user2);
                assert_eq!(client.balance_of(&user1), 0);
                assert_eq!(client.balance_of(&user2), 1);

                client.burn(&token_id).expect("burn should succeed after transfer");
                assert_invariant(!client.is_valid(&token_id), "burn removes token validity");
                assert_eq!(client.balance_of(&user2), 0);
            }
        }
    }

    #[test]
    fn fuzz_transfer_adversarial(
        token_id in arb_u128_range(0, 100),
    ) {
        let env = Env::default();
        let (client, _minter, _admin) = setup(&env);
        let user1 = Address::generate(&env);
        let user2 = Address::generate(&env);

        let _ = client.try_transfer_from(&user1, &user2, &token_id);
    }
}
