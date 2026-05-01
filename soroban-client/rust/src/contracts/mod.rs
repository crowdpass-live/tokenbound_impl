//! Typed wrappers for the deployed CrowdPass Soroban contracts.

use std::sync::Arc;
use std::time::Duration;

use tokio::time::timeout;
use tracing::warn;

use crate::client::ClientInner;
use crate::error::ClientError;
use crate::transport::{InvocationRequest, InvocationResponse};

mod event_manager;
mod marketplace;
mod poap_nft;
mod tba_account;
mod tba_registry;
mod ticket_factory;
mod ticket_nft;

pub use event_manager::EventManagerClient;
pub use marketplace::MarketplaceClient;
pub use poap_nft::PoapNftClient;
pub use tba_account::TbaAccountClient;
pub use tba_registry::TbaRegistryClient;
pub use ticket_factory::TicketFactoryClient;
pub use ticket_nft::TicketNftClient;

/// Dispatch an invocation through the configured transport, applying retries
/// and a timeout.
pub(crate) async fn dispatch(
    inner: &ClientInner,
    request: InvocationRequest,
) -> Result<InvocationResponse, ClientError> {
    let policy = inner.rpc.retry().clone();
    let request_timeout = inner.rpc.timeout();
    let max_attempts = policy.max_attempts();

    let mut last_err: Option<ClientError> = None;
    for attempt in 0..max_attempts {
        if attempt > 0 {
            tokio::time::sleep(policy.backoff_for(attempt)).await;
        }
        match invoke_once(inner, request.clone(), request_timeout).await {
            Ok(resp) => return Ok(resp),
            Err(err) => {
                if !is_retryable(&err) || attempt + 1 == max_attempts {
                    return Err(err);
                }
                warn!(
                    contract = request.contract_name,
                    method = %request.method,
                    attempt = attempt + 1,
                    "transport call failed, retrying"
                );
                last_err = Some(err);
            }
        }
    }
    Err(last_err.unwrap_or_else(|| ClientError::Other("retry loop exhausted".into())))
}

async fn invoke_once(
    inner: &ClientInner,
    request: InvocationRequest,
    request_timeout: Duration,
) -> Result<InvocationResponse, ClientError> {
    let fut = inner.transport.invoke(request);
    match timeout(request_timeout, fut).await {
        Ok(result) => result,
        Err(_) => Err(ClientError::Timeout {
            millis: request_timeout.as_millis() as u64,
        }),
    }
}

fn is_retryable(err: &ClientError) -> bool {
    matches!(
        err,
        ClientError::Transport(_) | ClientError::Timeout { .. } | ClientError::Rpc { .. }
    )
}

/// Shared base for typed contract clients.
pub(crate) struct ContractContext {
    pub(crate) inner: Arc<ClientInner>,
}

impl ContractContext {
    pub(crate) fn new(inner: Arc<ClientInner>) -> Self {
        Self { inner }
    }
}
