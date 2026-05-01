//! RPC, network, and retry configuration types.

use core::time::Duration;

use crate::error::ClientError;

/// Standard Stellar testnet passphrase.
pub const TESTNET_PASSPHRASE: &str = "Test SDF Network ; September 2015";

/// Standard Stellar mainnet (pubnet) passphrase.
pub const MAINNET_PASSPHRASE: &str = "Public Global Stellar Network ; September 2015";

/// Standard Stellar futurenet passphrase.
pub const FUTURENET_PASSPHRASE: &str = "Test SDF Future Network ; October 2022";

/// Configuration for a Soroban RPC endpoint.
///
/// Holds the endpoint URL plus optional timeout and retry policy. The
/// underlying [`Transport`](crate::transport::Transport) decides how the URL is
/// used; the client itself is transport-agnostic.
#[derive(Debug, Clone)]
pub struct RpcConfig {
    endpoint: String,
    timeout: Duration,
    retry: RetryPolicy,
    simulate_before_submit: bool,
}

impl RpcConfig {
    /// Create a new [`RpcConfig`] for the given endpoint URL with sane
    /// defaults: a 30-second timeout, the default [`RetryPolicy`], and
    /// transaction simulation enabled before submission.
    pub fn new(endpoint: impl Into<String>) -> Self {
        Self {
            endpoint: endpoint.into(),
            timeout: Duration::from_secs(30),
            retry: RetryPolicy::default(),
            simulate_before_submit: true,
        }
    }

    /// Override the request timeout.
    pub fn with_timeout(mut self, timeout: Duration) -> Self {
        self.timeout = timeout;
        self
    }

    /// Override the retry policy.
    pub fn with_retry(mut self, retry: RetryPolicy) -> Self {
        self.retry = retry;
        self
    }

    /// Toggle whether the client simulates a transaction before submitting it.
    pub fn with_simulate_before_submit(mut self, value: bool) -> Self {
        self.simulate_before_submit = value;
        self
    }

    /// Endpoint URL.
    pub fn endpoint(&self) -> &str {
        &self.endpoint
    }

    /// Configured request timeout.
    pub fn timeout(&self) -> Duration {
        self.timeout
    }

    /// Configured retry policy.
    pub fn retry(&self) -> &RetryPolicy {
        &self.retry
    }

    /// Whether transactions are simulated before submission.
    pub fn simulate_before_submit(&self) -> bool {
        self.simulate_before_submit
    }

    pub(crate) fn validate(&self) -> Result<(), ClientError> {
        if self.endpoint.trim().is_empty() {
            return Err(ClientError::InvalidConfig(
                "rpc endpoint must not be empty".into(),
            ));
        }
        if self.timeout.is_zero() {
            return Err(ClientError::InvalidConfig(
                "rpc timeout must be > 0".into(),
            ));
        }
        Ok(())
    }
}

/// Retry policy used by the client when a transport call fails transiently.
///
/// The policy supports a configurable number of attempts and an exponentially
/// growing backoff bounded by [`RetryPolicy::max_backoff`].
#[derive(Debug, Clone)]
pub struct RetryPolicy {
    max_attempts: u32,
    initial_backoff: Duration,
    max_backoff: Duration,
    backoff_multiplier: f64,
}

impl RetryPolicy {
    /// Build a new retry policy.
    pub fn new(
        max_attempts: u32,
        initial_backoff: Duration,
        max_backoff: Duration,
        backoff_multiplier: f64,
    ) -> Self {
        Self {
            max_attempts: max_attempts.max(1),
            initial_backoff,
            max_backoff,
            backoff_multiplier: backoff_multiplier.max(1.0),
        }
    }

    /// Disable retries entirely.
    pub fn none() -> Self {
        Self::new(1, Duration::from_millis(0), Duration::from_millis(0), 1.0)
    }

    /// Maximum number of attempts (always at least 1).
    pub fn max_attempts(&self) -> u32 {
        self.max_attempts
    }

    /// Compute the backoff for the given attempt index (zero-based).
    pub fn backoff_for(&self, attempt: u32) -> Duration {
        if attempt == 0 {
            return self.initial_backoff;
        }
        let mut backoff = self.initial_backoff.as_millis() as f64;
        for _ in 0..attempt {
            backoff *= self.backoff_multiplier;
        }
        let capped = backoff.min(self.max_backoff.as_millis() as f64);
        Duration::from_millis(capped as u64)
    }
}

impl Default for RetryPolicy {
    /// 3 attempts, 100 ms → 800 ms, multiplier 2.0.
    fn default() -> Self {
        Self::new(
            3,
            Duration::from_millis(100),
            Duration::from_millis(800),
            2.0,
        )
    }
}

/// Network passphrase wrapper.
///
/// Soroban requires the network passphrase when signing and submitting
/// transactions. This type makes the choice explicit and provides shortcuts
/// for the canonical Stellar networks.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct NetworkPassphrase(String);

impl NetworkPassphrase {
    /// Wrap an arbitrary passphrase string.
    pub fn new(value: impl Into<String>) -> Self {
        Self(value.into())
    }

    /// The standard Stellar testnet passphrase.
    pub fn testnet() -> Self {
        Self::new(TESTNET_PASSPHRASE)
    }

    /// The standard Stellar mainnet (pubnet) passphrase.
    pub fn mainnet() -> Self {
        Self::new(MAINNET_PASSPHRASE)
    }

    /// The standard Stellar futurenet passphrase.
    pub fn futurenet() -> Self {
        Self::new(FUTURENET_PASSPHRASE)
    }

    /// Borrow the inner string.
    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl Default for NetworkPassphrase {
    fn default() -> Self {
        Self::testnet()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rpc_config_validates_endpoint() {
        let cfg = RpcConfig::new("");
        assert!(cfg.validate().is_err());
        let cfg = RpcConfig::new("https://example.org");
        assert!(cfg.validate().is_ok());
    }

    #[test]
    fn rpc_config_validates_timeout() {
        let cfg = RpcConfig::new("https://example.org").with_timeout(Duration::from_millis(0));
        assert!(cfg.validate().is_err());
    }

    #[test]
    fn retry_policy_backoff_grows_then_caps() {
        let policy = RetryPolicy::new(
            5,
            Duration::from_millis(100),
            Duration::from_millis(400),
            2.0,
        );
        assert_eq!(policy.backoff_for(0), Duration::from_millis(100));
        assert_eq!(policy.backoff_for(1), Duration::from_millis(200));
        assert_eq!(policy.backoff_for(2), Duration::from_millis(400));
        assert_eq!(policy.backoff_for(3), Duration::from_millis(400));
    }

    #[test]
    fn retry_policy_none_does_not_retry() {
        let policy = RetryPolicy::none();
        assert_eq!(policy.max_attempts(), 1);
    }

    #[test]
    fn network_passphrase_constants() {
        assert_eq!(NetworkPassphrase::testnet().as_str(), TESTNET_PASSPHRASE);
        assert_eq!(NetworkPassphrase::mainnet().as_str(), MAINNET_PASSPHRASE);
        assert_eq!(
            NetworkPassphrase::futurenet().as_str(),
            FUTURENET_PASSPHRASE
        );
    }
}
