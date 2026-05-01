#![cfg(test)]

use super::*;
use soroban_sdk::testutils::{Address as _, Ledger};
use soroban_sdk::{Address, Env, IntoVal, String, Symbol, Vec, Map};

fn setup_dao(env: &Env) -> (DaoGovernanceClient<'_>, Address, Address, Address) {
    env.mock_all_auths();

    let admin = Address::generate(env);
    let voting_token = Address::generate(env);
    let member1 = Address::generate(env);

    let contract_id = env.register(DaoGovernance, ());
    let client = DaoGovernanceClient::new(env, &contract_id);

    // Initialize DAO
    let config = DaoConfig {
        voting_token: voting_token.clone(),
        voting_period: 3600, // 1 hour
        execution_delay: 1800, // 30 minutes
        quorum_percentage: 50, // 50%
        proposal_threshold: 100, // 100 tokens to propose
        max_members: 100,
    };

    client.initialize(&admin, &config);

    // Add member
    client.add_member(&member1);

    (client, admin, voting_token, member1)
}

#[test]
fn test_dao_initialization() {
    let env = Env::default();
    let (client, admin, voting_token, _) = setup_dao(&env);

    let config = client.get_config_view();
    assert_eq!(config.voting_token, voting_token);
    assert_eq!(config.voting_period, 3600);
    assert_eq!(config.quorum_percentage, 50);
}

#[test]
fn test_member_management() {
    let env = Env::default();
    let (client, _, _, member1) = setup_dao(&env);

    assert!(client.is_member_view(&member1));

    let members = client.get_members();
    assert_eq!(members.len(), 1);
    assert!(members.contains(&member1));
}

#[test]
fn test_proposal_creation() {
    let env = Env::default();
    let (client, _, _, member1) = setup_dao(&env);

    let title = String::from_str(&env, "Test Proposal");
    let description = String::from_str(&env, "A test proposal for DAO governance");

    let proposal_id = client.create_proposal(
        &member1,
        &ProposalType::General,
        &title,
        &description,
        &Vec::new(&env),
        &Map::new(&env),
        &Vec::new(&env),
        &Vec::new(&env),
        &0,
    );

    let proposal = client.get_proposal(&proposal_id).unwrap();
    assert_eq!(proposal.title, title);
    assert_eq!(proposal.description, description);
    assert_eq!(proposal.proposer, member1);
    assert_eq!(proposal.proposal_type, ProposalType::General);
}

#[test]
fn test_voting() {
    let env = Env::default();
    let (client, _, _, member1) = setup_dao(&env);

    // Create proposal
    let proposal_id = client.create_proposal(
        &member1,
        &ProposalType::General,
        &String::from_str(&env, "Test Proposal"),
        &String::from_str(&env, "A test proposal"),
        &Vec::new(&env),
        &Map::new(&env),
        &Vec::new(&env),
        &Vec::new(&env),
        &0,
    );

    // Vote on proposal
    client.vote(&member1, &proposal_id, &true);

    let votes = client.get_proposal_votes(&proposal_id);
    assert_eq!(votes.len(), 1);

    let vote = votes.get(member1).unwrap();
    assert!(vote.in_favor);
}

#[test]
fn test_proposal_execution() {
    let env = Env::default();
    let (client, _, _, member1) = setup_dao(&env);

    // Create proposal
    let proposal_id = client.create_proposal(
        &member1,
        &ProposalType::General,
        &String::from_str(&env, "Test Proposal"),
        &String::from_str(&env, "A test proposal"),
        &Vec::new(&env),
        &Map::new(&env),
        &Vec::new(&env),
        &Vec::new(&env),
        &0,
    );

    // Vote on proposal
    client.vote(&member1, &proposal_id, &true);

    // Fast forward time past voting period
    env.ledger().set_timestamp(4000); // Past the 3600 second voting period

    // Execute proposal
    client.execute_proposal(&member1, &proposal_id);

    let proposal = client.get_proposal(&proposal_id).unwrap();
    assert!(proposal.executed);
}

#[test]
fn test_member_management_proposal() {
    let env = Env::default();
    let (client, _, _, member1) = setup_dao(&env);

    let new_member = Address::generate(&env);

    // Create member management proposal
    let proposal_id = client.create_proposal(
        &member1,
        &ProposalType::MemberManagement,
        &String::from_str(&env, "Add Member"),
        &String::from_str(&env, "Add a new member to the DAO"),
        &Vec::new(&env),
        &Map::new(&env),
        &Vec::from_array(&env, [new_member.clone()]),
        &Vec::new(&env),
        &0,
    );

    // Vote and execute
    client.vote(&member1, &proposal_id, &true);
    env.ledger().set_timestamp(4000);
    client.execute_proposal(&member1, &proposal_id);

    // Check that new member was added
    assert!(client.is_member_view(&new_member));
}

#[test]
fn test_proposal_cancellation() {
    let env = Env::default();
    let (client, _, _, member1) = setup_dao(&env);

    // Create proposal
    let proposal_id = client.create_proposal(
        &member1,
        &ProposalType::General,
        &String::from_str(&env, "Test Proposal"),
        &String::from_str(&env, "A test proposal"),
        &Vec::new(&env),
        &Map::new(&env),
        &Vec::new(&env),
        &Vec::new(&env),
        &0,
    );

    // Cancel proposal
    client.cancel_proposal(&member1, &proposal_id);

    let proposal = client.get_proposal(&proposal_id).unwrap();
    assert!(proposal.cancelled);
}