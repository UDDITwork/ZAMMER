// Google Maps API Configuration
// This file ensures the API key is always available in the build

// Hardcoded API key for production (will be embedded in build)
const HARDCODED_API_KEY = 'AIzaSyBljszgO02MyjRf1ZMj_Iq0V6GIf9BYkIA';

export const GOOGLE_MAPS_API_KEY = 
  process.env.REACT_APP_GOOGLE_MAPS_API_KEY || 
  HARDCODED_API_KEY;

export default GOOGLE_MAPS_API_KEY;

