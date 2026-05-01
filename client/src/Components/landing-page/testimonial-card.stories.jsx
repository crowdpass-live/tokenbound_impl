import TestimonialCard from './testimonial-card';

export default {
  title: 'LandingPage/TestimonialCard',
  component: TestimonialCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export const Default = {
  args: {
    person: 'https://i.pravatar.cc/150?u=1',
    name: 'Alice Johnson',
    review: 'CrowdPass made our conference organization so much smoother. The Web3 integration is seamless!',
    role: 'Event Organizer',
  },
};

export const Speaker = {
  args: {
    person: 'https://i.pravatar.cc/150?u=2',
    name: 'Bob Smith',
    review: 'As a speaker, I found the platform incredibly easy to use and very professional.',
    role: 'Keynote Speaker',
  },
};

export const Attendee = {
  args: {
    person: 'https://i.pravatar.cc/150?u=3',
    name: 'Charlie Brown',
    review: 'Buying tickets was safe and fast. No more worrying about fake tickets!',
    role: 'Web3 Enthusiast',
  },
};
