import { toast } from 'react-toastify';

// Get the user's current location
export const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          coordinates: [position.coords.longitude, position.coords.latitude]
        });
      },
      (error) => {
        reject(error);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
};

export const getAddressFromCoordinates = async (longitude, latitude) => {
  try {
    const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`
    );
    
    const data = await response.json();
    
    if (data.status === 'OK' && data.results.length > 0) {
      return data.results[0].formatted_address;
    } else {
      console.log('Geocoding API response:', data);
      return 'Address not available';
    }
  } catch (error) {
    console.error('Error in geocoding:', error);
    return 'Address not available';
  }
};

// Update user location in backend and local storage
export const updateLocation = async (userAuth, setUserAuth = null) => {
  if (!userAuth) {
    console.error('userAuth is not available');
    return false;
  }

  try {
    const locationData = await getCurrentLocation();
    if (!locationData) return false;
    
    let address = 'Your current location';
    
    // Try to get the address if we have the Google Maps API key
    if (process.env.REACT_APP_GOOGLE_MAPS_API_KEY) {
      try {
        address = await getAddressFromCoordinates(
          locationData.coordinates[0], 
          locationData.coordinates[1]
        );
      } catch (err) {
        console.error('Error getting address:', err);
      }
    }
    
    // Create the updated user object
    const updatedUser = {
      ...userAuth.user,
      location: {
        ...userAuth.user?.location,
        coordinates: locationData.coordinates,
        address: address
      }
    };
    
    // Update in localStorage
    const userData = localStorage.getItem('userData');
    if (userData) {
      const parsedData = JSON.parse(userData);
      parsedData.location = updatedUser.location;
      localStorage.setItem('userData', JSON.stringify(parsedData));
    }
    
    // If we have access to the updateUser function, use it
    // Otherwise just return the updated data
    return true;
  } catch (error) {
    console.error('Error updating location:', error);
    toast.error('Could not detect your location');
    return false;
  }
}; 