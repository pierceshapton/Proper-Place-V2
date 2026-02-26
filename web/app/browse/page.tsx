'use client';

import { useState } from 'react';

interface Venue {
  id: number;
  name: string;
  location: string;
  price: number;
  capacity: number;
  rating: number;
  image?: string;
}

export default function BrowsePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');

  // Mock venue data
  const venues: Venue[] = [
    { id: 1, name: 'Downtown Loft', location: 'New York, NY', price: 500, capacity: 30, rating: 4.8 },
    { id: 2, name: 'Garden Estate', location: 'Los Angeles, CA', price: 750, capacity: 50, rating: 4.9 },
    { id: 3, name: 'Modern Studio', location: 'Chicago, IL', price: 400, capacity: 20, rating: 4.7 },
    { id: 4, name: 'Rooftop Terrace', location: 'Miami, FL', price: 600, capacity: 40, rating: 4.8 },
    { id: 5, name: 'Vintage Apartment', location: 'San Francisco, CA', price: 550, capacity: 25, rating: 4.6 },
    { id: 6, name: 'Beach House', location: 'San Diego, CA', price: 800, capacity: 60, rating: 4.9 },
    { id: 7, name: 'Warehouse Space', location: 'Austin, TX', price: 400, capacity: 80, rating: 4.7 },
    { id: 8, name: 'Boutique Hotel Room', location: 'Boston, MA', price: 300, capacity: 15, rating: 4.8 },
    { id: 9, name: 'Art Gallery', location: 'Brooklyn, NY', price: 650, capacity: 35, rating: 4.9 },
  ];

  const filteredVenues = venues.filter(venue =>
    venue.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    venue.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <main>
      {/* Hero Section */}
      <section className="bg-dark-bg text-white py-12 md:py-16">
        <div className="container-md">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">Browse Venues</h1>
          <p className="text-xl text-gray-300">Discover amazing spaces for your next event</p>
        </div>
      </section>

      {/* Search and Filter Section */}
      <section className="section-padding bg-light-gray">
        <div className="container-md">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <input
              type="text"
              placeholder="Search by location or venue name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="md:col-span-2"
            />

            <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
              <option value="all">All Types</option>
              <option value="loft">Loft</option>
              <option value="garden">Garden</option>
              <option value="studio">Studio</option>
              <option value="rooftop">Rooftop</option>
            </select>
          </div>

          <p className="text-gray-600 mt-4">
            Found {filteredVenues.length} venue{filteredVenues.length !== 1 ? 's' : ''}
          </p>
        </div>
      </section>

      {/* Venues Grid */}
      <section className="section-padding">
        <div className="container-md">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredVenues.map((venue) => (
              <div key={venue.id} className="card card-hover overflow-hidden">
                <div className="bg-gradient-to-br from-light-blue to-accent-blue h-48 flex items-center justify-center text-white text-lg">
                  {venue.name}
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-semibold mb-2">{venue.name}</h3>
                  
                  <div className="flex items-center gap-2 mb-3 text-gray-600 text-sm">
                    <span>📍 {venue.location}</span>
                  </div>

                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-yellow-400">★</span>
                    <span className="font-semibold">{venue.rating}</span>
                    <span className="text-gray-500 text-sm">({Math.floor(Math.random() * 100 + 20)} reviews)</span>
                  </div>

                  <div className="flex justify-between items-center mb-4 pb-4 border-b border-border-gray">
                    <div>
                      <p className="text-sm text-gray-600">Capacity</p>
                      <p className="font-semibold">Up to {venue.capacity} people</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-3xl font-bold text-light-blue">${venue.price}</span>
                    <button className="btn-primary btn-small">
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredVenues.length === 0 && (
            <div className="text-center py-12">
              <p className="text-2xl text-gray-600 mb-4">No venues found</p>
              <p className="text-gray-500">Try adjusting your search or filters</p>
            </div>
          )}
        </div>
      </section>

      {/* More Venues Coming Section */}
      <section className="bg-light-gray py-16">
        <div className="container-md text-center">
          <h2 className="text-3xl font-bold mb-4">Looking for something specific?</h2>
          <p className="text-gray-600 mb-6 text-lg">
            New venues are added regularly. Sign up to get notified when venues matching your interests become available.
          </p>
          <input
            type="email"
            placeholder="Enter your email"
            className="max-w-md mb-4"
          />
          <br />
          <button className="btn-primary">Notify Me</button>
        </div>
      </section>
    </main>
  );
}
