//! Tests covering retry, timeout, and error mapping.

use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::Arc;
use std::time::Duration;

use async_trait::async_trait;

use crowdpass_soroban_client::transport::{
    InvocationRequest, InvocationResponse, MockTransport, Transport,
};
use crowdpass_soroban_client::{
    ClientError, ContractAddresses, ContractValue, RetryPolicy, RpcConfig, SorobanContractClient,
};

const EVENT_MANAGER: &str = "CRETRY";

struct CountingTransport {
    count: AtomicU32,
    fail_first: u32,
}

#[async_trait]
impl Transport for CountingTransport {
    async fn invoke(
        &self,
        _request: InvocationRequest,
    ) -> Result<InvocationResponse, ClientError> {
        let n = self.count.fetch_add(1, Ordering::SeqCst);
        if n < self.fail_first {
            Err(ClientError::Transport("transient".into()))
        } else {
            Ok(InvocationResponse::value(ContractValue::U32(99)))
        }
    }
}

#[tokio::test]
async fn retries_transient_failures() {
    let transport = Arc::new(CountingTransport {
        count: AtomicU32::new(0),
        fail_first: 2,
    });
    let client = SorobanContractClient::builder()
        .rpc(
            RpcConfig::new("https://rpc.example")
                .with_retry(RetryPolicy::new(
                    4,
                    Duration::from_millis(1),
                    Duration::from_millis(2),
                    2.0,
                )),
        )
        .contracts(
            ContractAddresses::builder()
                .event_manager(EVENT_MANAGER)
                .build(),
        )
        .transport(transport.clone())
        .build()
        .expect("client builds");

    let count = client
        .event_manager()
        .get_event_count()
        .await
        .expect("succeeds after retries");
    assert_eq!(count, 99);
    assert_eq!(transport.count.load(Ordering::SeqCst), 3);
}

#[tokio::test]
async fn returns_last_error_after_retry_exhaustion() {
    let transport = Arc::new(CountingTransport {
        count: AtomicU32::new(0),
        fail_first: 10,
    });
    let client = SorobanContractClient::builder()
        .rpc(
            RpcConfig::new("https://rpc.example")
                .with_retry(RetryPolicy::new(
                    2,
                    Duration::from_millis(1),
                    Duration::from_millis(1),
                    1.0,
                )),
        )
        .contracts(
            ContractAddresses::builder()
                .event_manager(EVENT_MANAGER)
                .build(),
        )
        .transport(transport)
        .build()
        .expect("client builds");

    let err = client
        .event_manager()
        .get_event_count()
        .await
        .expect_err("should give up");
    assert!(matches!(err, ClientError::Transport(_)));
}

#[tokio::test]
async fn timeout_reported_when_transport_hangs() {
    struct SlowTransport;

    #[async_trait]
    impl Transport for SlowTransport {
        async fn invoke(
            &self,
            _request: InvocationRequest,
        ) -> Result<InvocationResponse, ClientError> {
            tokio::time::sleep(Duration::from_millis(200)).await;
            Ok(InvocationResponse::void())
        }
    }

    let client = SorobanContractClient::builder()
        .rpc(
            RpcConfig::new("https://rpc.example")
                .with_timeout(Duration::from_millis(20))
                .with_retry(RetryPolicy::none()),
        )
        .contracts(
            ContractAddresses::builder()
                .event_manager(EVENT_MANAGER)
                .build(),
        )
        .transport(Arc::new(SlowTransport))
        .build()
        .expect("client builds");

    let err = client
        .event_manager()
        .get_event_count()
        .await
        .expect_err("times out");
    assert!(matches!(err, ClientError::Timeout { .. }));
}

#[tokio::test]
async fn non_retryable_errors_short_circuit() {
    let transport = Arc::new(MockTransport::new());
    let calls = Arc::new(AtomicU32::new(0));
    let calls_for_handler = calls.clone();
    transport.register(EVENT_MANAGER, "get_event_count", move |_| {
        calls_for_handler.fetch_add(1, Ordering::SeqCst);
        Err(ClientError::contract("event_manager", 99, "boom"))
    });

    let client = SorobanContractClient::builder()
        .rpc(
            RpcConfig::new("https://rpc.example")
                .with_retry(RetryPolicy::new(
                    5,
                    Duration::from_millis(1),
                    Duration::from_millis(1),
                    1.0,
                )),
        )
        .contracts(
            ContractAddresses::builder()
                .event_manager(EVENT_MANAGER)
                .build(),
        )
        .transport(transport)
        .build()
        .expect("client builds");

    let err = client
        .event_manager()
        .get_event_count()
        .await
        .expect_err("contract error");
    assert!(matches!(err, ClientError::Contract { code: 99, .. }));
    assert_eq!(calls.load(Ordering::SeqCst), 1);
}
