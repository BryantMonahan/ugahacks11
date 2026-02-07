function DisplayPlaces({ places }) {
  if (places.length === 0) {
    return null;
  }

  const renderPlace = (place, index) => (
    <li key={place.place_id || index}>
      <div>{place.name}</div>
      <div>{place.vicinity || place.formatted_address}</div>
      <div>
        Rating: {place.rating || 'N/A'} 
        {place.user_ratings_total && ` (${place.user_ratings_total} reviews)`}
      </div>
      {place.opening_hours && (
        <div>{place.opening_hours.open_now ? 'Open Now' : 'Closed'}</div>
      )}
    </li>
  );

  return (
    <ul>
      {places.map(renderPlace)}
    </ul>
  );
}

export default DisplayPlaces;
