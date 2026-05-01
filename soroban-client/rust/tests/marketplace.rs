//! Integration tests for the Marketplace wrapper.

use std::sync::Arc;

use crowdpass_soroban_client::transport::MockTransport;
use crowdpass_soroban_client::{
    Address, ContractAddresses, ContractValue, InvocationResponse, RpcConfig,
    SorobanContractClient,
};

const MARKETPLACE: &str = "CMARKETPLACE";
const TICKET_NFT: &str = "CTICKET_NFT";
const SELLER: &str = "GSELLER";
const BUYER: &str = "GBUYER";

fn build_client(transport: Arc<MockTransport>) -> SorobanContractClient {
    SorobanContractClient::builder()
        .rpc(RpcConfig::new("https://rpc.example"))
        .contracts(
            ContractAddresses::builder()
                .marketplace(MARKETPLACE)
                .build(),
        )
        .transport(transport)
        .build()
        .expect("client builds")
}

fn listing_value(active: bool) -> ContractValue {
    ContractValue::map([
        ("seller", ContractValue::Address(Address::new(SELLER))),
        (
            "ticket_contract",
            ContractValue::Address(Address::new(TICKET_NFT)),
        ),
        ("token_id", ContractValue::I128(1)),
        ("price", ContractValue::I128(2_500_000)),
        ("active", ContractValue::Bool(active)),
        ("created_at", ContractValue::U64(1_700_000_000)),
    ])
}

#[tokio::test]
async fn create_listing_returns_id() {
    let transport = Arc::new(MockTransport::new());
    transport.register(MARKETPLACE, "create_listing", |req| {
        assert_eq!(req.args.len(), 4);
        Ok(InvocationResponse::value(ContractValue::U32(0)))
    });

    let client = build_client(transport);
    let id = client
        .marketplace()
        .create_listing(SELLER, TICKET_NFT, 1, 2_500_000)
        .await
        .expect("listing id");
    assert_eq!(id, 0);
}

#[tokio::test]
async fn get_listing_decodes_optional() {
    let transport = Arc::new(MockTransport::new());
    transport.register(MARKETPLACE, "get_listing", |req| {
        if req.args[0].as_u32() == Some(0) {
            Ok(InvocationResponse::value(ContractValue::Option(Some(
                Box::new(listing_value(true)),
            ))))
        } else {
            Ok(InvocationResponse::value(ContractValue::Option(None)))
        }
    });

    let client = build_client(transport);
    let listing = client.marketplace().get_listing(0).await.unwrap().unwrap();
    assert!(listing.active);
    assert_eq!(listing.price, 2_500_000);
    assert_eq!(listing.seller.as_str(), SELLER);

    let missing = client.marketplace().get_listing(99).await.unwrap();
    assert!(missing.is_none());
}

#[tokio::test]
async fn get_active_listings_decodes_vec() {
    let transport = Arc::new(MockTransport::new());
    transport.register(MARKETPLACE, "get_active_listings", |_| {
        Ok(InvocationResponse::value(ContractValue::Vec(vec![
            listing_value(true),
            listing_value(true),
        ])))
    });

    let client = build_client(transport);
    let listings = client
        .marketplace()
        .get_active_listings(0, 10)
        .await
        .unwrap();
    assert_eq!(listings.len(), 2);
}

#[tokio::test]
async fn purchase_ticket_dispatches_submit() {
    let transport = Arc::new(MockTransport::new());
    transport.register(MARKETPLACE, "purchase_ticket", |req| {
        assert_eq!(req.args.len(), 2);
        assert_eq!(req.args[1].as_u32(), Some(0));
        Ok(InvocationResponse::void())
    });

    let client = build_client(transport.clone());
    client
        .marketplace()
        .purchase_ticket(BUYER, 0)
        .await
        .expect("purchase");
    let invocations = transport.invocations();
    assert_eq!(invocations.len(), 1);
    assert!(matches!(
        invocations[0].kind,
        crowdpass_soroban_client::transport::InvocationKind::Submit
    ));
}
