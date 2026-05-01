import FeaturesCard from './features-card';

export default {
  title: 'LandingPage/FeaturesCard',
  component: FeaturesCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export const Default = {
  args: {
    icon: 'https://img.icons8.com/color/96/ok-filled.png',
    title: 'Easy Registration',
    description: 'Quick and simple registration process for all participants and organizers.',
  },
};

export const Security = {
  args: {
    icon: 'https://img.icons8.com/color/96/shield.png',
    title: 'Secure Payments',
    description: 'Decentralized payments powered by Starknet for maximum security and transparency.',
  },
};
