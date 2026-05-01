//! [`SorobanContractClient`] — the top-level entry point.

use std::sync::Arc;

use crate::config::{NetworkPassphrase, RpcConfig};
use crate::contracts::{
    EventManagerClient, MarketplaceClient, PoapNftClient, TbaAccountClient, TbaRegistryClient,
    TicketFactoryClient, TicketNftClient,
};
use crate::error::ClientError;
use crate::transport::{InvocationRequest, InvocationResponse, Transport};
use crate::types::Address;

/// Bundles the deployed contract addresses for a CrowdPass deployment.
///
/// All fields are optional because not every consumer cares about every
/// contract. Calls into a contract whose address is missing return
/// [`ClientError::MissingField`].
#[derive(Debug, Clone, Default)]
pub struct ContractAddresses {
    pub(crate) event_manager: Option<Address>,
    pub(crate) ticket_factory: Option<Address>,
    pub(crate) ticket_nft: Option<Address>,
    pub(crate) tba_registry: Option<Address>,
    pub(crate) tba_account: Option<Address>,
    pub(crate) marketplace: Option<Address>,
    pub(crate) poap_nft: Option<Address>,
}

impl ContractAddresses {
    /// Start a new builder.
    pub fn builder() -> ContractAddressesBuilder {
        ContractAddressesBuilder::default()
    }
}

/// Builder for [`ContractAddresses`].
#[derive(Debug, Default)]
pub struct ContractAddressesBuilder {
    inner: ContractAddresses,
}

macro_rules! address_setter {
    ($name:ident, $field:ident, $doc:expr) => {
        #[doc = $doc]
        pub fn $name(mut self, addr: impl Into<Address>) -> Self {
            self.inner.$field = Some(addr.into());
            self
        }
    };
}

impl ContractAddressesBuilder {
    address_setter!(
        event_manager,
        event_manager,
        "Set the deployed Event Manager contract address."
    );
    address_setter!(
        ticket_factory,
        ticket_factory,
        "Set the deployed Ticket Factory contract address."
    );
    address_setter!(
        ticket_nft,
        ticket_nft,
        "Set the deployed Ticket NFT contract address (typically derived per-event)."
    );
    address_setter!(
        tba_registry,
        tba_registry,
        "Set the deployed TBA Registry contract address."
    );
    address_setter!(
        tba_account,
        tba_account,
        "Set the deployed TBA Account contract address."
    );
    address_setter!(
        marketplace,
        marketplace,
        "Set the deployed Marketplace contract address."
    );
    address_setter!(
        poap_nft,
        poap_nft,
        "Set the deployed POAP NFT contract address."
    );

    /// Finalise the builder.
    pub fn build(self) -> ContractAddresses {
        self.inner
    }
}

/// Top-level CrowdPass client.
///
/// Construct via [`SorobanContractClient::builder`].
#[derive(Clone)]
pub struct SorobanContractClient {
    inner: Arc<ClientInner>,
}

pub(crate) struct ClientInner {
    pub(crate) rpc: RpcConfig,
    pub(crate) network: NetworkPassphrase,
    pub(crate) addresses: ContractAddresses,
    pub(crate) transport: Arc<dyn Transport>,
}

impl SorobanContractClient {
    /// Start a new client builder.
    pub fn builder() -> SorobanContractClientBuilder {
        SorobanContractClientBuilder::default()
    }

    /// RPC configuration.
    pub fn rpc(&self) -> &RpcConfig {
        &self.inner.rpc
    }

    /// Network passphrase.
    pub fn network(&self) -> &NetworkPassphrase {
        &self.inner.network
    }

    /// Configured contract addresses.
    pub fn addresses(&self) -> &ContractAddresses {
        &self.inner.addresses
    }

    /// Direct access to the underlying transport (useful for tests).
    pub fn transport(&self) -> Arc<dyn Transport> {
        self.inner.transport.clone()
    }

    /// Typed wrapper for the Event Manager contract.
    pub fn event_manager(&self) -> EventManagerClient {
        EventManagerClient::new(self.inner.clone())
    }

    /// Typed wrapper for the Ticket Factory contract.
    pub fn ticket_factory(&self) -> TicketFactoryClient {
        TicketFactoryClient::new(self.inner.clone())
    }

    /// Typed wrapper for a Ticket NFT contract. Pass an explicit `address`
    /// because each event deploys its own ticket contract.
    pub fn ticket_nft(&self, address: impl Into<Address>) -> TicketNftClient {
        TicketNftClient::with_address(self.inner.clone(), address.into())
    }

    /// Typed wrapper for the default Ticket NFT (uses the configured
    /// `ticket_nft` address).
    pub fn default_ticket_nft(&self) -> Result<TicketNftClient, ClientError> {
        let addr = self
            .inner
            .addresses
            .ticket_nft
            .clone()
            .ok_or(ClientError::MissingField("contracts.ticket_nft"))?;
        Ok(TicketNftClient::with_address(self.inner.clone(), addr))
    }

    /// Typed wrapper for the TBA Registry contract.
    pub fn tba_registry(&self) -> TbaRegistryClient {
        TbaRegistryClient::new(self.inner.clone())
    }

    /// Typed wrapper for a TBA Account contract.
    pub fn tba_account(&self, address: impl Into<Address>) -> TbaAccountClient {
        TbaAccountClient::with_address(self.inner.clone(), address.into())
    }

    /// Typed wrapper for the Marketplace contract.
    pub fn marketplace(&self) -> MarketplaceClient {
        MarketplaceClient::new(self.inner.clone())
    }

    /// Typed wrapper for the POAP NFT contract.
    pub fn poap_nft(&self) -> PoapNftClient {
        PoapNftClient::new(self.inner.clone())
    }

    /// Dispatch a raw invocation through the underlying transport.
    ///
    /// Useful for wiring in custom contracts that this crate does not yet
    /// model.
    pub async fn invoke(
        &self,
        request: InvocationRequest,
    ) -> Result<InvocationResponse, ClientError> {
        crate::contracts::dispatch(&self.inner, request).await
    }
}

/// Builder for [`SorobanContractClient`].
#[derive(Default)]
pub struct SorobanContractClientBuilder {
    rpc: Option<RpcConfig>,
    network: Option<NetworkPassphrase>,
    addresses: ContractAddresses,
    transport: Option<Arc<dyn Transport>>,
}

impl SorobanContractClientBuilder {
    /// Set the RPC configuration.
    pub fn rpc(mut self, config: RpcConfig) -> Self {
        self.rpc = Some(config);
        self
    }

    /// Override the network passphrase. Defaults to testnet if unset.
    pub fn network_passphrase(mut self, passphrase: NetworkPassphrase) -> Self {
        self.network = Some(passphrase);
        self
    }

    /// Wire in deployed contract addresses.
    pub fn contracts(mut self, addresses: ContractAddresses) -> Self {
        self.addresses = addresses;
        self
    }

    /// Plug in a transport implementation.
    pub fn transport(mut self, transport: Arc<dyn Transport>) -> Self {
        self.transport = Some(transport);
        self
    }

    /// Plug in a transport implementation by value.
    pub fn boxed_transport<T>(self, transport: T) -> Self
    where
        T: Transport + 'static,
    {
        let arc: Arc<dyn Transport> = Arc::new(transport);
        self.transport(arc)
    }

    /// Finalise the builder.
    pub fn build(self) -> Result<SorobanContractClient, ClientError> {
        let rpc = self.rpc.ok_or(ClientError::MissingField("rpc"))?;
        rpc.validate()?;
        let transport = self
            .transport
            .ok_or(ClientError::MissingField("transport"))?;
        let network = self.network.unwrap_or_default();

        Ok(SorobanContractClient {
            inner: Arc::new(ClientInner {
                rpc,
                network,
                addresses: self.addresses,
                transport,
            }),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::transport::MockTransport;

    fn build_client() -> SorobanContractClient {
        let transport = Arc::new(MockTransport::new());
        SorobanContractClient::builder()
            .rpc(RpcConfig::new("https://rpc.example"))
            .network_passphrase(NetworkPassphrase::testnet())
            .contracts(
                ContractAddresses::builder()
                    .event_manager("CEVT")
                    .ticket_factory("CTF")
                    .ticket_nft("CTNFT")
                    .tba_registry("CTBA")
                    .marketplace("CMKT")
                    .poap_nft("CPOAP")
                    .build(),
            )
            .transport(transport)
            .build()
            .expect("client builds")
    }

    #[test]
    fn builder_requires_rpc() {
        let res = SorobanContractClient::builder()
            .transport(Arc::new(MockTransport::new()) as Arc<dyn Transport>)
            .build();
        assert!(matches!(res, Err(ClientError::MissingField("rpc"))));
    }

    #[test]
    fn builder_requires_transport() {
        let res = SorobanContractClient::builder()
            .rpc(RpcConfig::new("https://rpc.example"))
            .build();
        assert!(matches!(res, Err(ClientError::MissingField("transport"))));
    }

    #[test]
    fn builder_validates_endpoint() {
        let transport: Arc<dyn Transport> = Arc::new(MockTransport::new());
        let res = SorobanContractClient::builder()
            .rpc(RpcConfig::new(""))
            .transport(transport)
            .build();
        assert!(matches!(res, Err(ClientError::InvalidConfig(_))));
    }

    #[test]
    fn defaults_to_testnet_passphrase() {
        let client = build_client();
        assert_eq!(client.network(), &NetworkPassphrase::testnet());
    }

    #[test]
    fn default_ticket_nft_requires_configured_address() {
        let transport: Arc<dyn Transport> = Arc::new(MockTransport::new());
        let client = SorobanContractClient::builder()
            .rpc(RpcConfig::new("https://rpc.example"))
            .transport(transport)
            .build()
            .expect("client builds");
        match client.default_ticket_nft() {
            Err(ClientError::MissingField("contracts.ticket_nft")) => {}
            Err(other) => panic!("unexpected error: {other:?}"),
            Ok(_) => panic!("expected MissingField error"),
        }
    }
}
