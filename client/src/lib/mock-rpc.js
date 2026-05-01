/**
 * Mock RPC transport for testing contract interactions without a live network.
 *
 * Usage:
 *   import { createMockProvider, createMockContract } from './mock-rpc';
 *
 *   const provider = createMockProvider();
 *   const contract = createMockContract(eventAbi, contractAddr, provider);
 *
 *   // Override specific responses
 *   provider.setResponse('starknet_call', req => ['0x5']);
 */

// Seed data that mirrors what the real contract would return
const seedEvents = [
  {
    id: 1n,
    theme: 'Web3 Lagos Conference 2025',
    organizer: '0x1234567890abcdef1234567890abcdef12345678',
    event_type: 'Conference',
    total_tickets: { low: 200n, high: 0n },
    tickets_sold: { low: 45n, high: 0n },
    ticket_price: { low: 50000000000000000000n, high: 0n }, // 50 STRK
    start_date: 1742000000n,
    end_date: 1742086400n,
    is_canceled: false,
    event_ticket_addr: '0xabcdef1234567890abcdef1234567890abcdef12',
  },
  {
    id: 2n,
    theme: 'Blockchain Developer Workshop',
    organizer: '0x1234567890abcdef1234567890abcdef12345678',
    event_type: 'Workshop',
    total_tickets: { low: 50n, high: 0n },
    tickets_sold: { low: 12n, high: 0n },
    ticket_price: { low: 25000000000000000000n, high: 0n },
    start_date: 1742500000n,
    end_date: 1742543200n,
    is_canceled: false,
    event_ticket_addr: '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
  },
];

// Mutable state so tests can manipulate it
let state = {
  events: [...seedEvents],
  userTickets: {}, // key: `${eventId}:${address}` -> tokenId
  nextEventId: seedEvents.length + 1,
};

export function resetMockState() {
  state = {
    events: [...seedEvents],
    userTickets: {},
    nextEventId: seedEvents.length + 1,
  };
}

// --- RPC method handlers ---

const rpcHandlers = {
  starknet_chainId: () => '0x534e5f5345504f4c4941', // SN_SEPOLIA

  starknet_blockNumber: () => 100000,

  starknet_getTransactionReceipt: ({ transaction_hash }) => ({
    transaction_hash,
    actual_fee: '0x0',
    status: 'ACCEPTED_ON_L2',
    block_hash: '0xabc',
    block_number: 100000,
    type: 'INVOKE',
    execution_status: 'SUCCEEDED',
    finality_status: 'ACCEPTED_ON_L2',
    events: [],
  }),

  starknet_call: ({ request }) => {
    const { entry_point_selector, calldata, contract_address } = request;
    return dispatchContractCall(entry_point_selector, calldata, contract_address);
  },

  starknet_addInvokeTransaction: () => ({
    transaction_hash: `0x${Date.now().toString(16)}mock`,
  }),

  starknet_getNonce: () => '0x0',

  starknet_estimateFee: () => [{ gas_consumed: '0x1', gas_price: '0x1', overall_fee: '0x1' }],
};

function dispatchContractCall(selector, calldata) {
  const name = selectorToName(selector);

  switch (name) {
    case 'get_event_count':
      return [state.events.length.toString()];

    case 'get_event': {
      const id = Number(calldata[0]);
      const ev = state.events.find(e => Number(e.id) === id);
      if (!ev) throw mockError('Event not found', 'ENTRYPOINT_FAILED');
      return serializeEvent(ev);
    }

    case 'user_event_ticket': {
      const eventId = calldata[0];
      const user = calldata[1];
      const ticket = state.userTickets[`${eventId}:${user}`] ?? 0n;
      return [ticket.toString(), '0'];
    }

    case 'balance_of':
      // 1000 STRK
      return ['0x3635c9adc5dea00000', '0x0'];

    default:
      return ['0x1'];
  }
}

// Simulate write transactions (called by the mock account)
const writeHandlers = {
  create_event(calldata) {
    const [theme, event_type, start_date, end_date, ticket_price_low, , total_tickets_low] =
      calldata;
    const id = state.nextEventId++;
    state.events.push({
      id: BigInt(id),
      theme,
      organizer: '0xmockuser',
      event_type,
      total_tickets: { low: BigInt(total_tickets_low ?? 0), high: 0n },
      tickets_sold: { low: 0n, high: 0n },
      ticket_price: { low: BigInt(ticket_price_low ?? 0), high: 0n },
      start_date: BigInt(start_date ?? 0),
      end_date: BigInt(end_date ?? 0),
      is_canceled: false,
      event_ticket_addr: '0x0',
    });
    return { transaction_hash: `0x${Date.now().toString(16)}create` };
  },

  reschedule_event(calldata) {
    const [event_id, start_date, end_date] = calldata;
    const ev = state.events.find(e => Number(e.id) === Number(event_id));
    if (ev) {
      ev.start_date = BigInt(start_date);
      ev.end_date = BigInt(end_date);
    }
    return { transaction_hash: `0x${Date.now().toString(16)}reschedule` };
  },

  cancel_event(calldata) {
    const [event_id] = calldata;
    const ev = state.events.find(e => Number(e.id) === Number(event_id));
    if (ev) ev.is_canceled = true;
    return { transaction_hash: `0x${Date.now().toString(16)}cancel` };
  },

  purchase_ticket(calldata) {
    const [event_id] = calldata;
    const ev = state.events.find(e => Number(e.id) === Number(event_id));
    if (!ev) throw mockError('Event not found', 'ENTRYPOINT_FAILED');
    if (ev.is_canceled) throw mockError('Event is canceled', 'ENTRYPOINT_FAILED');
    ev.tickets_sold.low += 1n;
    state.userTickets[`${event_id}:0xmockuser`] = ev.tickets_sold.low;
    return { transaction_hash: `0x${Date.now().toString(16)}purchase` };
  },

  claim_ticket_refund(calldata) {
    const [event_id] = calldata;
    const ev = state.events.find(e => Number(e.id) === Number(event_id));
    if (ev && !ev.is_canceled) throw mockError('Event not canceled', 'ENTRYPOINT_FAILED');
    return { transaction_hash: `0x${Date.now().toString(16)}refund` };
  },

  approve() {
    return { transaction_hash: `0x${Date.now().toString(16)}approve` };
  },
};

// --- Provider factory ---

export function createMockProvider() {
  const customHandlers = {};

  const provider = {
    // Allow tests to override any RPC method
    setResponse(method, handler) {
      customHandlers[method] = handler;
    },

    async callRpc(method, params) {
      await tick();
      const handler = customHandlers[method] ?? rpcHandlers[method];
      if (!handler) throw mockError(`Unhandled RPC method: ${method}`, 'METHOD_NOT_FOUND');
      return handler(params ?? {});
    },

    // starknet.js RpcProvider interface
    async getChainId() {
      return this.callRpc('starknet_chainId');
    },
    async getBlockNumber() {
      return this.callRpc('starknet_blockNumber');
    },
    async callContract(call, blockIdentifier = 'latest') {
      return this.callRpc('starknet_call', { request: call, block_id: blockIdentifier });
    },
    async getTransactionReceipt(txHash) {
      return this.callRpc('starknet_getTransactionReceipt', { transaction_hash: txHash });
    },
    async getNonce(address) {
      return this.callRpc('starknet_getNonce', { contract_address: address });
    },
    async estimateFee(calls) {
      return this.callRpc('starknet_estimateFee', { request: calls });
    },
    async waitForTransaction(txHash) {
      await tick(50);
      return this.getTransactionReceipt(txHash);
    },
  };

  return provider;
}

// --- Mock account (for write operations) ---

export function createMockAccount(address = '0xmockuser') {
  return {
    address,
    async execute(calls) {
      await tick();
      const call = Array.isArray(calls) ? calls[0] : calls;
      const name = selectorToName(call.entrypoint);
      const handler = writeHandlers[name];
      if (!handler) return { transaction_hash: `0x${Date.now().toString(16)}generic` };
      return handler(call.calldata ?? []);
    },
    async signMessage() {
      return ['0xsig1', '0xsig2'];
    },
  };
}

// --- Mock Contract wrapper ---

export function createMockContract(abi, address, providerOrAccount) {
  const isAccount = 'execute' in providerOrAccount;
  const provider = isAccount ? createMockProvider() : providerOrAccount;
  const account = isAccount ? providerOrAccount : null;

  const contract = { address, abi };

  // Functions can be top-level or nested inside interface entries
  const functions = abi.flatMap(entry => {
    if (entry.type === 'function') return [entry];
    if (entry.type === 'interface' && Array.isArray(entry.items))
      return entry.items.filter(i => i.type === 'function');
    return [];
  });

  for (const entry of functions) {
    const { name, state_mutability } = entry;

    if (state_mutability === 'view') {
      contract[name] = async (...args) => {
        return provider.callContract({
          contract_address: address,
          entry_point_selector: name,
          calldata: args.map(String),
        });
      };
    } else {
      contract[name] = async (...args) => {
        if (!account) throw mockError('No account connected', 'NO_ACCOUNT');
        return account.execute({ entrypoint: name, calldata: args.map(String) });
      };
    }
  }

  return contract;
}

// --- Helpers ---

function selectorToName(selector) {
  if (typeof selector === 'string' && !selector.startsWith('0x')) return selector;
  return selector;
}

function serializeEvent(ev) {
  return [
    ev.id.toString(),
    ev.theme,
    ev.organizer,
    ev.event_type,
    ev.total_tickets.low.toString(),
    ev.total_tickets.high.toString(),
    ev.tickets_sold.low.toString(),
    ev.tickets_sold.high.toString(),
    ev.ticket_price.low.toString(),
    ev.ticket_price.high.toString(),
    ev.start_date.toString(),
    ev.end_date.toString(),
    ev.is_canceled ? '1' : '0',
    ev.event_ticket_addr,
  ];
}

function mockError(message, code = 'MOCK_ERROR') {
  const err = new Error(message);
  err.code = code;
  return err;
}

function tick(ms = 10) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
