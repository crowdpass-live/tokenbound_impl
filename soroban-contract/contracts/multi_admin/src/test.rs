#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env};

fn setup() -> (Env, MultiAdminClient<'static>, Address) {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(MultiAdmin, ());
    let client = MultiAdminClient::new(&env, &contract_id);
    let admin = Address::generate(&env);
    client.initialize(&admin).unwrap();
    (env, client, admin)
}

#[test]
fn test_initialize_sets_first_admin() {
    let (_env, client, admin) = setup();
    assert!(client.is_admin(&admin));
    assert_eq!(client.get_admins().len(), 1);
}

#[test]
fn test_grant_and_revoke_admin() {
    let (_env, client, admin) = setup();
    let new_admin = Address::generate(&_env);

    client.grant_admin(&admin, &new_admin).unwrap();
    assert!(client.is_admin(&new_admin));
    assert_eq!(client.get_admins().len(), 2);

    client.revoke_admin(&admin, &new_admin).unwrap();
    assert!(!client.is_admin(&new_admin));
    assert_eq!(client.get_admins().len(), 1);
}

#[test]
fn test_cannot_remove_last_admin() {
    let (_env, client, admin) = setup();
    let err = client.try_revoke_admin(&admin, &admin).unwrap_err();
    assert_eq!(err.unwrap(), Error::CannotRemoveLastAdmin);
}

#[test]
fn test_renounce_admin_requires_another_admin() {
    let (_env, client, admin) = setup();
    let second_admin = Address::generate(&_env);
    client.grant_admin(&admin, &second_admin).unwrap();
    client.renounce_admin(&second_admin).unwrap();
    assert!(!client.is_admin(&second_admin));
    assert_eq!(client.get_admins().len(), 1);
}
