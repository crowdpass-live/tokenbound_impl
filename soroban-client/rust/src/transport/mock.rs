//! In-memory transport for tests.
//!
//! [`MockTransport`] dispatches calls based on `(contract_id, method)` tuples
//! using user-provided handlers. It also keeps a log of every invocation so
//! tests can assert that the right contract methods were called with the
//! expected arguments.

use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use async_trait::async_trait;

use crate::error::ClientError;

use super::{InvocationRequest, InvocationResponse, Transport};

/// Boxed handler used by [`MockTransport`].
pub type MockHandler =
    Arc<dyn Fn(&InvocationRequest) -> Result<InvocationResponse, ClientError> + Send + Sync>;

#[derive(Default)]
struct Inner {
    handlers: HashMap<(String, String), MockHandler>,
    log: Vec<InvocationRequest>,
}

/// In-memory transport useful for unit and integration tests.
///
/// Register handlers per `(contract_address, method_name)` tuple. Any call
/// without a matching handler returns [`ClientError::Other`] so that tests
/// fail loudly when an unexpected RPC call slips through.
#[derive(Clone, Default)]
pub struct MockTransport {
    inner: Arc<Mutex<Inner>>,
}

impl MockTransport {
    /// Create an empty mock transport.
    pub fn new() -> Self {
        Self::default()
    }

    /// Register a handler for a given contract method.
    ///
    /// The handler receives the full [`InvocationRequest`] and must return an
    /// [`InvocationResponse`] (or a [`ClientError`] to simulate a failure).
    pub fn register<F>(&self, contract_id: impl Into<String>, method: impl Into<String>, handler: F)
    where
        F: Fn(&InvocationRequest) -> Result<InvocationResponse, ClientError>
            + Send
            + Sync
            + 'static,
    {
        let key = (contract_id.into(), method.into());
        let mut inner = self.inner.lock().expect("mock transport poisoned");
        inner.handlers.insert(key, Arc::new(handler));
    }

    /// Returns a snapshot of every invocation observed so far.
    pub fn invocations(&self) -> Vec<InvocationRequest> {
        let inner = self.inner.lock().expect("mock transport poisoned");
        inner.log.clone()
    }

    /// Clears the recorded invocation log.
    pub fn clear_log(&self) {
        let mut inner = self.inner.lock().expect("mock transport poisoned");
        inner.log.clear();
    }
}

#[async_trait]
impl Transport for MockTransport {
    async fn invoke(&self, request: InvocationRequest) -> Result<InvocationResponse, ClientError> {
        let key = (request.contract_id.as_str().to_string(), request.method.clone());
        let handler = {
            let mut inner = self.inner.lock().expect("mock transport poisoned");
            inner.log.push(request.clone());
            inner.handlers.get(&key).cloned()
        };
        match handler {
            Some(h) => h(&request),
            None => Err(ClientError::Other(format!(
                "MockTransport: no handler registered for `{}::{}`",
                request.contract_id, request.method
            ))),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{Address, ContractValue};

    #[tokio::test]
    async fn mock_returns_registered_handler() {
        let transport = MockTransport::new();
        transport.register("CABC", "get_event_count", |_req| {
            Ok(InvocationResponse::value(ContractValue::U32(7)))
        });

        let req = InvocationRequest::simulate(
            "event_manager",
            Address::new("CABC"),
            "get_event_count",
        );
        let resp = transport.invoke(req).await.expect("ok");
        assert_eq!(
            resp.return_value.and_then(|v| v.as_u32()).unwrap_or(0),
            7
        );
        assert_eq!(transport.invocations().len(), 1);
    }

    #[tokio::test]
    async fn mock_errors_on_missing_handler() {
        let transport = MockTransport::new();
        let req = InvocationRequest::simulate(
            "event_manager",
            Address::new("CXYZ"),
            "missing",
        );
        let err = transport.invoke(req).await.expect_err("should fail");
        match err {
            ClientError::Other(msg) => assert!(msg.contains("no handler")),
            other => panic!("unexpected error: {other:?}"),
        }
    }

    #[tokio::test]
    async fn mock_log_clears() {
        let transport = MockTransport::new();
        transport.register("CABC", "ping", |_| Ok(InvocationResponse::void()));
        let req = InvocationRequest::simulate("event_manager", Address::new("CABC"), "ping");
        transport.invoke(req).await.expect("ok");
        assert_eq!(transport.invocations().len(), 1);
        transport.clear_log();
        assert_eq!(transport.invocations().len(), 0);
    }
}
