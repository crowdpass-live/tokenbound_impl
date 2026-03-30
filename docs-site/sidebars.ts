import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */
const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Getting Started',
      items: ['getting-started/guide'],
    },
    {
      type: 'category',
      label: 'Architecture',
      items: ['architecture/deep-dive'],
    },
    {
      type: 'category',
      label: 'Smart Contracts',
      items: [
        'contracts/tba-account',
        'contracts/tba-registry',
        'contracts/event-manager',
        'contracts/ticket-nft',
        'contracts/ticket-factory',
      ],
    },
    {
      type: 'category',
      label: 'Frontend',
      items: ['frontend/overview'],
    },
  ],
};

export default sidebars;
