import * as StellarSdk from '@stellar/stellar-sdk';

/**
 * LoggedSorobanServer
 * 
 * Extends the @stellar/stellar-sdk SorobanRpc.Server to provide rich, 
 * console-based logging for contract call requests and responses.
 * Groups logs by transaction phase (simulate, send, get) to keep 
 * the browser console clean while offering deep XDR and state inspection.
 */
export class LoggedSorobanServer extends StellarSdk.SorobanRpc.Server {
  constructor(serverUrl, options = {}) {
    super(serverUrl, options);
    this.enableLogging = options.enableLogging !== false;
  }

  async simulateTransaction(transaction) {
    if (!this.enableLogging) return super.simulateTransaction(transaction);

    console.groupCollapsed(`🚀 [Soroban RPC] simulateTransaction`);
    console.log('Transaction XDR:', transaction.toXDR());
    
    const startTime = performance.now();
    try {
      const response = await super.simulateTransaction(transaction);
      const duration = performance.now() - startTime;
      
      console.log(`⏱️ Duration: ${duration.toFixed(2)}ms`);
      console.log('📦 Raw Response:', response);
      
      if (StellarSdk.SorobanRpc.Api.isSimulationError(response)) {
        console.error('❌ Simulation Error:', response.error);
      } else {
        console.log('✅ Simulation Success');
        console.log('📊 Resource Cost:', response.cost);
        if (response.result?.retval) {
          console.log('↩️ Return Value (XDR):', response.result.retval.toXDR('base64'));
        }
        if (response.events?.length > 0) {
          console.log(`🔔 Emitted Events (${response.events.length}):`, response.events);
        }
      }
      console.groupEnd();
      return response;
    } catch (error) {
      console.error('💥 RPC Error:', error);
      console.groupEnd();
      throw error;
    }
  }

  async sendTransaction(transaction) {
    if (!this.enableLogging) return super.sendTransaction(transaction);

    console.groupCollapsed(`📤 [Soroban RPC] sendTransaction`);
    console.log('Transaction XDR:', transaction.toXDR());

    const startTime = performance.now();
    try {
      const response = await super.sendTransaction(transaction);
      const duration = performance.now() - startTime;
      
      console.log(`⏱️ Duration: ${duration.toFixed(2)}ms`);
      console.log('📦 Raw Response:', response);
      
      if (response.errorResultXdr) {
        console.error('❌ Send Error XDR:', response.errorResultXdr);
      } else {
        console.log('✅ Transaction Sent. Hash:', response.hash);
      }
      
      console.groupEnd();
      return response;
    } catch (error) {
      console.error('💥 RPC Error:', error);
      console.groupEnd();
      throw error;
    }
  }

  async getTransaction(hash) {
    if (!this.enableLogging) return super.getTransaction(hash);

    const startTime = performance.now();
    try {
      const response = await super.getTransaction(hash);
      const duration = performance.now() - startTime;
      
      console.log(`🔍 [Soroban RPC] getTransaction (${hash.substring(0, 8)}...) - ${duration.toFixed(2)}ms`, response);
      
      return response;
    } catch (error) {
      console.error(`💥 [Soroban RPC] getTransaction Error (${hash}):`, error);
      throw error;
    }
  }
}