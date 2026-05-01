import { create } from "zustand";
import type { EventRecord } from "../sdk/src/types";

interface EventState {
  events: EventRecord[];
  selectedEvent: EventRecord | null;
  loading: boolean;
  error: string | null;

  setEvents: (events: EventRecord[]) => void;
  addEvent: (event: EventRecord) => void;
  updateEvent: (eventId: number, updates: Partial<EventRecord>) => void;
  selectEvent: (event: EventRecord | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  events: [],
  selectedEvent: null,
  loading: false,
  error: null,
};

export const useEventStore = create<EventState>((set) => ({
  ...initialState,

  setEvents: (events) => set({ events, error: null }),

  addEvent: (event) =>
    set((state) => ({
      events: [...state.events, event],
      error: null,
    })),

  updateEvent: (eventId, updates) =>
    set((state) => ({
      events: state.events.map((event) =>
        event.id === eventId ? { ...event, ...updates } : event,
      ),
      selectedEvent:
        state.selectedEvent?.id === eventId
          ? { ...state.selectedEvent, ...updates }
          : state.selectedEvent,
    })),

  selectEvent: (event) => set({ selectedEvent: event }),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  reset: () => set(initialState),
}));
