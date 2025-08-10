// File: /frontend/src/components/common/MapView.js

import React, { useEffect, useRef } from 'react';

const MapView = ({ latitude, longitude, height = '200px' }) => {
  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
  
  const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${latitude},${longitude}&zoom=15&size=600x300&maptype=roadmap&markers=color:red%7C${latitude},${longitude}&key=${apiKey}`;
  
  return (
    <div style={{ width: '100%', height, overflow: 'hidden', borderRadius: '8px' }}>
      <img 
        src={mapUrl} 
        alt="Location Map" 
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    </div>
  );
};

export default MapView; 