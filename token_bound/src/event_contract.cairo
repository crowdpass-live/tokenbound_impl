use starknet::{ContractAddress};

#[starknet::interface]
pub trait IEventContract<TContractState> {
    fn create_event(
        ref self: TContractState,
        _theme: felt252,
        _event_type: felt252,
        _start_date: u64,
        _end_date: u64,
        _ticket_price: u256,
        _total_tickets: u256
    ) -> bool;
    fn reschedule_event(ref self: TContractState, _event_id: u32, _start_date: u64, _end_date: u64);
    fn cancel_event(ref self: TContractState, _event_id: u32);
    fn purchase_ticket(ref self: TContractState, _event_id: u32);
    // fn resale_ticket (ref self : TContractState, event_id: u32) -> bool;
    fn claim_ticket_refund(ref self: TContractState, _event_id: u32);
    fn get_event(self: @TContractState, _event_id: u32) -> Events;
    fn get_event_count(self: @TContractState) -> u32;
    fn user_event_ticket (self: @TContractState, _event_id: u32, _user: ContractAddress) -> u256;
}

#[derive(Drop, Serde, starknet::Store)]
pub struct Events {
    id: u32,
    theme: felt252,
    organizer: ContractAddress,
    event_type: felt252,
    total_tickets: u256,
    tickets_sold: u256,
    ticket_price: u256,
    start_date: u64,
    end_date: u64,
    is_canceled: bool,
    event_ticket_addr: ContractAddress
}

#[starknet::contract]
pub mod EventContract {
    use core::option::OptionTrait;
use core::{traits::{TryInto, Into}, num::traits::zero::Zero};
    use super::{Events, IEventContract};
    use starknet::{get_caller_address, ContractAddress, get_block_timestamp, get_contract_address};

    use token_bound::{
        erc20_interface::{IERC20Dispatcher, IERC20DispatcherTrait},
        erc721_interface::{IERC721Dispatcher, IERC721DispatcherTrait},
        ticket_factory::{ITicketFactoryDispatcher, ITicketFactoryDispatcherTrait},
        tba_registry_interface::{IRegistryDispatcher, IRegistryDispatcherTrait, IRegistryLibraryDispatcher}
    };

    // events
    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        EventCreated: EventCreated,
        EventRescheduled: EventRescheduled,
        EventCanceled: EventCanceled,
        TicketPurchased: TicketPurchased,
        TicketRecliamed: TicketRecliamed
    }

    #[derive(Drop, starknet::Event)]
    struct EventCreated {
        id: u32,
        organizer: ContractAddress
    }

    #[derive(Drop, starknet::Event)]
    struct EventRescheduled {
        id: u32,
        start_date: u64,
        end_date: u64
    }

    #[derive(Drop, starknet::Event)]
    struct EventCanceled {
        id: u32,
        is_canceled: bool
    }

    #[derive(Drop, starknet::Event)]
    struct TicketPurchased {
        event_id: u32,
        buyer: ContractAddress,
        amount: u256
    }

    #[derive(Drop, starknet::Event)]
    struct TicketRecliamed {
        event_id: u32,
        tba_acct: ContractAddress,
        amount: u256
    }

    // storage
    #[storage]
    struct Storage {
        event_count: u32,
        events: LegacyMap::<u32, Events>,
        token_address: ContractAddress,
        ticket_factory_address: ContractAddress,
        tba_address: ContractAddress,
        event_ticket_count: LegacyMap::<ContractAddress, u256>,
        user_event_token_id: LegacyMap::<(u32, ContractAddress), u256>,
        user_has_claim_refund: LegacyMap::<(u32, ContractAddress), bool>
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        _token_address: ContractAddress,
        _ticket_factory_address: ContractAddress,
        _tba_address: ContractAddress
    ) {
        self.token_address.write(_token_address);
        self.ticket_factory_address.write(_ticket_factory_address);
        self.tba_address.write(_tba_address);
    }

    // implementions and functions
    #[abi(embed_v0)]
    impl EventContractImpl of IEventContract<ContractState> {
        fn create_event(
            ref self: ContractState,
            _theme: felt252,
            _event_type: felt252,
            _start_date: u64,
            _end_date: u64,
            _ticket_price: u256,
            _total_tickets: u256
        ) -> bool {
            let caller = get_caller_address();
            let _event_count = self.event_count.read() + 1;
            let address_this = get_contract_address();

            // assert not zero ContractAddress
            assert(caller.is_non_zero(), token_bound::errors::Errors::ZERO_ADDRESS_CALLER);

            // deploy tickets contract here
            let ticket_factory = ITicketFactoryDispatcher {
                contract_address: self.ticket_factory_address.read()
            };

            let _event_ticket_addr = ticket_factory
                .deploy_ticket(caller, address_this, _event_count.into());

            // new event struct instance
            let event_instance = Events {
                id: _event_count,
                theme: _theme.into(),
                organizer: caller,
                event_type: _event_type,
                total_tickets: _total_tickets,
                tickets_sold: 0,
                ticket_price: _ticket_price,
                start_date: _start_date,
                end_date: _end_date,
                is_canceled: false,
                event_ticket_addr: _event_ticket_addr
            };

            // map event_id to new_event
            self.events.write(_event_count, event_instance);

            // update event count
            self.event_count.write(_event_count);

            // emit event for event creation
            self.emit(EventCreated { id: _event_count, organizer: caller });

            true
        }

        fn reschedule_event(
            ref self: ContractState, _event_id: u32, _start_date: u64, _end_date: u64
        ) {
            let caller = get_caller_address();
            let _event_count = self.event_count.read();
            let _organizer = self.events.read(_event_id).organizer;
            let event_instance = self.events.read(_event_id);

            assert(_event_id <= _event_count, token_bound::errors::Errors::NOT_CREATED);

            // assert not zeroAddr caller
            assert(caller.is_non_zero(), token_bound::errors::Errors::ZERO_ADDRESS_CALLER);

            // assert caller is event organizer
            assert(caller == _organizer, token_bound::errors::Errors::NOT_ORGANIZER);

            // assert event has not ended
            assert(
                event_instance.end_date < get_block_timestamp(),
                token_bound::errors::Errors::EVENT_ENDED
            );

            // reschedule event here
            self
                .events
                .write(
                    _event_id,
                    Events {
                        id: event_instance.id,
                        theme: event_instance.theme,
                        organizer: event_instance.organizer,
                        event_type: event_instance.event_type,
                        total_tickets: event_instance.total_tickets,
                        tickets_sold: event_instance.tickets_sold,
                        ticket_price: event_instance.ticket_price,
                        start_date: _start_date,
                        end_date: _end_date,
                        is_canceled: false,
                        event_ticket_addr: event_instance.event_ticket_addr
                    }
                );

            self
                .emit(
                    EventRescheduled { id: _event_id, start_date: _start_date, end_date: _end_date }
                );
        }

        fn cancel_event(ref self: ContractState, _event_id: u32) {
            let caller = get_caller_address();
            let _event_count = self.event_count.read();
            let _organizer = self.events.read(_event_id).organizer;
            let event_instance = self.events.read(_event_id);

            assert(_event_id <= _event_count, token_bound::errors::Errors::NOT_CREATED);

            // assert not zeroAddr caller
            assert(caller.is_non_zero(), token_bound::errors::Errors::ZERO_ADDRESS_CALLER);

            // assert caller is event organizer
            assert(caller == _organizer, token_bound::errors::Errors::NOT_ORGANIZER);

            // assert event has not ended
            assert(
                event_instance.end_date > get_block_timestamp(),
                token_bound::errors::Errors::EVENT_ENDED
            );

            // cancel event here
            self
                .events
                .write(
                    _event_id,
                    Events {
                        id: event_instance.id,
                        theme: event_instance.theme,
                        organizer: event_instance.organizer,
                        event_type: event_instance.event_type,
                        total_tickets: event_instance.total_tickets,
                        tickets_sold: event_instance.tickets_sold,
                        ticket_price: event_instance.ticket_price,
                        start_date: event_instance.start_date,
                        end_date: event_instance.end_date,
                        is_canceled: true,
                        event_ticket_addr: event_instance.event_ticket_addr
                    }
                );

            self.emit(EventCanceled { id: _event_id, is_canceled: event_instance.is_canceled })
        }

        fn purchase_ticket(ref self: ContractState, _event_id: u32) {
            let caller = get_caller_address();
            let _event_count = self.event_count.read();
            let address_this = get_contract_address();

            let event_instance = self.events.read(_event_id);

            let strk_erc20_contract = IERC20Dispatcher {
                contract_address: self.token_address.read()
            };

            // assert caler is nit addr 0
            assert(caller.is_non_zero(), token_bound::errors::Errors::ZERO_ADDRESS_CALLER);

            // assert is_valid event
            assert(_event_id <= _event_count, token_bound::errors::Errors::NOT_CREATED);

            // verify if token caller has enough strk for the ticket_price
            assert(
                strk_erc20_contract.balance_of(caller) >= event_instance.ticket_price,
                token_bound::errors::Errors::INSUFFICIENT_AMOUNT
            );

            let event_ticket_price: u256 = event_instance.ticket_price;

            // approve transfer of strk from caller to smart contract
            // strk_erc20_contract.approve(address_this, event_ticket_price);

            // transfer strk from callers address to  smart contract
            strk_erc20_contract.transfer_from(caller, address_this, event_ticket_price);

            // mint the nft ticket to the user
            let event_ticket_address = event_instance.event_ticket_addr;

            let ticket_nft = IERC721Dispatcher { contract_address: event_ticket_address };

            ticket_nft.mint_ticket_nft(caller);

            // update tickets sold
            let _tickets_sold = event_instance.tickets_sold + 1;

            // update legacymap with user token_id
            self.user_event_token_id.write((_event_id, caller), _tickets_sold);

            // increase ticket_sold count from event instance
            self
                .events
                .write(
                    _event_id,
                    Events {
                        id: event_instance.id,
                        theme: event_instance.theme,
                        organizer: event_instance.organizer,
                        event_type: event_instance.event_type,
                        total_tickets: event_instance.total_tickets,
                        tickets_sold: _tickets_sold,
                        ticket_price: event_instance.ticket_price,
                        start_date: event_instance.start_date,
                        end_date: event_instance.end_date,
                        is_canceled: event_instance.is_canceled,
                        event_ticket_addr: event_instance.event_ticket_addr
                    }
                );

            // emit event for ticket purchase
            self
                .emit(
                    TicketPurchased {
                        event_id: _event_id, buyer: caller, amount: event_instance.ticket_price
                    }
                );
        }

        fn claim_ticket_refund(ref self: ContractState, _event_id: u32) {
            let caller = get_caller_address();
            let _event_count = self.event_count.read();
            // let address_this = get_contract_address();

            let event_instance = self.events.read(_event_id);

            let strk_erc20_contract = IERC20Dispatcher {
                contract_address: self.token_address.read()
            };

            let acct_impl_hash: felt252 =
                0x45d67b8590561c9b54e14dd309c9f38c4e2c554dd59414021f9d079811621bd;

            let ticket_nft = IERC721Dispatcher {
                contract_address: event_instance.event_ticket_addr
            };

            // let tba_contract = IRegistryDispatcher { contract_address: self.tba_address.read() };

            let impl_hash: felt252 =
            0x46163525551f5a50ed027548e86e1ad023c44e0eeb0733f0dab2fb1fdc31ed0;

            let tba = IRegistryLibraryDispatcher {class_hash: impl_hash.try_into().unwrap()};

            let user_token_id = self
                .user_event_token_id
                .read((_event_id, caller));

            // assert caler is not addr 0
            assert(caller.is_non_zero(), token_bound::errors::Errors::ZERO_ADDRESS_CALLER);

            // assert is_valid event
            assert(_event_id <= _event_count, token_bound::errors::Errors::NOT_CREATED);

            // assert if event is is_canceled
            assert(
                event_instance.is_canceled == true, token_bound::errors::Errors::EVENT_NOT_CANCELED
            );

            // confirm if caller is a ticket holder
            assert(
                ticket_nft.balance_of(caller) > 0, token_bound::errors::Errors::NOT_TICKET_HOLDER
            );

            // confirm if caller is the nft owner
            assert(
                ticket_nft.owner_of(user_token_id) == caller,
                token_bound::errors::Errors::NOT_TICKET_OWNER
            );

            // let _salt: felt252 = '3000000000';
            // get users tba account
            let tba_acct = tba
                .create_account(
                    acct_impl_hash, event_instance.event_ticket_addr, user_token_id, user_token_id.try_into().unwrap()
                );

            // confirm if user has been refunded
            assert(
                self.user_has_claim_refund.read((_event_id, tba_acct)) == false,
                token_bound::errors::Errors::REFUND_CLIAMED
            );

            // refund user
            strk_erc20_contract.transfer(tba_acct, event_instance.ticket_price);

            // update the refund map
            self.user_has_claim_refund.write((_event_id, tba_acct), true);

            // emit the event for ticket recliam
            self
                .emit(
                    TicketRecliamed {
                        event_id: _event_id, tba_acct: tba_acct, amount: event_instance.ticket_price
                    }
                );
        }

        // view functions
        fn get_event_count(self: @ContractState) -> u32 {
            self.event_count.read()
        }

        fn get_event(self: @ContractState, _event_id: u32) -> Events {
            self.events.read(_event_id)
        }

        fn user_event_ticket (self: @ContractState, _event_id: u32, _user: ContractAddress) -> u256 {
            self.user_event_token_id.read((_event_id, _user))
        }
    }

    #[generate_trait]
    impl Private of PrivateTrait {}
}
