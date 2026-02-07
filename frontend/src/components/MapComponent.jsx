import { useEffect, useRef, useState } from 'react';

let googleMapsLoaderPromise;

const loadGoogleMaps = (apiKey) => {
  if (window.google?.maps?.Map) {
    return Promise.resolve(window.google.maps);
  }

  if (!googleMapsLoaderPromise) {
    googleMapsLoaderPromise = new Promise((resolve, reject) => {
      // Check if script already exists
      const existingScript = document.getElementById('google-maps-js');
      if (existingScript) {
        // Wait for existing script to load
        existingScript.addEventListener('load', () => {
          // Additional check to ensure Maps API is ready
          const checkMapsReady = () => {
            if (window.google?.maps?.Map) {
              resolve(window.google.maps);
            } else {
              setTimeout(checkMapsReady, 100);
            }
          };
          checkMapsReady();
        });
        existingScript.addEventListener('error', reject);
        return;
      }

      // Create new script
      const script = document.createElement('script');
      script.id = 'google-maps-js';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,marker&loading=async`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        // Ensure Google Maps API is fully loaded
        const checkMapsReady = () => {
          if (window.google?.maps?.Map && window.google?.maps?.marker?.AdvancedMarkerElement) {
            resolve(window.google.maps);
          } else {
            setTimeout(checkMapsReady, 100);
          }
        };
        checkMapsReady();
      };
      
      script.onerror = (error) => {
        console.error('Failed to load Google Maps script:', error);
        reject(error);
      };
      
      document.head.appendChild(script);
    });
  }

  return googleMapsLoaderPromise;
};

function MapComponent({ places, userLocation, routeData }) {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [compactors, setCompactors] = useState([]);
  const [routePolyline, setRoutePolyline] = useState(null);

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

        // Double check that Google Maps is ready
        if (!window.google?.maps?.Map) {
          throw new Error('Google Maps API not fully loaded');
        }

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



  // Function to decode Google's encoded polyline
  const decodePolyline = (encoded) => {
    let points = [];
    let index = 0, len = encoded.length;
    let lat = 0, lng = 0;

    while (index < len) {
      let b, shift = 0, result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      points.push({ lat: lat / 1E5, lng: lng / 1E5 });
    }
    return points;
  };

  // Display route when routeData changes
  useEffect(() => {
    if (!map) return;

    // Clear existing polyline
    if (routePolyline) {
      routePolyline.setMap(null);
      setRoutePolyline(null);
    }

    if (routeData?.route && routeData.route.status === 'OK') {
      const route = routeData.route.routes?.[0];
      if (route?.overview_polyline?.points) {
        // Decode the polyline and create route
        const path = decodePolyline(route.overview_polyline.points);
        
        const polyline = new google.maps.Polyline({
          path: path,
          geodesic: true,
          strokeColor: '#4285F4',
          strokeOpacity: 1.0,
          strokeWeight: 4
        });
        
        polyline.setMap(map);
        setRoutePolyline(polyline);
        
        // Zoom to fit the route bounds regardless of destination type
        if (route?.bounds) {
          try {
            const bounds = new google.maps.LatLngBounds(
              new google.maps.LatLng(route.bounds.southwest.lat, route.bounds.southwest.lng),
              new google.maps.LatLng(route.bounds.northeast.lat, route.bounds.northeast.lng)
            );
            map.fitBounds(bounds, { padding: 50 });
          } catch (error) {
            console.warn('Could not fit route bounds:', error);
          }
        }
      }
      
      // If routing to a compactor, hide waste center markers with smooth transition  
      if (routeData.destination?.type === 'compactor') {
        // First start the zoom transition
        const route = routeData.route.routes?.[0];
        if (route?.bounds) {
          try {
            const bounds = new google.maps.LatLngBounds(
              new google.maps.LatLng(route.bounds.southwest.lat, route.bounds.southwest.lng),
              new google.maps.LatLng(route.bounds.northeast.lat, route.bounds.northeast.lng)
            );
            map.fitBounds(bounds, { padding: 50 });
          } catch (error) {
            console.warn('Could not fit route bounds:', error);
          }
        }
        
        // Hide waste center markers with a slight delay for smoother transition
        setTimeout(() => {
          markers.forEach(marker => {
            if (marker.markerType === 'waste-center') {
              marker.map = null;
            }
          });
        }, 300);
      }
    }
  }, [map, routeData, markers]);

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
    if (userLocation && userLocation.lat && userLocation.lng) {
      const pinElement = new google.maps.marker.PinElement({
        background: "#4285F4",
        borderColor: "#ffffff",
        glyphColor: "#ffffff"
      });
      
      const userMarker = new google.maps.marker.AdvancedMarkerElement({
        position: userLocation,
        map: map,
        title: 'Your Location',
        content: pinElement
      });
      
      // Add type identifier
      userMarker.markerType = 'user-location';
      newMarkers.push(userMarker);
    }

    // Add compactor markers (orange/yellow)
    compactors.forEach((compactor) => {
      const pinElement = new google.maps.marker.PinElement({
        background: "#FF9800",
        borderColor: "#ffffff",
        glyphColor: "#ffffff"
      });
      
      const marker = new google.maps.marker.AdvancedMarkerElement({
        position: {
          lat: compactor.lat,
          lng: compactor.lng
        },
        map: map,
        title: compactor.name,
        content: pinElement
      });
      
      // Add type identifier
      marker.markerType = 'compactor';

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

      marker.addListener('gmp-click', () => {
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

        if (latValue && lngValue) {
          const pinElement = new google.maps.marker.PinElement({
            background: "#EA4335",
            borderColor: "#ffffff",
            glyphColor: "#ffffff"
          });
          
          const marker = new google.maps.marker.AdvancedMarkerElement({
            position: {
              lat: latValue,
              lng: lngValue
            },
            map: map,
            title: place.name,
            content: pinElement
          });
          
          // Add type identifier to marker
          marker.markerType = 'waste-center';

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

          marker.addListener('gmp-click', () => {
            infoWindow.open(map, marker);
          });

          newMarkers.push(marker);
        }
      });
    }

    setMarkers(newMarkers);

    // Fit map to show all markers with better bounds handling
    if (newMarkers.length > 0) {
      try {
        const bounds = new google.maps.LatLngBounds();
        newMarkers.forEach(marker => {
          // Ensure position is valid before extending bounds
          if (marker.position && marker.position.lat && marker.position.lng) {
            bounds.extend(new google.maps.LatLng(marker.position.lat, marker.position.lng));
          }
        });
        
        if (!bounds.isEmpty()) {
          map.fitBounds(bounds);
        }
      } catch (error) {
        console.error('Error fitting bounds:', error);
      }
    }
  }, [map, places, userLocation, compactors]);

  return <div ref={mapRef} style={{ width: '100%', height: '400px' }} />;
}

export default MapComponent;