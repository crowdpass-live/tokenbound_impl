#![cfg(test)]

//! Fuzz tests for the DAO Governance contract.
//!
//! Property-based testing ensures that invariants like proposal integrity,
//! voting rules, and member management hold under random operations.

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, IntoVal, String, Symbol, Vec, Map};
use proptest::prelude::*;

fn setup_fuzz(env: &Env) -> (DaoGovernanceClient<'_>, Address, Address) {
    env.mock_all_auths();

    let admin = Address::generate(env);
    let voting_token = Address::generate(env);

    let contract_id = env.register(DaoGovernance, ());
    let client = DaoGovernanceClient::new(env, &contract_id);

    // Initialize DAO with minimal config for fuzzing
    let config = DaoConfig {
        voting_token: voting_token.clone(),
        voting_period: 3600,
        execution_delay: 0, // No delay for faster testing
        quorum_percentage: 1, // Low quorum for testing
        proposal_threshold: 1, // Low threshold
        max_members: 100,
    };

    client.initialize(&admin, &config);

    (client, admin, voting_token)
}

proptest! {
    #![proptest_config(ProptestConfig::with_cases(25))]

    #[test]
    fn fuzz_proposal_lifecycle(
        title in "[a-zA-Z0-9 ]{1,100}",
        description in "[a-zA-Z0-9 ]{1,500}",
        voting_period in 60..86400u64, // 1 minute to 1 day
    ) {
        let env = Env::default();
        let (client, admin, _) = setup_fuzz(&env);

        // Add a member
        let member = Address::generate(&env);
        client.add_member(&member);

        // Create proposal
        let proposal_id = client.create_proposal(
            &member,
            &ProposalType::General,
            &String::from_str(&env, &title),
            &String::from_str(&env, &description),
            &Vec::new(&env),
            &Map::new(&env),
            &Vec::new(&env),
            &Vec::new(&env),
            &0,
        );

        // Verify proposal exists
        let proposal = client.get_proposal(&proposal_id).unwrap();
        assert_eq!(proposal.title, String::from_str(&env, &title));
        assert_eq!(proposal.proposer, member);
        assert!(!proposal.executed);
        assert!(!proposal.cancelled);

        // Vote on proposal
        client.vote(&member, &proposal_id, &true);

        // Fast forward past voting period
        env.ledger().set_timestamp(voting_period + 100);

        // Execute proposal
        client.execute_proposal(&member, &proposal_id);

        // Verify execution
        let executed_proposal = client.get_proposal(&proposal_id).unwrap();
        assert!(executed_proposal.executed);
    }

    #[test]
    fn fuzz_member_management(
        num_members in 1..20usize,
    ) {
        let env = Env::default();
        let (client, admin, _) = setup_fuzz(&env);

        let mut members = Vec::new(&env);

        // Add members
        for _ in 0..num_members {
            let member = Address::generate(&env);
            client.add_member(&member);
            members.push_back(member);
        }

        // Verify all members were added
        let all_members = client.get_members();
        assert_eq!(all_members.len() as usize, num_members);

        for member in members.iter() {
            assert!(client.is_member_view(&member));
        }

        // Remove half the members via proposal
        let remove_count = num_members / 2;
        let mut to_remove = Vec::new(&env);
        for i in 0..remove_count {
            to_remove.push_back(members.get(i).unwrap());
        }

        // Create member removal proposal
        let proposal_id = client.create_proposal(
            &members.get(0).unwrap(),
            &ProposalType::MemberManagement,
            &String::from_str(&env, "Remove Members"),
            &String::from_str(&env, "Remove some members"),
            &Vec::new(&env),
            &Map::new(&env),
            &Vec::new(&env),
            &to_remove,
            &0,
        );

        // Vote and execute
        client.vote(&members.get(0).unwrap(), &proposal_id, &true);
        env.ledger().set_timestamp(3700);
        client.execute_proposal(&members.get(0).unwrap(), &proposal_id);

        // Verify members were removed
        let remaining_members = client.get_members();
        assert_eq!(remaining_members.len() as usize, num_members - remove_count);
    }

    #[test]
    fn fuzz_voting_scenarios(
        num_voters in 1..10usize,
        votes_for in 0..10usize,
    ) {
        let env = Env::default();
        let (client, admin, _) = setup_fuzz(&env);

        // Add voters
        let mut voters = Vec::new(&env);
        for _ in 0..num_voters {
            let voter = Address::generate(&env);
            client.add_member(&voter);
            voters.push_back(voter);
        }

        // Create proposal
        let proposal_id = client.create_proposal(
            &voters.get(0).unwrap(),
            &ProposalType::General,
            &String::from_str(&env, "Test Voting"),
            &String::from_str(&env, "Test various voting scenarios"),
            &Vec::new(&env),
            &Map::new(&env),
            &Vec::new(&env),
            &Vec::new(&env),
            &0,
        );

        // Cast votes
        let actual_votes_for = votes_for.min(num_voters);
        for i in 0..actual_votes_for {
            client.vote(&voters.get(i).unwrap(), &proposal_id, &true);
        }

        for i in actual_votes_for..num_voters {
            client.vote(&voters.get(i).unwrap(), &proposal_id, &false);
        }

        // Verify vote counts
        let votes = client.get_proposal_votes(&proposal_id);
        assert_eq!(votes.len() as usize, num_voters);

        let mut for_count = 0;
        let mut against_count = 0;
        for vote in votes.values() {
            if vote.in_favor {
                for_count += 1;
            } else {
                against_count += 1;
            }
        }

        assert_eq!(for_count, actual_votes_for as u32);
        assert_eq!(against_count, (num_voters - actual_votes_for) as u32);
    }
}