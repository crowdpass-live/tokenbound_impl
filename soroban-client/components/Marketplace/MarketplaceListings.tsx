'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { ListingCard } from './ListingCard';
import { CreateListingForm } from './CreateListingForm';

export const MarketplaceListings = () => {
  const { address, isConnected } = useWallet();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filter, setFilter] = useState<'all' | 'my'>('all');

  useEffect(() => {
    fetchListings();
  }, [filter]);

  const fetchListings = async () => {
    try {
      setLoading(true);
      const url = filter === 'all' 
        ? '/api/marketplace/listings'
        : `/api/marketplace/listings?seller=${address}`;
      
      const response = await fetch(url);
      const data = await response.json();
      setListings(data);
    } catch (error) {
      console.error('Failed to fetch listings:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-white text-lg">Loading listings...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Ticket Marketplace</h1>
          <p className="text-gray-400 mt-2">Buy and sell tickets peer-to-peer</p>
        </div>
        
        <div className="flex gap-3">
          <div className="flex bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-md transition ${
                filter === 'all' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              All Listings
            </button>
            {isConnected && (
              <button
                onClick={() => setFilter('my')}
                className={`px-4 py-2 rounded-md transition ${
                  filter === 'my' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                My Listings
              </button>
            )}
          </div>
          
          {isConnected && (
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              {showCreateForm ? 'Cancel' : '+ List Ticket'}
            </button>
          )}
        </div>
      </div>

      {showCreateForm && (
        <div className="mb-8">
          <CreateListingForm onSuccess={() => {
            setShowCreateForm(false);
            fetchListings();
          }} />
        </div>
      )}

      {listings.length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          <div className="text-6xl mb-4">🎫</div>
          <p className="text-lg">No tickets available for resale at the moment.</p>
          {isConnected && (
            <div className="mt-4">
              <button
                onClick={() => setShowCreateForm(true)}
                className="text-blue-500 hover:text-blue-400 underline"
              >
                Be the first to list a ticket!
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              onPurchase={fetchListings}
            />
          ))}
        </div>
      )}
    </div>
  );
};