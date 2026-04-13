'use client';

import { useState, useCallback, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://octopus-app-lxh2t.ondigitalocean.app';
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyBqXtdl4q7VW4PEbK2dKsdouT1d_35WTy0';

// UK center coordinates (same as app default)
const DEFAULT_CENTER = { lat: 54.5, lng: -2.5 };
const DEFAULT_ZOOM = 6;
const MIN_ZOOM_FOR_MARKERS = 11;

// Security: Prevent console access to data
if (typeof window !== 'undefined') {
  // Warn in console about data protection
  console.log('%c⚠️ WARNING', 'color: red; font-size: 24px; font-weight: bold;');
  console.log('%cThis browser feature is intended for developers only.', 'font-size: 14px;');
  console.log('%cLocation data on this platform is protected and monitored.', 'font-size: 14px;');
  console.log('%cUnauthorised scraping or export of data is prohibited.', 'font-size: 14px; color: red;');
}

interface Place {
  place_id: string;
  name: string;
  description: string;
  location_address: string;
  location_lat: number;
  location_lng: number;
  price_per_night: number;
  max_guests: number;
  amenities: string[];
  images: string[];
  host_id: string;
  approval_status: string;
  max_vehicle_height_ft?: number;
  max_vehicle_width_ft?: number;
  max_vehicle_length_ft?: number;
}

interface PlaceReview {
  rating: number;
  comment: string;
  user_name: string;
}

const containerStyle = {
  width: '100%',
  height: '100%',
};

// Map styling to match the app
const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: true,
  zoomControl: false,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
};

export default function BrowsePage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
  const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMarkers, setShowMarkers] = useState(false);
  const [zoomHintDismissed, setZoomHintDismissed] = useState(false);
  const [placeReviews, setPlaceReviews] = useState<{ [key: string]: PlaceReview[] }>({});
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite' | 'terrain' | 'hybrid'>('roadmap');
  const [showSearch, setShowSearch] = useState(false);
  const [showRouteForm, setShowRouteForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [startAddress, setStartAddress] = useState('');
  const [destAddress, setDestAddress] = useState('');
  const [maxTimeOffRoute, setMaxTimeOffRoute] = useState(15);

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  });

  // Load places from API
  useEffect(() => {
    const fetchPlaces = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`${API_BASE_URL}/places`);
        if (!response.ok) throw new Error('Failed to fetch places');
        const data = await response.json();
        const rawPlaces = data.places || data || [];
        // Map API fields to interface and filter to only approved places
        const approvedPlaces = rawPlaces
          .filter((p: any) => p.approval_status === 'approved')
          .map((p: any): Place => ({
            place_id: String(p.id),
            name: p.name,
            description: p.description || '',
            location_address: p.address || '',
            location_lat: parseFloat(p.latitude),
            location_lng: parseFloat(p.longitude),
            price_per_night: parseFloat(p.price_per_night) || 0,
            max_guests: p.capacity || 1,
            amenities: p.amenities || [],
            images: p.image_urls || [],
            host_id: String(p.owner_id),
            approval_status: p.approval_status,
          }));
        setPlaces(approvedPlaces);
        setError(null);
      } catch (err) {
        console.error('Error fetching places:', err);
        setError('Failed to load places. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlaces();
  }, []);

  // Load favorites from localStorage
  useEffect(() => {
    const savedFavorites = localStorage.getItem('favorite_places');
    if (savedFavorites) {
      setFavorites(new Set(JSON.parse(savedFavorites)));
    }
  }, []);

  // Security: Prevent data scraping via right-click and keyboard shortcuts
  useEffect(() => {
    const preventContextMenu = (e: MouseEvent) => {
      // Only prevent on map area
      const target = e.target as HTMLElement;
      if (target.closest('.gm-style') || target.closest('[data-protected]')) {
        e.preventDefault();
      }
    };

    const preventKeyboardShortcuts = (e: KeyboardEvent) => {
      // Prevent Ctrl+S (save page), Ctrl+U (view source)
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 's' || e.key === 'S' || e.key === 'u' || e.key === 'U') {
          e.preventDefault();
        }
      }
    };

    document.addEventListener('contextmenu', preventContextMenu);
    document.addEventListener('keydown', preventKeyboardShortcuts);

    return () => {
      document.removeEventListener('contextmenu', preventContextMenu);
      document.removeEventListener('keydown', preventKeyboardShortcuts);
    };
  }, []);

  // Save favorites to localStorage
  const toggleFavorite = (placeId: string) => {
    setFavorites((prev) => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(placeId)) {
        newFavorites.delete(placeId);
      } else {
        newFavorites.add(placeId);
      }
      localStorage.setItem('favorite_places', JSON.stringify([...newFavorites]));
      return newFavorites;
    });
  };

  // Fetch reviews for a place
  const fetchPlaceReviews = async (placeId: string) => {
    if (placeReviews[placeId]) return; // Already fetched
    try {
      const response = await fetch(`${API_BASE_URL}/reviews/places/${placeId}/reviews`);
      if (response.ok) {
        const data = await response.json();
        setPlaceReviews((prev) => ({ ...prev, [placeId]: data.reviews || [] }));
      }
    } catch (err) {
      console.error('Error fetching reviews:', err);
    }
  };

  // Calculate average rating
  const getAverageRating = (placeId: string): number => {
    const reviews = placeReviews[placeId];
    if (!reviews || reviews.length === 0) return 0;
    const total = reviews.reduce((sum, r) => sum + (r.rating || 0), 0);
    return total / reviews.length;
  };

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const onZoomChanged = useCallback(() => {
    if (map) {
      const zoom = map.getZoom() || DEFAULT_ZOOM;
      setMapZoom(zoom);
      setShowMarkers(zoom >= MIN_ZOOM_FOR_MARKERS);
      // Dismiss zoom hint on any zoom in (one-time hint)
      if (zoom > DEFAULT_ZOOM) {
        setZoomHintDismissed(true);
      }
    }
  }, [map]);

  // Get user's current location
  const goToCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setMapCenter(pos);
          map?.panTo(pos);
          map?.setZoom(14);
        },
        () => {
          alert('Could not get your location. Please enable location services.');
        }
      );
    }
  };

  // Custom marker icons matching the Flutter app
  const getMarkerIcon = (isFavorite: boolean): google.maps.Icon => {
    if (isFavorite) {
      return {
        url: '/map-pin-heart.svg',
        scaledSize: new google.maps.Size(32, 32),
        anchor: new google.maps.Point(16, 28),
      };
    }
    return {
      url: '/map-pin-blue.png',
      scaledSize: new google.maps.Size(30, 44),
      anchor: new google.maps.Point(15, 44),
    };
  };

  const handleMarkerClick = (place: Place) => {
    setSelectedPlace(place);
    fetchPlaceReviews(place.place_id);
  };

  if (loadError) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">Error loading maps. Please refresh the page.</p>
      </main>
    );
  }

  return (
    <main className="flex flex-col overflow-hidden" data-protected="true">
      {/* Map Container - fills remaining viewport height below navbar */}
      <div className="h-[calc(100vh-96px)] relative" data-protected="true">
        {!isLoaded || isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading map...</p>
            </div>
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="text-center">
              <p className="text-red-500 mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 hover:text-gray-900"
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          <>
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={mapCenter}
              zoom={mapZoom}
              onLoad={onLoad}
              onUnmount={onUnmount}
              onZoomChanged={onZoomChanged}
              options={mapOptions}
              mapTypeId={mapType}
            >
              {/* Place Markers - only show when zoomed in */}
              {showMarkers &&
                places.map((place) => (
                  <Marker
                    key={place.place_id}
                    position={{ lat: place.location_lat, lng: place.location_lng }}
                    icon={getMarkerIcon(favorites.has(place.place_id))}
                    onClick={() => handleMarkerClick(place)}
                    title={place.name}
                  />
                ))}


            </GoogleMap>

            {/* Top Left - Plan Route Button */}
            <div className="absolute top-6 left-3">
              <button
                onClick={() => setShowRouteForm(true)}
                className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-lg hover:bg-gray-50 transition-colors"
              >
                <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                <span className="text-gray-700 font-medium">Plan Route</span>
              </button>
            </div>

            {/* Left Side - Search Button */}
            <div className="absolute top-[72px] left-3">
              <button
                onClick={() => setShowSearch(true)}
                className="w-12 h-12 bg-white rounded-xl shadow-lg hover:bg-gray-50 transition-colors flex items-center justify-center"
                title="Search places"
              >
                <svg className="w-6 h-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>

            {/* Left Side - My Location Button */}
            <div className="absolute top-[128px] left-3">
              <button
                onClick={goToCurrentLocation}
                className="w-10 h-10 bg-white rounded-xl shadow-lg hover:bg-gray-50 transition-colors flex items-center justify-center"
                title="Go to my location"
              >
                <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>

            {/* Top Right - Map Type Buttons */}
            <div className="absolute top-6 right-3 flex flex-col gap-2">
              <button
                onClick={() => setMapType('roadmap')}
                className={`w-10 h-10 rounded-lg shadow-lg transition-colors flex items-center justify-center ${mapType === 'roadmap' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                title="Standard map"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </button>
              <button
                onClick={() => setMapType('satellite')}
                className={`w-10 h-10 rounded-lg shadow-lg transition-colors flex items-center justify-center ${mapType === 'satellite' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                title="Satellite view"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              <button
                onClick={() => setMapType('terrain')}
                className={`w-10 h-10 rounded-lg shadow-lg transition-colors flex items-center justify-center ${mapType === 'terrain' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                title="Terrain view"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15l5.12-5.12a3 3 0 014.24 0L15 12.36m0 0l1.76-1.76a3 3 0 014.24 0L21 15M3 21h18" />
                </svg>
              </button>
              <button
                onClick={() => setMapType('hybrid')}
                className={`w-10 h-10 rounded-lg shadow-lg transition-colors flex items-center justify-center ${mapType === 'hybrid' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                title="Hybrid view"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </button>
            </div>

            {/* Zoom Hint - only shows once, dismissed after any zoom in */}
            {!showMarkers && !zoomHintDismissed && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-sm px-6 py-4 rounded-lg shadow-lg text-center">
                <p className="text-gray-700 font-medium">Zoom in to see available places</p>
                <p className="text-sm text-gray-500 mt-1">Use scroll or pinch to zoom</p>
              </div>
            )}
          </>
        )}

        {/* Place Details Panel */}
        {selectedPlace && (
          <PlaceDetailsPanel
            place={selectedPlace}
            isFavorite={favorites.has(selectedPlace.place_id)}
            onToggleFavorite={() => toggleFavorite(selectedPlace.place_id)}
            onClose={() => setSelectedPlace(null)}
            averageRating={getAverageRating(selectedPlace.place_id)}
            reviews={placeReviews[selectedPlace.place_id] || []}
          />
        )}

        {/* Search Modal - Bottom Sheet Style */}
        {showSearch && (
          <div className="absolute inset-0 bg-black/50 z-50 flex items-end sm:items-start sm:justify-center sm:pt-20">
            <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md sm:mx-4 overflow-hidden max-h-[80vh]">
              {/* Handle bar for mobile */}
              <div className="sm:hidden flex justify-center pt-3 pb-1">
                <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
              </div>
              
              {/* Header */}
              <div className="p-4 border-b">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold">Search Location</h3>
                  <button
                    onClick={() => {
                      setShowSearch(false);
                      setSearchQuery('');
                    }}
                    className="p-2 hover:bg-gray-100 rounded-full"
                  >
                    <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search places or addresses..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                    autoFocus
                  />
                </div>
              </div>
              
              {/* Results */}
              <div className="overflow-y-auto max-h-[60vh]">
                {places
                  .filter((p) =>
                    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    p.location_address.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((place) => (
                    <button
                      key={place.place_id}
                      onClick={() => {
                        setSelectedPlace(place);
                        setMapCenter({ lat: place.location_lat, lng: place.location_lng });
                        map?.panTo({ lat: place.location_lat, lng: place.location_lng });
                        map?.setZoom(14);
                        setShowSearch(false);
                        setSearchQuery('');
                      }}
                      className="w-full p-4 text-left hover:bg-gray-50 border-b last:border-b-0 flex items-start gap-3"
                    >
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900">{place.name}</p>
                        <p className="text-sm text-gray-500 truncate">{place.location_address}</p>
                        <p className="text-sm text-blue-500 font-medium mt-1">£{place.price_per_night}/night</p>
                      </div>
                    </button>
                  ))}
                {places.filter((p) =>
                  p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  p.location_address.toLowerCase().includes(searchQuery.toLowerCase())
                ).length === 0 && (
                  <div className="p-8 text-center">
                    <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <p className="text-gray-500">No places found</p>
                    <p className="text-sm text-gray-400 mt-1">Try a different search term</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Route Planning Modal */}
        {showRouteForm && (
          <div className="absolute inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
            <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md sm:mx-4 max-h-[85vh] overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 bg-white p-4 border-b flex items-center justify-between z-10">
                <h3 className="text-xl font-bold">Plan Your Route</h3>
                <button
                  onClick={() => setShowRouteForm(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-4 space-y-5">
                {/* Starting Location */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Starting Location</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter starting address..."
                      value={startAddress}
                      onChange={(e) => setStartAddress(e.target.value)}
                      className="flex-1 px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => {
                        if (navigator.geolocation) {
                          navigator.geolocation.getCurrentPosition(
                            () => setStartAddress('My Location'),
                            () => alert('Could not get location')
                          );
                        }
                      }}
                      className="px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 hover:text-gray-900 transition-colors"
                      title="Use my location"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Destination */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Destination</label>
                  <input
                    type="text"
                    placeholder="Enter destination address..."
                    value={destAddress}
                    onChange={(e) => setDestAddress(e.target.value)}
                    className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Max Time Off Route */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1">Max Time Off Route</label>
                  <p className="text-sm text-gray-500 mb-4">How far off your route are you willing to travel?</p>
                  
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                    <div className="text-center mb-4">
                      <span className="text-4xl font-bold text-blue-600">{maxTimeOffRoute}</span>
                      <span className="text-lg text-blue-600 ml-1">minutes</span>
                    </div>
                    
                    <input
                      type="range"
                      min="1"
                      max="60"
                      value={maxTimeOffRoute}
                      onChange={(e) => setMaxTimeOffRoute(parseInt(e.target.value))}
                      className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                    
                    <div className="flex justify-between mt-2 text-xs text-gray-500">
                      <span>1 min</span>
                      <span>60 min</span>
                    </div>
                  </div>
                </div>

                {/* Find Places Button */}
                <button
                  onClick={() => {
                    if (!startAddress || !destAddress) {
                      alert('Please enter both starting location and destination');
                      return;
                    }
                    setShowRouteForm(false);
                    alert(`Finding places within ${maxTimeOffRoute} minutes of your route from "${startAddress}" to "${destAddress}".`);
                  }}
                  className="w-full py-3 bg-blue-500 text-white rounded-lg font-bold hover:bg-blue-600 hover:text-gray-900 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Find Places on Route
                </button>

                {/* Route navigation note */}
                <div className="bg-gray-100 rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-600">
                    Use the map to find places along your route
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

// Place Details Panel Component (matches app's modal)
function PlaceDetailsPanel({
  place,
  isFavorite,
  onToggleFavorite,
  onClose,
  averageRating,
  reviews,
}: {
  place: Place;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onClose: () => void;
  averageRating: number;
  reviews: PlaceReview[];
}) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const images = place.images || [];

  return (
    <div className="absolute bottom-0 left-0 right-0 md:left-auto md:right-6 md:bottom-6 md:w-96 bg-white rounded-t-2xl md:rounded-2xl shadow-2xl max-h-[70vh] overflow-y-auto">
      {/* Header with Title */}
      <div className="sticky top-0 bg-white p-4 border-b flex items-center justify-between z-10">
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold truncate">{place.name}</h3>
            {averageRating > 0 && (
              <div className="flex items-center gap-1 flex-shrink-0">
                <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="text-sm font-medium">{averageRating.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleFavorite}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg
              className={`w-6 h-6 ${isFavorite ? 'text-red-500 fill-current' : 'text-gray-400'}`}
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Image */}
      <div className="relative h-48 bg-gradient-to-br from-blue-400 to-blue-600">
        {images.length > 0 ? (
          <>
            <img
              src={images[currentImageIndex]}
              alt={place.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            {images.length > 1 && (
              <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1">
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentImageIndex(i)}
                    className={`w-2 h-2 rounded-full ${i === currentImageIndex ? 'bg-white' : 'bg-white/50'}`}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white text-lg">
            {place.name}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Price Badge */}
        <span className="inline-block bg-blue-500 text-white px-3 py-1 rounded-lg font-bold">
          £{place.price_per_night}/night
        </span>

        {/* Location */}
        <div className="flex items-start gap-2 text-gray-600">
          <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>{place.location_address}</span>
        </div>

        {/* Description */}
        {place.description && (
          <p className="text-gray-600 text-sm line-clamp-3">{place.description}</p>
        )}

        {/* Details */}
        <div className="grid grid-cols-2 gap-4 py-4 border-t border-b border-gray-200">
          <div>
            <p className="text-sm text-gray-500">Max Guests</p>
            <p className="font-semibold">{place.max_guests} people</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Reviews</p>
            <p className="font-semibold">{reviews.length > 0 ? `${reviews.length} reviews` : 'No reviews yet'}</p>
          </div>
        </div>

        {/* Vehicle Size Limits - Important for motorhome users */}
        {(place.max_vehicle_height_ft || place.max_vehicle_width_ft || place.max_vehicle_length_ft) && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              <p className="text-sm font-semibold text-blue-800">Vehicle Size Limits</p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {place.max_vehicle_height_ft && (
                <div className="bg-white rounded p-2">
                  <p className="text-xs text-gray-500">Height</p>
                  <p className="font-bold text-blue-700">{place.max_vehicle_height_ft}ft</p>
                </div>
              )}
              {place.max_vehicle_width_ft && (
                <div className="bg-white rounded p-2">
                  <p className="text-xs text-gray-500">Width</p>
                  <p className="font-bold text-blue-700">{place.max_vehicle_width_ft}ft</p>
                </div>
              )}
              {place.max_vehicle_length_ft && (
                <div className="bg-white rounded p-2">
                  <p className="text-xs text-gray-500">Length</p>
                  <p className="font-bold text-blue-700">{place.max_vehicle_length_ft}ft</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Reviews Section */}
        {reviews.length === 0 ? (
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <p className="text-sm text-blue-700 italic">
              No reviews yet for this site, please leave one after your stay
            </p>
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-500 mb-2">Recent Reviews</p>
            <div className="space-y-3 max-h-40 overflow-y-auto">
              {reviews.slice(0, 3).map((review, i) => (
                <div key={i} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-1 mb-1">
                    {[...Array(5)].map((_, j) => (
                      <svg
                        key={j}
                        className={`w-3 h-3 ${j < review.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  {review.comment && (
                    <p className="text-sm text-gray-600 line-clamp-2">{review.comment}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Amenities */}
        {place.amenities && place.amenities.length > 0 && (
          <div>
            <p className="text-sm text-gray-500 mb-2">Amenities</p>
            <div className="flex flex-wrap gap-2">
              {place.amenities.slice(0, 6).map((amenity, i) => (
                <span
                  key={i}
                  className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-sm"
                >
                  {amenity}
                </span>
              ))}
              {place.amenities.length > 6 && (
                <span className="text-gray-500 text-sm">
                  +{place.amenities.length - 6} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* CTA - Book */}
        <div className="space-y-3">
          <a
            href={`/place/${place.place_id}`}
            className="block w-full text-center bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg font-bold transition-colors"
          >
            View Details & Book
          </a>
        </div>
      </div>
    </div>
  );
}
