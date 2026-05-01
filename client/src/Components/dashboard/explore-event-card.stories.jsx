import ExploreEventCard from './explore-event-card';

export default {
  title: 'Dashboard/ExploreEventCard',
  component: ExploreEventCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

const mockEvent = {
  id: '1',
  title: 'Web3 Builder Summit',
  date: 'Oct 24, 2026',
  time: '10:00 AM',
  location: 'San Francisco, CA',
  category: 'Conference',
  price: 99,
  image: 'https://images.unsplash.com/photo-1540575861501-7ad0582371f3?auto=format&fit=crop&q=80&w=800',
  description: 'A gathering of the brightest minds in Web3 development and decentralized applications.',
};

export const Default = {
  args: {
    event: mockEvent,
  },
};

export const FreeEvent = {
  args: {
    event: {
      ...mockEvent,
      price: 0,
      title: 'Starknet Meetup',
      category: 'Meetup',
    },
  },
};

export const LongDescription = {
  args: {
    event: {
      ...mockEvent,
      description: 'This is a very long description to test the line clamping. ' +
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. ' +
        'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
    },
  },
};
