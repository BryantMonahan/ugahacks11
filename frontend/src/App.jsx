import { useState, useEffect } from 'react'
import './App.css'
import DisplayPlaces from './components/DisplayPlaces'
import MapComponent from './components/MapComponent'

function App() {
  const [places, setPlaces] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [userLocation, setUserLocation] = useState(null)
  const [mapReady, setMapReady] = useState(false)

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

  const fetchWasteCenters = async (lat, lng) => {
    setLoading(true)
    setError(null)
    
    try {
      const query = searchQuery.trim() ? `&query=${encodeURIComponent(searchQuery.trim())}` : ''
      // Use smaller radius for closer results
      const response = await fetch(`http://localhost:8083/rest/places/waste-centers?lat=${lat}&lng=${lng}&radius=5000${query}`)
      const data = await response.json()
      
      if (data.error) {
        setError(data.error)
      } else {
        setPlaces(data.results || [])
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    if (userLocation) {
      fetchWasteCenters(userLocation.lat, userLocation.lng);
    } else {
      // Fallback if location isn't available yet
      fetchWasteCenters(38.7946, -106.5348);
    }
  }

  return (
    <div>
      <h1>Waste Center Finder</h1>
      
      <label>Search for specific waste type (optional):</label>
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="e.g. glass, electronics, tire, hazardous, compost..."
      />
      <small>Leave empty to search for all types of waste centers</small>

      <button onClick={handleSearch} disabled={loading}>
        {loading ? 'Searching...' : 'Find Nearest Waste Centers'}
      </button>

      {loading && <p>Loading...</p>}
      {error && <p>Error: {error}</p>}

      {/* Map is always visible */}
      {mapReady ? (
        <MapComponent places={places} userLocation={userLocation} />
      ) : (
        <div style={{width: '100%', height: '400px', backgroundColor: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #ddd'}}>
          <p>Loading map...</p>
        </div>
      )}

      {places.length > 0 && (
        <div>
          <h2>
            {searchQuery.trim() ? `Results for "${searchQuery}"` : 'All Waste Centers'} - {places.length} found
          </h2>
          
          <h3>Locations List:</h3>
          <DisplayPlaces places={places} />
        </div>
      )}
    </div>
  )
}

export default App
