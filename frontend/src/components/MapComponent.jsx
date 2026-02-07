import { useEffect, useRef, useState } from 'react';

let googleMapsLoaderPromise;

const loadGoogleMaps = (apiKey) => {
  if (window.google?.maps) {
    return Promise.resolve(window.google.maps);
  }

  if (!googleMapsLoaderPromise) {
    googleMapsLoaderPromise = new Promise((resolve, reject) => {
      const existingMap = document.getElementById('google-maps-js');
      if (existingMap) {
        existingMap.addEventListener('load', () => resolve(window.google.maps));
        existingMap.addEventListener('error', reject);
        return;
      }

      const map = document.createElement('script');
      map.id = 'google-maps-js';
      map.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      map.async = true;
      map.defer = true;
      map.onload = () => resolve(window.google.maps);
      map.onerror = reject;
      document.head.appendChild(map);
    });
  }

  return googleMapsLoaderPromise;
};

function MapComponent({ places, userLocation }) {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [markers, setMarkers] = useState([]);

  useEffect(() => {
    const initMap = async () => {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        console.error('Google Maps API key not found');
        return;
      }

      try {
        await loadGoogleMaps(apiKey);
        if (!mapRef.current || map) return;

        const mapInstance = new google.maps.Map(mapRef.current, {
          center: userLocation || { lat: 38.7946, lng: -106.5348 },
          zoom: 12,
          mapTypeControl: false,
          fullscreenControl: false,
          streetViewControl: false
        });

        setMap(mapInstance);
      } catch (error) {
        console.error('Failed to load Google Maps', error);
      }
    };

    initMap();
  }, [map, userLocation]);

  useEffect(() => {
    if (!map || !userLocation) return;
    map.setCenter(userLocation);
  }, [map, userLocation]);

  // Add markers when places change
  useEffect(() => {
    if (!map || !places.length) return;

    // Clear existing markers
    markers.forEach(marker => marker.setMap(null));

    // Add user location marker
    const newMarkers = [];
    if (userLocation) {
      const userMarker = new google.maps.Marker({
        position: userLocation,
        map: map,
        title: 'Your Location',
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="%234285F4"%3E%3Ccircle cx="12" cy="12" r="8"/%3E%3C/svg%3E',
          scaledSize: new google.maps.Size(24, 24)
        }
      });
      newMarkers.push(userMarker);
    }

    // Add place markers
    places.forEach((place) => {
      const latValue = typeof place.geometry?.location?.lat === 'function'
        ? place.geometry.location.lat()
        : place.geometry?.location?.lat;
      const lngValue = typeof place.geometry?.location?.lng === 'function'
        ? place.geometry.location.lng()
        : place.geometry?.location?.lng;

      const marker = new google.maps.Marker({
        position: {
          lat: latValue,
          lng: lngValue
        },
        map: map,
        title: place.name,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="%23EA4335"%3E%3Cpath d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/%3E%3C/svg%3E',
          scaledSize: new google.maps.Size(24, 24)
        }
      });

      // Add info window
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div>
            <strong>${place.name}</strong><br>
            ${place.vicinity || place.formatted_address}<br>
            Rating: ${place.rating || 'N/A'}
            ${place.opening_hours ? `<br>${place.opening_hours.open_now ? 'Open Now' : 'Closed'}` : ''}
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });

      newMarkers.push(marker);
    });

    setMarkers(newMarkers);

    // Fit map to show all markers
    if (newMarkers.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      newMarkers.forEach(marker => bounds.extend(marker.getPosition()));
      map.fitBounds(bounds);
    }
  }, [map, places, userLocation]);

  return <div ref={mapRef} style={{ width: '100%', height: '400px' }} />;
}

export default MapComponent;