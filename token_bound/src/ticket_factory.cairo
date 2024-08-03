// SPDX-License-Identifier: MIT
pub use starknet::{
    ContractAddress, class_hash::ClassHash, syscalls::deploy_syscall, SyscallResultTrait
};

#[starknet::interface]
pub trait ITicketFactory<TContractState> {
    fn deploy_ticket(
        ref self: TContractState, pauser: ContractAddress, minter: ContractAddress, salt: felt252
    ) -> ContractAddress;
}

#[starknet::contract]
pub mod TicketFactory {
    use super::ITicketFactory;
    use starknet::{
        ContractAddress, class_hash::ClassHash, syscalls::deploy_syscall, SyscallResultTrait
    };
    use core::traits::{TryInto, Into};

    const TICKET_NFT_CLASS_HASH: felt252 =
        0x886588a25b1a80e0fbf1d625c24f3d4a337ba7f50e9027d889e68215672986;

    // storage
    #[storage]
    struct Storage {
        ticket_count: u32,
        tickets: LegacyMap::<u32, ContractAddress>,
    }

    #[abi(embed_v0)]
    impl TicketFactoryImpl of ITicketFactory<ContractState> {
        fn deploy_ticket(
            ref self: ContractState, pauser: ContractAddress, minter: ContractAddress, salt: felt252
        ) -> ContractAddress {
            let _ticket_count = self.ticket_count.read() + 1;

            // formatting constructor arguments
            let mut constructor_calldata: Array<felt252> = array![pauser.into(), minter.into()];
            // deploying the contract
            let class_hash: ClassHash = TICKET_NFT_CLASS_HASH.try_into().unwrap();
            let result = deploy_syscall(class_hash, salt, constructor_calldata.span(), true);
            let (ticket_address, _) = result.unwrap_syscall();

            self.tickets.write(_ticket_count, ticket_address);

            self.ticket_count.write(_ticket_count);

            ticket_address
        }
    }
}
