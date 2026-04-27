#![cfg(test)]
extern crate std;

use super::*;
use soroban_sdk::{contract, contractimpl, Env};

// A minimal host contract that exercises every pausable primitive through a
// real contract context. The library itself has no contract type, so we wrap
// it in this test harness.
#[contract]
struct Host;

#[contractimpl]
impl Host {
    pub fn do_pause(env: Env) {
        pause(&env);
    }

    pub fn do_unpause(env: Env) {
        unpause(&env);
    }

    pub fn flag(env: Env) -> bool {
        is_paused(&env)
    }

    pub fn guarded(env: Env) {
        require_not_paused(&env);
    }
}

fn setup() -> (Env, HostClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();
    let id = env.register(Host, ());
    let client = HostClient::new(&env, &id);
    (env, client)
}

#[test]
fn defaults_to_unpaused() {
    let (_env, client) = setup();
    assert!(!client.flag());
}

#[test]
fn pause_then_unpause_round_trips() {
    let (_env, client) = setup();

    client.do_pause();
    assert!(client.flag());

    client.do_unpause();
    assert!(!client.flag());
}

#[test]
fn require_not_paused_passes_when_unpaused() {
    let (_env, client) = setup();
    // Should not panic.
    client.guarded();
}

#[test]
#[should_panic(expected = "contract is paused")]
fn require_not_paused_panics_when_paused() {
    let (_env, client) = setup();
    client.do_pause();
    client.guarded();
}
