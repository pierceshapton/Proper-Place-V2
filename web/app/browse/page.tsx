'use client';

import { useState, useCallback, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';

const API_BASE_URL = 'https://octopus-app-lxh2t.ondigitalocean.app';
const GOOGLE_MAPS_API_KEY = 'AIzaSyBqXtdl4q7VW4PEbK2dKsdouT1d_35WTy0';

// UK center coordinates (same as app default)
const DEFAULT_CENTER = { lat: 54.5, lng: -2.5 };
const DEFAULT_ZOOM = 6;
const MIN_ZOOM_FOR_MARKERS = 11;

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
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: true,
  streetViewControl: false,
  fullscreenControl: true,
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
  const [placeReviews, setPlaceReviews] = useState<{ [key: string]: PlaceReview[] }>({});
  const [map, setMap] = useState<google.maps.Map | null>(null);

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
        // Filter to only approved places
        const approvedPlaces = (data.places || data || []).filter(
          (p: Place) => p.approval_status === 'approved'
        );
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

  // Custom marker icon (tent shape like the app)
  const getMarkerIcon = (isFavorite: boolean): google.maps.Symbol => {
    return {
      path: 'M12 2L2 22h20L12 2z', // Triangle/tent shape
      fillColor: isFavorite ? '#EF4444' : '#7BA7D8',
      fillOpacity: 1,
      strokeColor: '#FFFFFF',
      strokeWeight: 2,
      scale: 1.5,
      anchor: new google.maps.Point(12, 22),
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
    <main className="flex flex-col h-screen">
      {/* Header */}
      <div className="bg-dark-bg text-white py-4 px-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Proper Place Map</h1>
        <div className="flex items-center gap-4">
          {!showMarkers && mapZoom < MIN_ZOOM_FOR_MARKERS && (
            <span className="text-sm text-gray-300 bg-gray-700 px-3 py-1 rounded">
              Zoom in to see places
            </span>
          )}
          <span className="text-sm text-gray-300">
            {places.length} places available
          </span>
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative">
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
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
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

              {/* Info Window for selected place */}
              {selectedPlace && (
                <InfoWindow
                  position={{
                    lat: selectedPlace.location_lat,
                    lng: selectedPlace.location_lng,
                  }}
                  onCloseClick={() => setSelectedPlace(null)}
                >
                  <div className="p-2 max-w-xs">
                    <h3 className="font-bold text-lg">{selectedPlace.name}</h3>
                    <p className="text-sm text-gray-600 mb-2">
                      {selectedPlace.location_address}
                    </p>
                    <p className="text-blue-600 font-bold">
                      £{selectedPlace.price_per_night}/night
                    </p>
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>

            {/* Map Controls Overlay */}
            <div className="absolute bottom-6 right-6 flex flex-col gap-2">
              <button
                onClick={goToCurrentLocation}
                className="bg-white p-3 rounded-full shadow-lg hover:bg-gray-100 transition-colors"
                title="Go to my location"
              >
                <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>

            {/* Zoom Hint */}
            {!showMarkers && (
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
      {/* Header */}
      <div className="sticky top-0 bg-white p-4 border-b flex items-center justify-between z-10">
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

        {/* Rating */}
        <div className="flex items-center gap-1">
          {averageRating > 0 ? (
            <>
              {[...Array(5)].map((_, i) => (
                <svg
                  key={i}
                  className={`w-4 h-4 ${i < Math.floor(averageRating) ? 'text-yellow-400' : 'text-gray-300'}`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
              <span className="text-sm font-medium ml-1">{averageRating.toFixed(1)}</span>
            </>
          ) : (
            <span className="text-sm text-gray-500 italic">No ratings yet</span>
          )}
        </div>

        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
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

        {/* Name */}
        <h3 className="text-xl font-bold">{place.name}</h3>

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
            <p className="font-semibold">{reviews.length} reviews</p>
          </div>
        </div>

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

        {/* CTA - Download App */}
        <div className="bg-gray-100 rounded-lg p-4 text-center">
          <p className="text-sm text-gray-600 mb-2">
            Download the app to book this place
          </p>
          <div className="flex justify-center gap-4">
            <a
              href="https://apps.apple.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline text-sm font-medium"
            >
              App Store
            </a>
            <a
              href="https://play.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline text-sm font-medium"
            >
              Google Play
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
