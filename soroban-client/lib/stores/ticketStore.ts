import { create } from "zustand";
import { persist } from "zustand/middleware";

interface Ticket {
  tokenId: bigint;
  eventId: number;
  owner: string;
  purchaseDate: number;
  isValid: boolean;
}

interface TicketState {
  tickets: Ticket[];
  selectedTicket: Ticket | null;

  addTicket: (ticket: Ticket) => void;
  updateTicket: (tokenId: bigint, updates: Partial<Ticket>) => void;
  removeTicket: (tokenId: bigint) => void;
  selectTicket: (ticket: Ticket | null) => void;
  getTicketsByEvent: (eventId: number) => Ticket[];
  getTicketsByOwner: (owner: string) => Ticket[];
  reset: () => void;
}

const initialState = {
  tickets: [],
  selectedTicket: null,
};

export const useTicketStore = create<TicketState>()(
  persist(
    (set, get) => ({
      ...initialState,

      addTicket: (ticket) =>
        set((state) => ({
          tickets: [...state.tickets, ticket],
        })),

      updateTicket: (tokenId, updates) =>
        set((state) => ({
          tickets: state.tickets.map((ticket) =>
            ticket.tokenId === tokenId ? { ...ticket, ...updates } : ticket,
          ),
          selectedTicket:
            state.selectedTicket?.tokenId === tokenId
              ? { ...state.selectedTicket, ...updates }
              : state.selectedTicket,
        })),

      removeTicket: (tokenId) =>
        set((state) => ({
          tickets: state.tickets.filter((ticket) => ticket.tokenId !== tokenId),
          selectedTicket:
            state.selectedTicket?.tokenId === tokenId
              ? null
              : state.selectedTicket,
        })),

      selectTicket: (ticket) => set({ selectedTicket: ticket }),

      getTicketsByEvent: (eventId) => {
        return get().tickets.filter((ticket) => ticket.eventId === eventId);
      },

      getTicketsByOwner: (owner) => {
        return get().tickets.filter((ticket) => ticket.owner === owner);
      },

      reset: () => set(initialState),
    }),
    {
      name: "ticket-storage",
    },
  ),
);
