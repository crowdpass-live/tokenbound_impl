import React, { useState } from 'react';
import * as StellarSdk from '@stellar/stellar-sdk';
import { LoggedSorobanServer } from '../lib/LoggedSorobanServer';

/**
 * ContractDebugger
 * 
 * A graphical interface for simulating Soroban smart contract execution.
 * Allows developers to input contract details, simulate the transaction, 
 * and inspect the resulting state changes, events, and resource usage.
 */
const ContractDebugger = ({ rpcUrl = 'https://soroban-testnet.stellar.org:443' }) => {
  const [contractId, setContractId] = useState('');
  const [method, setMethod] = useState('');
  const [argsJson, setArgsJson] = useState('[]');
  
  const [loading, setLoading] = useState(false);
  const [simulationResult, setSimulationResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSimulate = async () => {
    setLoading(true);
    setError(null);
    setSimulationResult(null);

    try {
      const server = new LoggedSorobanServer(rpcUrl, { enableLogging: true });
      let parsedArgs = [];
      
      try {
        parsedArgs = JSON.parse(argsJson);
      } catch (e) {
        throw new Error('Invalid JSON format for arguments');
      }

      // Note: In a real environment, you need a source account to build the transaction.
      // For pure simulation, some networks allow a zeroed out or dummy account.
      const dummyAccount = new StellarSdk.Account('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', '0');
      
      const contract = new StellarSdk.Contract(contractId);
      const callOperation = contract.call(
        method,
        ...parsedArgs // Needs to be converted to native scVals depending on the expected types
      );

      const tx = new StellarSdk.TransactionBuilder(dummyAccount, {
        fee: '100',
        networkPassphrase: StellarSdk.Networks.TESTNET,
      })
        .addOperation(callOperation)
        .setTimeout(30)
        .build();

      const result = await server.simulateTransaction(tx);
      
      if (StellarSdk.SorobanRpc.Api.isSimulationError(result)) {
        setError(result.error);
      } else {
        setSimulationResult(result);
      }
    } catch (err) {
      setError(err.message || 'An error occurred during simulation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-xl shadow-lg border border-gray-200 mt-8">
      <div className="border-b pb-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Soroban Contract Debugger</h2>
        <p className="text-sm text-gray-500 mt-1">Simulate transactions to inspect state changes, events, and gas usage.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Contract ID</label>
          <input 
            type="text" 
            className="w-full px-4 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
            placeholder="C..." 
            value={contractId}
            onChange={(e) => setContractId(e.target.value)}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Method Name</label>
          <input 
            type="text" 
            className="w-full px-4 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
            placeholder="e.g., deploy_ticket" 
            value={method}
            onChange={(e) => setMethod(e.target.value)}
          />
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">Arguments (JSON array of scVals)</label>
        <textarea 
          className="w-full px-4 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500 font-mono text-sm h-32"
          placeholder="[...]"
          value={argsJson}
          onChange={(e) => setArgsJson(e.target.value)}
        />
      </div>

      <button 
        onClick={handleSimulate}
        disabled={loading || !contractId || !method}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg transition disabled:opacity-50"
      >
        {loading ? 'Simulating...' : 'Simulate & Inspect State'}
      </button>

      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="text-red-800 font-semibold mb-2">Simulation Error</h3>
          <pre className="text-sm text-red-600 overflow-x-auto">{error}</pre>
        </div>
      )}

      {simulationResult && !error && (
        <div className="mt-8 space-y-6">
          {/* Result / Return Value */}
          <div className="bg-gray-50 p-4 rounded-lg border">
            <h3 className="font-bold text-gray-800 mb-2 border-b pb-2">Return Value (XDR)</h3>
            <pre className="text-sm text-gray-600 overflow-x-auto">
              {simulationResult.result?.retval ? simulationResult.result.retval.toXDR('base64') : 'No return value'}
            </pre>
          </div>

          {/* Footprint / State Changes */}
          <div className="bg-gray-50 p-4 rounded-lg border">
            <h3 className="font-bold text-gray-800 mb-2 border-b pb-2">State Footprint</h3>
            <div className="text-sm text-gray-600">
              <p className="font-semibold mt-2">Read Keys:</p>
              <ul className="list-disc pl-5 mb-2">
                {simulationResult.transactionData?.build().resources().footprint().readOnly().map((key, i) => (
                  <li key={i} className="font-mono text-xs break-all">{key.toXDR('base64')}</li>
                )) || <li>None</li>}
              </ul>
              
              <p className="font-semibold mt-2">Read/Write Keys (Modified State):</p>
              <ul className="list-disc pl-5">
                {simulationResult.transactionData?.build().resources().footprint().readWrite().map((key, i) => (
                  <li key={i} className="font-mono text-xs break-all text-blue-600">{key.toXDR('base64')}</li>
                )) || <li>None</li>}
              </ul>
            </div>
          </div>

          {/* Events */}
          <div className="bg-gray-50 p-4 rounded-lg border">
            <h3 className="font-bold text-gray-800 mb-2 border-b pb-2">Emitted Events</h3>
            {simulationResult.events?.length > 0 ? (
              <div className="space-y-3">
                {simulationResult.events.map((evt, idx) => (
                  <div key={idx} className="bg-white p-3 border rounded text-sm font-mono">
                    <p><span className="font-bold">Type:</span> {evt.type()}</p>
                    <p><span className="font-bold">Topics:</span></p>
                    <ul className="pl-4">
                      {evt.topics().map((topic, i) => (
                        <li key={i}>{topic.toXDR('base64')}</li>
                      ))}
                    </ul>
                    <p className="mt-1"><span className="font-bold">Data:</span> {evt.data().toXDR('base64')}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No events emitted.</p>
            )}
          </div>

          {/* Resource Usage */}
          <div className="bg-gray-50 p-4 rounded-lg border">
            <h3 className="font-bold text-gray-800 mb-2 border-b pb-2">Resource Usage</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">CPU Instructions:</span> <span className="font-mono">{simulationResult.cost?.cpuInsns || 0}</span></div>
              <div><span className="text-gray-500">Memory (Bytes):</span> <span className="font-mono">{simulationResult.cost?.memBytes || 0}</span></div>
              <div><span className="text-gray-500">Min Resource Fee:</span> <span className="font-mono">{simulationResult.minResourceFee || 0} stroops</span></div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default ContractDebugger;