import { useEffect } from 'react'
import './App.css'

function App() {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

  useEffect(() => {
    if (!apiKey) {
      return
    }

    if (document.querySelector('script[data-google-maps]')) {
      return
    }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=maps`
    script.defer = true
    script.setAttribute('data-google-maps', 'true')
    document.head.appendChild(script)
  }, [apiKey])

  return (
    <gmp-map
      center="38.7946,-106.5348"
      zoom="4"
      map-id="DEMO_MAP_ID"
      style={{ height: '400px' }}
    />
  )
}

export default App
