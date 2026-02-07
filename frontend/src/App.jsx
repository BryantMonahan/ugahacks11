import { useState, useEffect } from 'react'
import './App.css'
import DisplayPlaces from './components/DisplayPlaces'
import MapComponent from './components/MapComponent'

function App() {
  const [places, setPlaces] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [wasteType, setWasteType] = useState('')
  const [userLocation, setUserLocation] = useState(null)
  const [mapReady, setMapReady] = useState(false)
  const [routeData, setRouteData] = useState(null)
  const [routeLoading, setRouteLoading] = useState(false)

  // Initialize map and get user location on component mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(location);
          setMapReady(true);
        },
        () => {
          const defaultLocation = { lat: 38.7946, lng: -106.5348 };
          setUserLocation(defaultLocation);
          setMapReady(true);
        }
      )
    } else {
      const defaultLocation = { lat: 38.7946, lng: -106.5348 };
      setUserLocation(defaultLocation);
      setMapReady(true);
    }
  }, []);

  const getSmartRoute = async () => {
    if (!userLocation) return;
    
    setRouteLoading(true);
    setError(null);
    
    try {
      const wasteTypeParam = wasteType.trim() ? `&wasteType=${encodeURIComponent(wasteType.trim())}` : '';
      const response = await fetch(
        `http://localhost:8083/rest/places/smart-route?lat=${userLocation.lat}&lng=${userLocation.lng}${wasteTypeParam}`
      );
      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
      } else {
        setRouteData(data);
        // If hazardous waste, also update places with nearby facilities
        if (data.isHazardous && data.facilities) {
          setPlaces(data.facilities);
        }
      }
    } catch (err) {
      setError('Failed to get route: ' + err.message);
    } finally {
      setRouteLoading(false);
    }
  }

  return (
    <div>
      <h1>Smart Waste Routing</h1>

      <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h3>Find Route to Disposal</h3>
        <label>Waste Type:</label>
        <select 
          value={wasteType} 
          onChange={(e) => setWasteType(e.target.value)}
          style={{ marginLeft: '10px', padding: '5px', width: '200px' }}
        >
          <option value="">General Waste</option>
          <option value="electronics">Electronics</option>
          <option value="battery">Batteries</option>
          <option value="hazardous">Hazardous Materials</option>
          <option value="motor oil">Motor Oil</option>
          <option value="paint">Paint</option>
          <option value="fluorescent">Fluorescent Bulbs</option>
        </select>
        
        <button 
          onClick={getSmartRoute} 
          disabled={routeLoading || !userLocation}
          style={{ marginLeft: '10px', padding: '8px 15px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          {routeLoading ? 'Finding Route...' : 'Get Smart Route'}
        </button>
      </div>

      {routeLoading && <p>Loading route...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      
      {routeData && (
        <div style={{ padding: '15px', backgroundColor: '#e8f5e8', border: '1px solid #4CAF50', borderRadius: '8px', marginBottom: '15px' }}>
          <h3>Route Found!</h3>
          <p><strong>Destination:</strong> {routeData.destination?.name}</p>
          <p><strong>Type:</strong> {routeData.destination?.type === 'compactor' ? 'Compactor' : 'Specialized Waste Facility'}</p>
          <p><strong>Waste Category:</strong> {routeData.isHazardous ? 'Hazardous/Special' : 'General'}</p>
          {routeData.route?.routes?.[0] && (
            <p><strong>Distance:</strong> {routeData.route.routes[0].legs[0].distance?.text}</p>
          )}
        </div>
      )}

      {/* Map is always visible */}
      {mapReady ? (
        <MapComponent 
          places={places} 
          userLocation={userLocation} 
          routeData={routeData}
        />
      ) : (
        <div style={{ width: '100%', height: '400px', backgroundColor: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #ddd' }}>
          <p>Loading map...</p>
        </div>
      )}

      {places.length > 0 && (
        <div>
          <h2>Nearby Facilities - {places.length} found</h2>
          <h3>Locations List:</h3>
          <DisplayPlaces places={places} />
        </div>
      )}
    </div>
  )
}

export default App
