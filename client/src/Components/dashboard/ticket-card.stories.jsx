import TicketCard from './ticket-card';

export default {
  title: 'Dashboard/TicketCard',
  component: TicketCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export const Default = {
  args: {
    id: '123',
    eventName: 'Web3 Builder Summit',
    date: 'Oct 24, 2026',
    image: 'https://images.unsplash.com/photo-1540575861501-7ad0582371f3?auto=format&fit=crop&q=80&w=800',
  },
};

export const ShortName = {
  args: {
    id: '456',
    eventName: 'Starknet Meetup',
    date: 'Dec 12, 2026',
    image: 'https://images.unsplash.com/photo-1582192732810-093f412499fc?auto=format&fit=crop&q=80&w=800',
  },
};
