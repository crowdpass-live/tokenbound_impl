import React, { useState, useEffect } from 'react';
import { isConnected, requestAccess, signTransaction } from '@stellar/freighter-api';
import {
  rpc,
  TransactionBuilder,
  Networks,
  Contract,
  nativeToScVal,
  scValToNative,
} from '@stellar/stellar-sdk';

const NETWORK_PASSPHRASE = Networks.TESTNET;
const RPC_URL = 'https://soroban-testnet.stellar.org';

// Replace with your actual deployed EventManager contract ID
const EVENT_MANAGER_ID = 'C...'; 

export default function EventDAppDemo() {
  const [publicKey, setPublicKey] = useState<string>('');
  const [eventCount, setEventCount] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [txHash, setTxHash] = useState<string>('');

  const server = new rpc.Server(RPC_URL);
  const contract = new Contract(EVENT_MANAGER_ID);

  // 1. Connect Wallet using Freighter
  const handleConnect = async () => {
    if (await isConnected()) {
      try {
        const pubKey = await requestAccess();
        setPublicKey(pubKey);
      } catch (error) {
        console.error('Wallet connection failed:', error);
      }
    } else {
      alert('Please install the Freighter wallet extension!');
    }
  };

  // 2. Read State from Soroban Contract
  const fetchEventCount = async () => {
    if (!publicKey) return;
    setLoading(true);
    try {
      // Fetch the account to get the current sequence number
      const account = await server.getAccount(publicKey);
      
      const tx = new TransactionBuilder(account, {
        fee: '100', // Base fee
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(contract.call('get_event_count'))
        .setTimeout(30)
        .build();

      // Simulate the transaction to read state without signing or submitting
      const simulation = await server.simulateTransaction(tx);
      
      if (rpc.Api.isSimulationSuccess(simulation)) {
        const count = scValToNative(simulation.result.retval);
        setEventCount(count);
      } else {
        console.error('Simulation failed:', simulation);
      }
    } catch (error) {
      console.error('Error reading contract:', error);
    } finally {
      setLoading(false);
    }
  };

  // 3. Write State to Soroban Contract (Create Event)
  const createEvent = async () => {
    if (!publicKey) return;
    setLoading(true);
    setTxHash('');

    try {
      // 3a. Prepare Arguments
      // Using nativeToScVal to convert JS native types to Soroban ScVals
      const theme = nativeToScVal('My First Web3 Event');
      const eventType = nativeToScVal('Conference');
      const startDate = nativeToScVal(Math.floor(Date.now() / 1000) + 86400, { type: 'u64' }); // Tomorrow
      const endDate = nativeToScVal(Math.floor(Date.now() / 1000) + 172800, { type: 'u64' }); // Day after tomorrow
      const ticketPrice = nativeToScVal(100_000_000, { type: 'i128' }); // 10 USDC (Stroops)
      const totalTickets = nativeToScVal(500, { type: 'u128' });
      // Dummy USDC token address for example
      const paymentToken = nativeToScVal('C...', { type: 'address' }); 

      // 3b. Build Base Transaction
      const account = await server.getAccount(publicKey);
      let tx = new TransactionBuilder(account, {
        fee: '100', // Initial placeholder fee
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          contract.call(
            'create_event',
            nativeToScVal(publicKey, { type: 'address' }), // organizer
            theme,
            eventType,
            startDate,
            endDate,
            ticketPrice,
            totalTickets,
            paymentToken
          )
        )
        .setTimeout(30)
        .build();

      // 3c. Simulate Transaction (Crucial for calculating gas and footprint)
      const simulation = await server.simulateTransaction(tx);
      if (!rpc.Api.isSimulationSuccess(simulation)) {
        throw new Error('Transaction simulation failed');
      }

      // 3d. Assemble Transaction (Attaches footprint & calculated resource fee)
      tx = rpc.assembleTransaction(tx, NETWORK_PASSPHRASE, simulation).build();

      // 3e. Sign Transaction via Freighter
      const signedXdr = await signTransaction(tx.toXDR(), {
        network: 'TESTNET',
      });
      
      const signedTx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);

      // 3f. Submit Transaction
      const response = await server.sendTransaction(signedTx);
      if (response.status === 'ERROR') {
        throw new Error(`Submission failed: ${JSON.stringify(response)}`);
      }

      // 3g. Poll for final confirmation
      let status = response.status;
      let txResponse;
      while (status === 'PENDING') {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        txResponse = await server.getTransaction(response.hash);
        status = txResponse.status;
      }

      if (status === 'SUCCESS') {
        setTxHash(response.hash);
        // Refresh event count
        await fetchEventCount();
      } else {
        throw new Error('Transaction failed on-chain');
      }
    } catch (error) {
      console.error('Error creating event:', error);
      alert('Failed to create event. See console for details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h2>CrowdPass - Soroban DApp Demo</h2>
      
      {!publicKey ? (
        <button onClick={handleConnect} disabled={loading}>
          Connect Freighter Wallet
        </button>
      ) : (
        <div>
          <p><strong>Connected:</strong> {publicKey}</p>
          
          <div style={{ margin: '2rem 0', padding: '1rem', border: '1px solid #ccc' }}>
            <h3>Read State</h3>
            <button onClick={fetchEventCount} disabled={loading}>
              Get Total Events
            </button>
            {eventCount !== null && (
              <p>Total Events on Contract: {eventCount}</p>
            )}
          </div>

          <div style={{ margin: '2rem 0', padding: '1rem', border: '1px solid #ccc' }}>
            <h3>Write State</h3>
            <button onClick={createEvent} disabled={loading}>
              {loading ? 'Processing...' : 'Create New Event'}
            </button>
            {txHash && (
              <p style={{ color: 'green' }}>
                Success! TxHash: <br/>
                <a href={`https://stellar.expert/explorer/testnet/tx/${txHash}`} target="_blank" rel="noreferrer">{txHash}</a>
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}