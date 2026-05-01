import { describe, it, expect, vi, beforeEach } from 'vitest';
import soroban, { freighterApi, sorobanContract } from '../lib/soroban';

describe('Soroban Library Mock', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('provides a functional freighterApi mock', async () => {
        const isConnected = await freighterApi.isConnected();
        expect(isConnected).toBe(true);

        const address = await freighterApi.getAddress();
        expect(address).toBe('GBXXXXX...');
    });

    it('provides a functional sorobanContract mock for creating events', async () => {
        const result = await sorobanContract.createEvent({
            theme: "Test Event",
            type: "meetup",
            startTime: 123456,
            endTime: 234567,
            ticketPrice: 10,
            total_ticket: 100
        });

        expect(result.status).toBe('success');
        expect(result.txHash).toBe('tx_mock_hash');
    });

    it('provides a functional sorobanContract mock for canceling events', async () => {
        const result = await sorobanContract.cancelEvent("event_id_123");

        expect(result.status).toBe('success');
        expect(result.txHash).toBe('tx_mock_hash_cancel');
    });
});
