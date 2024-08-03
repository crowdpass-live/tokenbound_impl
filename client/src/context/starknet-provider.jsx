import React from "react";

import { sepolia, mainnet } from "@starknet-react/chains";
import {
  StarknetConfig,
  publicProvider,
  argent,
  braavos,
  useInjectedConnectors,
  voyager,
  jsonRpcProvider, 
  alchemyProvider
} from "@starknet-react/core";

export function StarknetProvider({ children }) {
  const { connectors } = useInjectedConnectors({
    // Show these connectors if the user has no connector installed.
    recommended: [
      argent(),
      braavos(),
    ],
    // Hide recommended connectors if the user has any connector installed.
    includeRecommended: "onlyIfNoConnectors",
    // Randomize the order of the connectors.
    order: "random"
  });

//   const provider = jsonRpcProvider({ rpc: 'https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_7/RCp5m7oq9i9myxsvC8ctUmNq2Wq2Pa_v'});
  const provider = alchemyProvider({ apiKey: 'RCp5m7oq9i9myxsvC8ctUmNq2Wq2Pa_v' });

  return (
    <StarknetConfig
      chains={[sepolia]}
      provider={publicProvider()}
      connectors={connectors}
      explorer={voyager}
    >
      {children}
    </StarknetConfig>
  );
}
