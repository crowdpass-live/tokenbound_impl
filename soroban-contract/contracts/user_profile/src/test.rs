#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String};

fn setup() -> (Env, UserProfileClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(UserProfile, ());
    let client = UserProfileClient::new(&env, &contract_id);
    (env, client)
}

fn sample_strings(env: &Env) -> (String, String, String, String) {
    (
        String::from_str(env, "alice"),
        String::from_str(env, "Alice"),
        String::from_str(env, "Hello"),
        String::from_str(env, "ipfs://avatar"),
    )
}

#[test]
fn create_and_get_profile_round_trips() {
    let (env, client) = setup();
    let user = Address::generate(&env);
    let (username, display_name, bio, avatar) = sample_strings(&env);

    client.create_profile(&user, &username, &display_name, &bio, &avatar);

    let profile = client.get_profile(&user);
    assert_eq!(profile.owner, user);
    assert_eq!(profile.username, username);
    assert_eq!(profile.display_name, display_name);
    assert_eq!(profile.bio, bio);
    assert_eq!(profile.avatar_uri, avatar);
    assert_eq!(profile.created_at, profile.updated_at);
}

#[test]
fn create_profile_rejects_duplicate() {
    let (env, client) = setup();
    let user = Address::generate(&env);
    let (username, display_name, bio, avatar) = sample_strings(&env);

    client.create_profile(&user, &username, &display_name, &bio, &avatar);

    let result = client.try_create_profile(&user, &username, &display_name, &bio, &avatar);
    assert!(result.is_err());
}

#[test]
fn create_profile_rejects_empty_username() {
    let (env, client) = setup();
    let user = Address::generate(&env);
    let empty = String::from_str(&env, "");
    let display_name = String::from_str(&env, "Alice");
    let bio = String::from_str(&env, "");
    let avatar = String::from_str(&env, "");

    let result = client.try_create_profile(&user, &empty, &display_name, &bio, &avatar);
    assert!(result.is_err());
}

#[test]
fn create_profile_rejects_oversized_field() {
    let (env, client) = setup();
    let user = Address::generate(&env);
    // 600-byte bio exceeds MAX_BIO_BYTES (500).
    let too_long: alloc::string::String = "a".repeat(600);
    let username = String::from_str(&env, "alice");
    let display_name = String::from_str(&env, "Alice");
    let bio = String::from_str(&env, &too_long);
    let avatar = String::from_str(&env, "");

    let result = client.try_create_profile(&user, &username, &display_name, &bio, &avatar);
    assert!(result.is_err());
}

#[test]
fn update_profile_partial_fields() {
    let (env, client) = setup();
    let user = Address::generate(&env);
    let (username, display_name, bio, avatar) = sample_strings(&env);

    client.create_profile(&user, &username, &display_name, &bio, &avatar);

    let new_bio = String::from_str(&env, "Updated bio");
    client.update_profile(&user, &None, &None, &Some(new_bio.clone()), &None);

    let profile = client.get_profile(&user);
    assert_eq!(profile.bio, new_bio);
    // Untouched fields preserved.
    assert_eq!(profile.username, username);
    assert_eq!(profile.display_name, display_name);
    assert_eq!(profile.avatar_uri, avatar);
}

#[test]
fn update_profile_bumps_updated_at() {
    let (env, client) = setup();
    let user = Address::generate(&env);
    let (username, display_name, bio, avatar) = sample_strings(&env);

    client.create_profile(&user, &username, &display_name, &bio, &avatar);
    let before = client.get_profile(&user);

    soroban_sdk::testutils::Ledger::set_timestamp(&env.ledger(), before.created_at + 100);

    let new_display = String::from_str(&env, "Alice 2");
    client.update_profile(&user, &None, &Some(new_display), &None, &None);

    let after = client.get_profile(&user);
    assert_eq!(after.created_at, before.created_at);
    assert!(after.updated_at > before.updated_at);
}

#[test]
fn update_profile_rejects_unknown_user() {
    let (env, client) = setup();
    let user = Address::generate(&env);

    let new_username = String::from_str(&env, "alice");
    let result = client.try_update_profile(&user, &Some(new_username), &None, &None, &None);
    assert!(result.is_err());
}

#[test]
fn update_profile_rejects_oversized_field() {
    let (env, client) = setup();
    let user = Address::generate(&env);
    let (username, display_name, bio, avatar) = sample_strings(&env);

    client.create_profile(&user, &username, &display_name, &bio, &avatar);

    // Username max is 64 bytes; 100 'a's must be rejected.
    let too_long: alloc::string::String = "a".repeat(100);
    let bad = String::from_str(&env, &too_long);

    let result = client.try_update_profile(&user, &Some(bad), &None, &None, &None);
    assert!(result.is_err());
}

#[test]
fn get_profile_unknown_user_errors() {
    let (env, client) = setup();
    let user = Address::generate(&env);

    let result = client.try_get_profile(&user);
    assert!(result.is_err());
}

#[test]
fn has_profile_reflects_state() {
    let (env, client) = setup();
    let user = Address::generate(&env);
    let (username, display_name, bio, avatar) = sample_strings(&env);

    assert!(!client.has_profile(&user));

    client.create_profile(&user, &username, &display_name, &bio, &avatar);

    assert!(client.has_profile(&user));
}

extern crate alloc;
