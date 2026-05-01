//! Integration tests for the Ticket Factory wrapper.

use std::sync::Arc;

use crowdpass_soroban_client::transport::MockTransport;
use crowdpass_soroban_client::{
    Address, ContractAddresses, ContractValue, InvocationResponse, RpcConfig,
    SorobanContractClient,
};

const FACTORY: &str = "CFACTORY";
const ADMIN: &str = "GADMIN";

fn build_client(transport: Arc<MockTransport>) -> SorobanContractClient {
    SorobanContractClient::builder()
        .rpc(RpcConfig::new("https://rpc.example"))
        .contracts(
            ContractAddresses::builder()
                .ticket_factory(FACTORY)
                .build(),
        )
        .transport(transport)
        .build()
        .expect("client builds")
}

#[tokio::test]
async fn deploy_ticket_returns_address() {
    let transport = Arc::new(MockTransport::new());
    transport.register(FACTORY, "deploy_ticket", |req| {
        assert_eq!(req.args.len(), 2);
        Ok(InvocationResponse::value(ContractValue::address(
            "CDEPLOYED",
        )))
    });

    let client = build_client(transport);
    let addr = client
        .ticket_factory()
        .deploy_ticket(ADMIN, [0xAA; 32])
        .await
        .expect("deploy");
    assert_eq!(addr.as_str(), "CDEPLOYED");
}

#[tokio::test]
async fn get_ticket_contract_handles_optional() {
    let transport = Arc::new(MockTransport::new());
    transport.register(FACTORY, "get_ticket_contract", |req| {
        let event_id = req.args[0].as_u32().unwrap();
        if event_id == 1 {
            Ok(InvocationResponse::value(ContractValue::Option(Some(
                Box::new(ContractValue::Address(Address::new("CTICKET_1"))),
            ))))
        } else {
            Ok(InvocationResponse::value(ContractValue::Option(None)))
        }
    });

    let client = build_client(transport);
    let found = client.ticket_factory().get_ticket_contract(1).await.unwrap();
    assert_eq!(found.unwrap().as_str(), "CTICKET_1");
    let missing = client.ticket_factory().get_ticket_contract(2).await.unwrap();
    assert!(missing.is_none());
}

#[tokio::test]
async fn total_tickets_round_trip() {
    let transport = Arc::new(MockTransport::new());
    transport.register(FACTORY, "get_total_tickets", |_| {
        Ok(InvocationResponse::value(ContractValue::U32(9)))
    });
    let client = build_client(transport);
    let total = client.ticket_factory().get_total_tickets().await.unwrap();
    assert_eq!(total, 9);
}
