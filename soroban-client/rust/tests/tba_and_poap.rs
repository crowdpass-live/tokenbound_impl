//! Cross-cutting integration tests covering TBA registry, TBA account,
//! ticket NFT, and POAP NFT wrappers.

use std::sync::Arc;

use crowdpass_soroban_client::transport::MockTransport;
use crowdpass_soroban_client::{
    Address, ContractAddresses, ContractValue, InvocationResponse, PoapMetadata, RpcConfig,
    SorobanContractClient,
};

const TBA_REGISTRY: &str = "CTBAREG";
const TICKET_NFT: &str = "CTICKETNFT";
const TBA_ACCOUNT: &str = "CTBAACC";
const POAP: &str = "CPOAP";
const OWNER: &str = "GOWNER";

fn build_client(transport: Arc<MockTransport>) -> SorobanContractClient {
    SorobanContractClient::builder()
        .rpc(RpcConfig::new("https://rpc.example"))
        .contracts(
            ContractAddresses::builder()
                .tba_registry(TBA_REGISTRY)
                .ticket_nft(TICKET_NFT)
                .poap_nft(POAP)
                .build(),
        )
        .transport(transport)
        .build()
        .expect("client builds")
}

#[tokio::test]
async fn tba_registry_get_account_returns_address() {
    let transport = Arc::new(MockTransport::new());
    transport.register(TBA_REGISTRY, "get_account", |req| {
        assert_eq!(req.args.len(), 4);
        Ok(InvocationResponse::value(ContractValue::Address(
            Address::new(TBA_ACCOUNT),
        )))
    });

    let client = build_client(transport);
    let addr = client
        .tba_registry()
        .get_account([0xAB; 32], TICKET_NFT, 1, [0xCD; 32])
        .await
        .expect("get_account");
    assert_eq!(addr.as_str(), TBA_ACCOUNT);
}

#[tokio::test]
async fn tba_account_owner_round_trip() {
    let transport = Arc::new(MockTransport::new());
    transport.register(TBA_ACCOUNT, "owner", |_| {
        Ok(InvocationResponse::value(ContractValue::Address(
            Address::new(OWNER),
        )))
    });

    let client = build_client(transport);
    let owner = client
        .tba_account(TBA_ACCOUNT)
        .owner()
        .await
        .expect("owner");
    assert_eq!(owner.as_str(), OWNER);
}

#[tokio::test]
async fn ticket_nft_balance_and_owner() {
    let transport = Arc::new(MockTransport::new());
    transport.register(TICKET_NFT, "balance_of", |_| {
        Ok(InvocationResponse::value(ContractValue::U128(1)))
    });
    transport.register(TICKET_NFT, "owner_of", |_| {
        Ok(InvocationResponse::value(ContractValue::Address(
            Address::new(OWNER),
        )))
    });
    transport.register(TICKET_NFT, "get_metadata", |_| {
        Ok(InvocationResponse::value(ContractValue::map([
            ("name", ContractValue::string("VIP Pass")),
            ("description", ContractValue::string("Front row")),
            ("image", ContractValue::string("ipfs://image")),
            ("event_id", ContractValue::U32(1)),
            ("tier", ContractValue::string("VIP")),
        ])))
    });

    let client = build_client(transport);
    let nft = client.default_ticket_nft().expect("ticket nft client");
    assert_eq!(nft.balance_of(OWNER).await.unwrap(), 1);
    assert_eq!(nft.owner_of(1).await.unwrap().as_str(), OWNER);
    let md = nft.get_metadata(1).await.unwrap();
    assert_eq!(md.name, "VIP Pass");
    assert_eq!(md.tier, "VIP");
    assert_eq!(md.event_id, 1);
}

#[tokio::test]
async fn poap_mint_round_trip() {
    let transport = Arc::new(MockTransport::new());
    transport.register(POAP, "mint_poap", |req| {
        assert_eq!(req.args.len(), 2);
        let metadata = &req.args[1];
        assert_eq!(metadata.map_get("event_id").and_then(ContractValue::as_u32), Some(1));
        Ok(InvocationResponse::value(ContractValue::U128(42)))
    });

    let client = build_client(transport);
    let token_id = client
        .poap_nft()
        .mint_poap(
            OWNER,
            PoapMetadata {
                event_id: 1,
                name: "Conf 26".into(),
                description: "Attended".into(),
                image: "ipfs://badge".into(),
                issued_at: 1_700_000_000,
            },
        )
        .await
        .expect("mint_poap");
    assert_eq!(token_id, 42);
}
