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
      map.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,marker`;
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
  const [compactors, setCompactors] = useState([]);

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
          mapId: "DEMO_MAP_ID", // Required for AdvancedMarkerElement
          mapTypeControl: false,
          fullscreenControl: false,
          streetViewControl: false
        });

        setMap(mapInstance);

        // Fetch compactor locations
        try {
          const response = await fetch('http://localhost:8083/rest/places/compactors');
          const data = await response.json();
          setCompactors(data.compactors || []);
        } catch (error) {
          console.error('Failed to fetch compactors:', error);
        }
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

  // Add markers when places or compactors change
  useEffect(() => {
    if (!map) return;

    // Clear existing markers
    markers.forEach(marker => {
      if (marker.map) {
        marker.map = null;
      }
    });

    // Add user location marker
    const newMarkers = [];
    if (userLocation) {
      const userMarker = new google.maps.marker.AdvancedMarkerElement({
        position: userLocation,
        map: map,
        title: 'Your Location',
        content: new google.maps.marker.PinElement({
          background: "#4285F4",
          borderColor: "#ffffff",
          glyphColor: "#ffffff"
        }).element
      });
      newMarkers.push(userMarker);
    }

    // Add compactor markers (orange/yellow)
    compactors.forEach((compactor) => {
      const marker = new google.maps.marker.AdvancedMarkerElement({
        position: {
          lat: compactor.lat,
          lng: compactor.lng
        },
        map: map,
        title: compactor.name,
        content: new google.maps.marker.PinElement({
          background: "#FF9800",
          borderColor: "#ffffff",
          glyphColor: "#ffffff"
        }).element
      });

      // Add info window for compactors
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div>
            <strong>${compactor.name}</strong><br>
            <em>Compactor Location</em><br>
            Coordinates: ${compactor.lat.toFixed(6)}, ${compactor.lng.toFixed(6)}
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });

      newMarkers.push(marker);
    });

    // Add waste center place markers (red)
    if (places && places.length > 0) {
      places.forEach((place) => {
        const latValue = typeof place.geometry?.location?.lat === 'function'
          ? place.geometry.location.lat()
          : place.geometry?.location?.lat;
        const lngValue = typeof place.geometry?.location?.lng === 'function'
          ? place.geometry.location.lng()
          : place.geometry?.location?.lng;

        const marker = new google.maps.marker.AdvancedMarkerElement({
          position: {
            lat: latValue,
            lng: lngValue
          },
          map: map,
          title: place.name,
          content: new google.maps.marker.PinElement({
            background: "#EA4335",
            borderColor: "#ffffff",
            glyphColor: "#ffffff"
          }).element
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
    }

    setMarkers(newMarkers);

    // Fit map to show all markers
    if (newMarkers.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      newMarkers.forEach(marker => {
        // AdvancedMarkerElement uses .position property instead of .getPosition()
        bounds.extend(marker.position);
      });
      map.fitBounds(bounds);
    }
  }, [map, places, userLocation, compactors]);

  return <div ref={mapRef} style={{ width: '100%', height: '400px' }} />;
}

export default MapComponent;