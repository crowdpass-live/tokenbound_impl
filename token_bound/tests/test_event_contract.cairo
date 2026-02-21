use starknet::ContractAddress;
use snforge_std::{
    declare, start_cheat_caller_address, stop_cheat_caller_address, start_cheat_block_number,
    start_cheat_block_timestamp, ContractClassTrait
};
use core::traits::{TryInto, Into};

use openzeppelin::tests::mocks::DualCaseERC20Mock;

use token_bound::ticket_nft::TicketNFT;
use token_bound::ticket_factory::{TicketFactory, ITicketFactory};
use token_bound::event_contract::EventContract;
use token_bound::event_contract::Events;
use token_bound::event_contract::{
    IEventContractDispatcher, IEventContractDispatcherTrait
};

const TOKEN_ADDRESS: felt252 = 'TOKEN_ADDRESS';
const TICKET_FACTORY_ADDRESS: felt252 = 'TICKET_FACTORY_ADDRESS';
const USER1: felt252 = 'USER1';

// Deploys a contract and returns its address.
pub fn deploy_contract(name: ByteArray) -> ContractAddress {
    let contract = declare(name).unwrap();
    let (contract_address, _) = contract.deploy(@array![]).unwrap();
    contract_address
}

// *************************************************************************
//                              SETUP 
// *************************************************************************
fn __setup__() -> (ContractAddress, ContractAddress, felt252) {
    // Deploy ERC20 contract
    let erc20_contract_address = deploy_contract("DualCaseERC20Mock");
    
    // Declare ticket NFT
    let ticket_nft_class_hash = declare("TicketNFT").unwrap();

    // Deploy ticket NFT factory
    let ticket_factory_contract_address = deploy_contract("TicketFactory");

    // Deploy event contract
    let event_contract = declare("EventContract").unwrap();
    let mut event_contract_constructor_calldata = array![];
    let (event_contract_address, _) = event_contract
        .deploy(@event_contract_constructor_calldata)
        .unwrap();

    return (
        event_contract_address,
        ticket_factory_contract_address,
        ticket_nft_class_hash.class_hash.into()
    );
}

#[test]
fn test_create_event() {
    let (event_contract_address, _, _) = __setup__();

    let event_contract_dispatcher = IEventContractDispatcher {
        contract_address: event_contract_address
    };

    start_cheat_caller_address(
        event_contract_address, USER1.try_into().unwrap()
    );

    event_contract_dispatcher
        .create_event(
            'Event 1'.into(),
            USER1.try_into().unwrap(),
            'Virtual'.into(),
            1721764952,
            1721937394,
            1,
        );

    // Check if the event was created
    let event_count = event_contract_dispatcher.get_event_count();

    assert(event_count > 0, 'No event was created');

    // Check event organizer
    // let event_instance: Events = event_contract_dispatcher.get_event(1);

    // assert(event_instance.organizer == USER1.try_into().unwrap(), 'Event organizer is incorrect');
}

// *************************************************************************
//                   RESCHEDULE EVENT TESTS (issue #19)
// *************************************************************************

#[test]
fn test_reschedule_future_event_succeeds() {
    let (event_contract_address, _, _) = __setup__();

    let event_contract_dispatcher = IEventContractDispatcher {
        contract_address: event_contract_address
    };

    start_cheat_caller_address(event_contract_address, USER1.try_into().unwrap());

    // Pin block timestamp to 1000 so the event's end_date (5000) is in the future
    start_cheat_block_timestamp(event_contract_address, 1000);

    event_contract_dispatcher
        .create_event(
            'Future Event',
            'Virtual',
            500_u64,    // start_date  (before block timestamp, irrelevant here)
            5000_u64,   // end_date    (> block timestamp 1000 → event still active)
            10_u256,
            100_u256,
        );

    // Rescheduling must succeed because end_date (5000) > block_timestamp (1000)
    event_contract_dispatcher.reschedule_event(1, 600_u64, 6000_u64);

    let event_instance = event_contract_dispatcher.get_event(1);
    assert(event_instance.start_date == 600_u64, 'start_date not updated');
    assert(event_instance.end_date == 6000_u64, 'end_date not updated');

    stop_cheat_caller_address(event_contract_address);
}

#[test]
#[should_panic(expected: ('event has ended',))]
fn test_reschedule_ended_event_fails() {
    let (event_contract_address, _, _) = __setup__();

    let event_contract_dispatcher = IEventContractDispatcher {
        contract_address: event_contract_address
    };

    start_cheat_caller_address(event_contract_address, USER1.try_into().unwrap());

    // Create event while timestamp is still before its end_date
    start_cheat_block_timestamp(event_contract_address, 1000);

    event_contract_dispatcher
        .create_event(
            'Past Event',
            'Virtual',
            500_u64,
            2000_u64,   // end_date
            10_u256,
            100_u256,
        );

    // Advance block timestamp past the event's end_date
    start_cheat_block_timestamp(event_contract_address, 3000);

    // Rescheduling must revert because end_date (2000) < block_timestamp (3000)
    event_contract_dispatcher.reschedule_event(1, 4000_u64, 5000_u64);

    stop_cheat_caller_address(event_contract_address);
}

// #[test]
// fn test_create_ticket() {
//     let (event_contract_address, ticket_factory_contract_address, ticket_nft_class_hash) = __setup__();

//     let event_contract_dispatcher = IEventContractDispatcher {
//         contract_address: event_contract_address
//     };

//     let ticket_factory_dispatcher = ITicketFactory {
//         contract_address: ticket_factory_contract_address
//     };

//     start_cheat_caller_address(
//         USER1.try_into().unwrap(), 1234.try_into().unwrap()
//     );
//     start_cheat_block_number(USER1.try_into().unwrap(), 234);
//     start_cheat_block_timestamp(USER1.try_into().unwrap(), 123);

//     event_contract_dispatcher
//         .create_event(
//             'Event 1',
//             USER1.try_into().unwrap(),
//             'Virtual',
//             1721764952,
//             1721937394,
//             1,
//         );

//     let event_instance: Events = event_contract_dispatcher.get_event(1);

//     ticket_factory_dispatcher
//         .create_ticket(
//             event_instance.id
