// frontend/src/utils/locationUtils.js - PRODUCTION-READY LOCATION HANDLING
import { toast } from 'react-toastify';

// 🎯 LOCATION VALIDATION FOR INDIA/GUJARAT
const LOCATION_BOUNDS = {
  india: {
    lat: { min: 6.0, max: 37.6 },
    lng: { min: 68.0, max: 97.25 }
  },
  gujarat: {
    lat: { min: 20.1, max: 24.7 },
    lng: { min: 68.1, max: 74.5 }
  }
};

// 🎯 VALIDATE COORDINATES
export const validateCoordinates = (longitude, latitude, region = 'india') => {
  try {
    // Convert to numbers if they're strings
    const lng = typeof longitude === 'string' ? parseFloat(longitude) : longitude;
    const lat = typeof latitude === 'string' ? parseFloat(latitude) : latitude;

    // Basic validation
    if (typeof lng !== 'number' || typeof lat !== 'number' || 
        isNaN(lng) || isNaN(lat)) {
      return {
        isValid: false,
        error: 'Coordinates must be valid numbers',
        longitude: 0,
        latitude: 0
      };
    }

    // Check for default/invalid coordinates
    if ((lng === 0 && lat === 0) || 
        lng < -180 || lng > 180 || 
        lat < -90 || lat > 90) {
      return {
        isValid: false,
        error: 'Coordinates are outside valid range',
        longitude: lng,
        latitude: lat
      };
    }

    // Regional validation
    const bounds = LOCATION_BOUNDS[region] || LOCATION_BOUNDS.india;
    const isInRegion = lat >= bounds.lat.min && 
                      lat <= bounds.lat.max && 
                      lng >= bounds.lng.min && 
                      lng <= bounds.lng.max;

    if (!isInRegion) {
      console.warn(`⚠️ [LocationUtils] Coordinates outside ${region}:`, { longitude: lng, latitude: lat });
      return {
        isValid: true, // Still valid, just warning
        warning: `Coordinates appear to be outside ${region}`,
        longitude: lng,
        latitude: lat,
        region: region
      };
    }

    return {
      isValid: true,
      longitude: lng,
      latitude: lat,
      region: region
    };

  } catch (error) {
    console.error('❌ [LocationUtils] Coordinate validation error:', error);
    return {
      isValid: false,
      error: error.message,
      longitude: 0,
      latitude: 0
    };
  }
};

// 🎯 GET USER'S CURRENT LOCATION - ENHANCED WITH VALIDATION
export const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    console.log('📍 [LocationUtils] Requesting current location...');

    if (!navigator.geolocation) {
      const error = new Error('Geolocation is not supported by your browser');
      console.error('❌ [LocationUtils]', error.message);
      reject(error);
      return;
    }

    // Enhanced options for better accuracy
    const options = {
      enableHighAccuracy: true,
      timeout: 15000, // Increased timeout
      maximumAge: 60000 // Cache for 1 minute
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { longitude, latitude, accuracy } = position.coords;
        
        console.log('📍 [LocationUtils] Raw GPS coordinates received:', {
          longitude,
          latitude,
          accuracy: `${accuracy}m`
        });

        // Validate coordinates
        const validation = validateCoordinates(longitude, latitude, 'gujarat');
        
        if (!validation.isValid) {
          console.error('❌ [LocationUtils] Invalid coordinates received:', validation);
          reject(new Error(`Invalid coordinates: ${validation.error}`));
          return;
        }

        // Log validation result
        if (validation.warning) {
          console.warn('⚠️ [LocationUtils]', validation.warning);
        }

        const locationResult = {
          coordinates: [longitude, latitude], // MongoDB format: [lng, lat]
          longitude,
          latitude,
          accuracy,
          timestamp: new Date().toISOString(),
          source: 'gps',
          validation: validation
        };

        console.log('✅ [LocationUtils] Location validated and formatted:', {
          coordinates: locationResult.coordinates,
          accuracy: `${accuracy}m`,
          region: validation.region,
          isValid: validation.isValid
        });

        resolve(locationResult);
      },
      (error) => {
        console.error('❌ [LocationUtils] Geolocation error:', {
          code: error.code,
          message: error.message
        });

        let errorMessage;
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied by user';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
          default:
            errorMessage = 'An unknown error occurred while retrieving location';
            break;
        }

        reject(new Error(errorMessage));
      },
      options
    );
  });
};

// 🎯 GET ADDRESS FROM COORDINATES - ENHANCED
export const getAddressFromCoordinates = async (longitude, latitude) => {
  try {
    console.log('🗺️ [LocationUtils] Getting address for coordinates:', { longitude, latitude });

    // Validate coordinates first
    const validation = validateCoordinates(longitude, latitude);
    if (!validation.isValid) {
      console.error('❌ [LocationUtils] Invalid coordinates for geocoding:', validation);
      return 'Invalid coordinates';
    }

    const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      console.warn('⚠️ [LocationUtils] Google Maps API key not found');
      return `Location: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    }

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}&region=IN&language=en`
    );

    const data = await response.json();

    if (data.status === 'OK' && data.results.length > 0) {
      const address = data.results[0].formatted_address;
      console.log('✅ [LocationUtils] Address found:', address);
      return address;
    } else {
      console.warn('⚠️ [LocationUtils] Geocoding failed:', data.status);
      return `Location: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    }
  } catch (error) {
    console.error('❌ [LocationUtils] Geocoding error:', error);
    return `Location: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  }
};

// 🎯 UPDATE USER LOCATION - ENHANCED WITH BACKEND SYNC
export const updateLocation = async (userAuth, setUserAuth = null) => {
  if (!userAuth?.user) {
    console.error('❌ [LocationUtils] userAuth is not available');
    return { success: false, error: 'User authentication required' };
  }

  try {
    console.log('📍 [LocationUtils] Starting location update process...');

    // Get current location
    const locationData = await getCurrentLocation();
    
    if (!locationData || !locationData.coordinates) {
      throw new Error('Failed to get current location');
    }

    console.log('📍 [LocationUtils] Location obtained:', {
      coordinates: locationData.coordinates,
      accuracy: locationData.accuracy
    });

    // Get human-readable address
    let address = 'Your current location';
    
    try {
      address = await getAddressFromCoordinates(
        locationData.longitude,
        locationData.latitude
      );
    } catch (addressError) {
      console.warn('⚠️ [LocationUtils] Address lookup failed:', addressError);
    }

    // Create updated user object
    const updatedUser = {
      ...userAuth.user,
      location: {
        coordinates: locationData.coordinates, // [longitude, latitude]
        longitude: locationData.longitude,
        latitude: locationData.latitude,
        address: address,
        accuracy: locationData.accuracy,
        timestamp: locationData.timestamp,
        source: locationData.source
      }
    };

    // Update in localStorage
    try {
      const userData = localStorage.getItem('userData');
      if (userData) {
        const parsedData = JSON.parse(userData);
        parsedData.location = updatedUser.location;
        localStorage.setItem('userData', JSON.stringify(parsedData));
        console.log('✅ [LocationUtils] Location saved to localStorage');
      }
    } catch (storageError) {
      console.warn('⚠️ [LocationUtils] Failed to update localStorage:', storageError);
    }

    // Update auth context if available
    if (setUserAuth && typeof setUserAuth === 'function') {
      setUserAuth({
        ...userAuth,
        user: updatedUser
      });
      console.log('✅ [LocationUtils] Auth context updated');
    }

    console.log('✅ [LocationUtils] Location update completed successfully:', {
      coordinates: updatedUser.location.coordinates,
      address: updatedUser.location.address,
      accuracy: `${updatedUser.location.accuracy}m`
    });

    return {
      success: true,
      location: updatedUser.location,
      message: 'Location updated successfully'
    };

  } catch (error) {
    console.error('❌ [LocationUtils] Location update failed:', error);
    
    // Show user-friendly error message
    const errorMessage = error.message.includes('denied') 
      ? 'Please allow location access to find nearby shops'
      : 'Could not detect your location. Please try again.';
    
    toast.error(errorMessage);

    return {
      success: false,
      error: error.message,
      userError: errorMessage
    };
  }
};

// 🎯 DISTANCE CALCULATION (CLIENT-SIDE VERIFICATION)
export const calculateDistance = (coord1, coord2, unit = 'km') => {
  try {
    // Extract coordinates
    const [lng1, lat1] = Array.isArray(coord1) ? coord1 : [coord1.longitude, coord1.latitude];
    const [lng2, lat2] = Array.isArray(coord2) ? coord2 : [coord2.longitude, coord2.latitude];

    // Validate coordinates
    const validation1 = validateCoordinates(lng1, lat1);
    const validation2 = validateCoordinates(lng2, lat2);
    
    if (!validation1.isValid || !validation2.isValid) {
      console.error('❌ [LocationUtils] Invalid coordinates for distance calculation');
      return { distance: 999999, distanceText: 'Distance unavailable' };
    }

    const R = unit === 'km' ? 6371 : 3959; // Earth's radius
    
    // Convert to radians
    const lat1Rad = (lat1 * Math.PI) / 180;
    const lat2Rad = (lat2 * Math.PI) / 180;
    const deltaLatRad = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLngRad = ((lng2 - lng1) * Math.PI) / 180;

    // Haversine formula
    const a = Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
              Math.cos(lat1Rad) * Math.cos(lat2Rad) *
              Math.sin(deltaLngRad / 2) * Math.sin(deltaLngRad / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    // Format distance text
    let distanceText;
    if (distance < 1) {
      distanceText = `${Math.round(distance * 1000)}m`;
    } else if (distance < 10) {
      distanceText = `${distance.toFixed(1)}km`;
    } else {
      distanceText = `${Math.round(distance)}km`;
    }

    return {
      distance: distance,
      distanceText: distanceText,
      unit: unit
    };

  } catch (error) {
    console.error('❌ [LocationUtils] Distance calculation error:', error);
    return { distance: 999999, distanceText: 'Distance unavailable' };
  }
};

// 🎯 GET LOCATION PERMISSION STATUS
export const getLocationPermissionStatus = async () => {
  try {
    if (!navigator.permissions) {
      return { state: 'unknown', message: 'Permissions API not supported' };
    }

    const permission = await navigator.permissions.query({ name: 'geolocation' });
    
    console.log('🔐 [LocationUtils] Location permission status:', permission.state);
    
    return {
      state: permission.state,
      message: permission.state === 'granted' 
        ? 'Location access granted'
        : permission.state === 'denied'
        ? 'Location access denied'
        : 'Location permission pending'
    };

  } catch (error) {
    console.error('❌ [LocationUtils] Permission check failed:', error);
    return { state: 'unknown', message: 'Could not check permission status' };
  }
};

// 🎯 REQUEST LOCATION PERMISSION
export const requestLocationPermission = async () => {
  try {
    console.log('🔐 [LocationUtils] Requesting location permission...');
    
    const location = await getCurrentLocation();
    
    if (location) {
      console.log('✅ [LocationUtils] Location permission granted and location obtained');
      return {
        success: true,
        location: location,
        message: 'Location access granted'
      };
    }

  } catch (error) {
    console.error('❌ [LocationUtils] Location permission request failed:', error);
    
    return {
      success: false,
      error: error.message,
      message: error.message.includes('denied') 
        ? 'Location access was denied. Please enable it in your browser settings.'
        : 'Failed to get location permission.'
    };
  }
};

// 🎯 DEFAULT GUJARAT COORDINATES (FALLBACK)
export const getDefaultGujaratLocation = () => {
  return {
    coordinates: [72.5714, 23.0225], // Ahmedabad coordinates [lng, lat]
    longitude: 72.5714,
    latitude: 23.0225,
    address: 'Ahmedabad, Gujarat, India',
    source: 'default_fallback',
    timestamp: new Date().toISOString()
  };
};

// 🎯 EXPORT ALL UTILITIES
export default {
  validateCoordinates,
  getCurrentLocation,
  getAddressFromCoordinates,
  updateLocation,
  calculateDistance,
  getLocationPermissionStatus,
  requestLocationPermission,
  getDefaultGujaratLocation
};