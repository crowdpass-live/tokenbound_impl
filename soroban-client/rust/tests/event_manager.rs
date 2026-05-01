//! Integration tests for the Event Manager wrapper using the in-memory
//! [`MockTransport`]. The mock acts as a local sandbox: it exercises the full
//! request/response codepath (encoding, dispatch, retry, decoding) without
//! requiring a live Soroban RPC.

use std::sync::Arc;

use crowdpass_soroban_client::transport::MockTransport;
use crowdpass_soroban_client::{
    ClientError, ContractAddresses, ContractValue, NetworkPassphrase, RpcConfig,
    SorobanContractClient, TierConfig,
};

const EVENT_MANAGER_ADDR: &str = "CEVT_MANAGER";
const TICKET_FACTORY_ADDR: &str = "CTICKET_FACTORY";
const ORGANIZER_ADDR: &str = "GORGANIZER";
const PAYMENT_TOKEN_ADDR: &str = "CPAYMENT_TOKEN";

fn build_client(transport: Arc<MockTransport>) -> SorobanContractClient {
    SorobanContractClient::builder()
        .rpc(RpcConfig::new("https://rpc.example"))
        .network_passphrase(NetworkPassphrase::testnet())
        .contracts(
            ContractAddresses::builder()
                .event_manager(EVENT_MANAGER_ADDR)
                .ticket_factory(TICKET_FACTORY_ADDR)
                .build(),
        )
        .transport(transport)
        .build()
        .expect("client builds")
}

#[tokio::test]
async fn get_event_count_round_trip() {
    let transport = Arc::new(MockTransport::new());
    transport.register(EVENT_MANAGER_ADDR, "get_event_count", |_| {
        Ok(crowdpass_soroban_client::InvocationResponse::value(
            ContractValue::U32(42),
        ))
    });

    let client = build_client(transport.clone());
    let count = client
        .event_manager()
        .get_event_count()
        .await
        .expect("count");
    assert_eq!(count, 42);

    let invocations = transport.invocations();
    assert_eq!(invocations.len(), 1);
    assert_eq!(invocations[0].method, "get_event_count");
    assert_eq!(invocations[0].contract_id.as_str(), EVENT_MANAGER_ADDR);
}

#[tokio::test]
async fn create_event_returns_event_id() {
    let transport = Arc::new(MockTransport::new());
    transport.register(EVENT_MANAGER_ADDR, "create_event", |req| {
        assert_eq!(req.args.len(), 8);
        Ok(crowdpass_soroban_client::InvocationResponse::value(
            ContractValue::U32(1),
        ))
    });

    let client = build_client(transport.clone());
    let id = client
        .event_manager()
        .create_event(
            ORGANIZER_ADDR,
            "Conf 2026",
            "conference",
            1_700_000_000,
            1_700_086_400,
            1_000_000,
            500,
            PAYMENT_TOKEN_ADDR,
        )
        .await
        .expect("create_event");
    assert_eq!(id, 1);
}

#[tokio::test]
async fn create_event_with_tiers_packages_args() {
    let transport = Arc::new(MockTransport::new());
    transport.register(EVENT_MANAGER_ADDR, "create_event_with_tiers", |req| {
        assert_eq!(req.args.len(), 1);
        let params = &req.args[0];
        let tiers = params
            .map_get("tiers")
            .and_then(ContractValue::as_vec)
            .expect("tiers vec");
        assert_eq!(tiers.len(), 2);
        let first_name = tiers[0]
            .map_get("name")
            .and_then(ContractValue::as_str)
            .expect("first tier name");
        assert_eq!(first_name, "VIP");
        Ok(crowdpass_soroban_client::InvocationResponse::value(
            ContractValue::U32(7),
        ))
    });

    let client = build_client(transport);
    let id = client
        .event_manager()
        .create_event_with_tiers(
            ORGANIZER_ADDR,
            "Multi tier",
            "concert",
            1,
            2,
            0,
            0,
            PAYMENT_TOKEN_ADDR,
            vec![
                TierConfig {
                    name: "VIP".into(),
                    price: 5_000_000,
                    total_quantity: 50,
                },
                TierConfig {
                    name: "GA".into(),
                    price: 1_000_000,
                    total_quantity: 200,
                },
            ],
        )
        .await
        .expect("create_event_with_tiers");
    assert_eq!(id, 7);
}

#[tokio::test]
async fn get_event_decodes_struct() {
    let transport = Arc::new(MockTransport::new());
    transport.register(EVENT_MANAGER_ADDR, "get_event", |req| {
        assert_eq!(req.args.len(), 1);
        let value = ContractValue::map([
            ("id", ContractValue::U32(1)),
            ("organizer", ContractValue::string(ORGANIZER_ADDR)),
            ("theme", ContractValue::string("Conf")),
            ("event_type", ContractValue::string("conference")),
            ("total_tickets", ContractValue::U128(500)),
            ("tickets_sold", ContractValue::U128(0)),
            ("ticket_price", ContractValue::I128(1_000_000)),
            ("start_date", ContractValue::U64(1_700_000_000)),
            ("end_date", ContractValue::U64(1_700_086_400)),
            ("is_canceled", ContractValue::Bool(false)),
            ("ticket_nft_addr", ContractValue::string("CTICKET_NFT_1")),
            ("payment_token", ContractValue::string(PAYMENT_TOKEN_ADDR)),
        ]);
        // The wrapper looks for an `Address` value via map_get(...).as_address().
        // Replace the string entries with proper Address values.
        let value = match value {
            ContractValue::Map(mut entries) => {
                for (k, v) in entries.iter_mut() {
                    if matches!(k.as_str(), "organizer" | "ticket_nft_addr" | "payment_token") {
                        if let ContractValue::String(s) = v.clone() {
                            *v = ContractValue::address(s);
                        }
                    }
                }
                ContractValue::Map(entries)
            }
            other => other,
        };
        Ok(crowdpass_soroban_client::InvocationResponse::value(value))
    });

    let client = build_client(transport);
    let event = client.event_manager().get_event(1).await.expect("event");
    assert_eq!(event.id, 1);
    assert_eq!(event.theme, "Conf");
    assert_eq!(event.organizer.as_str(), ORGANIZER_ADDR);
    assert_eq!(event.payment_token.as_str(), PAYMENT_TOKEN_ADDR);
    assert!(!event.is_canceled);
}

#[tokio::test]
async fn missing_address_returns_typed_error() {
    let transport = Arc::new(MockTransport::new());
    let client = SorobanContractClient::builder()
        .rpc(RpcConfig::new("https://rpc.example"))
        .transport(transport)
        .build()
        .expect("client builds");

    let err = client
        .event_manager()
        .get_event_count()
        .await
        .expect_err("missing address");
    assert!(matches!(
        err,
        ClientError::MissingField("contracts.event_manager")
    ));
}

#[tokio::test]
async fn handler_errors_surface_to_caller() {
    let transport = Arc::new(MockTransport::new());
    transport.register(EVENT_MANAGER_ADDR, "get_event", |_| {
        Err(ClientError::contract(
            "event_manager",
            2,
            "EventNotFound",
        ))
    });

    let client = build_client(transport);
    let err = client
        .event_manager()
        .get_event(99)
        .await
        .expect_err("not found");
    match err {
        ClientError::Contract { code, .. } => assert_eq!(code, 2),
        other => panic!("unexpected error: {other:?}"),
    }
}
