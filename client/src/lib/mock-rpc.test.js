import { describe, it, expect, beforeEach } from 'vitest';
import {
  createMockProvider,
  createMockAccount,
  createMockContract,
  resetMockState,
} from './mock-rpc';
import eventAbi from '../Abis/eventAbi.json';

const CONTRACT_ADDR = '0x767b1f18bcfe9f131d797fdefe0a5adc8d268cf67d0b3f02122b3e56f3aa38d';

beforeEach(() => resetMockState());

describe('createMockProvider', () => {
  it('returns chain id', async () => {
    const provider = createMockProvider();
    const chainId = await provider.getChainId();
    expect(chainId).toBe('0x534e5f5345504f4c4941');
  });

  it('returns a block number', async () => {
    const provider = createMockProvider();
    expect(await provider.getBlockNumber()).toBeGreaterThan(0);
  });

  it('allows overriding a response', async () => {
    const provider = createMockProvider();
    provider.setResponse('starknet_blockNumber', () => 999);
    expect(await provider.getBlockNumber()).toBe(999);
  });

  it('throws on unknown method', async () => {
    const provider = createMockProvider();
    await expect(provider.callRpc('starknet_unknown')).rejects.toThrow('Unhandled RPC method');
  });
});

describe('contract read calls', () => {
  it('get_event_count returns seed count', async () => {
    const provider = createMockProvider();
    const contract = createMockContract(eventAbi, CONTRACT_ADDR, provider);
    const result = await contract.get_event_count();
    expect(Number(result[0])).toBe(2);
  });

  it('get_event returns event data', async () => {
    const provider = createMockProvider();
    const contract = createMockContract(eventAbi, CONTRACT_ADDR, provider);
    const result = await contract.get_event(1);
    expect(result[1]).toBe('Web3 Lagos Conference 2025');
  });

  it('get_event throws for unknown id', async () => {
    const provider = createMockProvider();
    const contract = createMockContract(eventAbi, CONTRACT_ADDR, provider);
    await expect(contract.get_event(999)).rejects.toThrow('Event not found');
  });

  it('user_event_ticket returns 0 for no ticket', async () => {
    const provider = createMockProvider();
    const contract = createMockContract(eventAbi, CONTRACT_ADDR, provider);
    const result = await contract.user_event_ticket(1, '0xsomeuser');
    expect(result[0]).toBe('0');
  });
});

describe('contract write calls', () => {
  it('purchase_ticket increments tickets_sold', async () => {
    const account = createMockAccount();
    const provider = createMockProvider();
    const writeContract = createMockContract(eventAbi, CONTRACT_ADDR, account);
    const readContract = createMockContract(eventAbi, CONTRACT_ADDR, provider);

    const tx = await writeContract.purchase_ticket(1);
    expect(tx.transaction_hash).toMatch(/mock/);

    const event = await readContract.get_event(1);
    expect(Number(event[6])).toBe(46); // tickets_sold.low at index 6
  });

  it('cancel_event marks event as canceled', async () => {
    const account = createMockAccount();
    const provider = createMockProvider();
    const writeContract = createMockContract(eventAbi, CONTRACT_ADDR, account);
    const readContract = createMockContract(eventAbi, CONTRACT_ADDR, provider);

    await writeContract.cancel_event(1);
    const event = await readContract.get_event(1);
    expect(event[12]).toBe('1'); // is_canceled at index 12
  });

  it('purchase_ticket on canceled event throws', async () => {
    const account = createMockAccount();
    const contract = createMockContract(eventAbi, CONTRACT_ADDR, account);
    await contract.cancel_event(1);
    await expect(contract.purchase_ticket(1)).rejects.toThrow('Event is canceled');
  });

  it('create_event adds a new event', async () => {
    const account = createMockAccount();
    const provider = createMockProvider();
    const writeContract = createMockContract(eventAbi, CONTRACT_ADDR, account);
    const readContract = createMockContract(eventAbi, CONTRACT_ADDR, provider);

    await writeContract.create_event('New Event', 'Meetup', 1750000000, 1750086400, 10n, 0n, 100n, 0n);
    const count = await readContract.get_event_count();
    expect(Number(count[0])).toBe(3);
  });

  it('reschedule_event updates dates', async () => {
    const account = createMockAccount();
    const provider = createMockProvider();
    const writeContract = createMockContract(eventAbi, CONTRACT_ADDR, account);
    const readContract = createMockContract(eventAbi, CONTRACT_ADDR, provider);

    await writeContract.reschedule_event(1, 1800000000, 1800086400);
    const event = await readContract.get_event(1);
    expect(event[10]).toBe('1800000000'); // start_date at index 10
  });
});

describe('waitForTransaction', () => {
  it('resolves with a receipt', async () => {
    const provider = createMockProvider();
    const receipt = await provider.waitForTransaction('0xabc123');
    expect(receipt.execution_status).toBe('SUCCEEDED');
  });
});
