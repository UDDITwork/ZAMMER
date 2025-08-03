// backend/utils/locationUtils.js - Production-Ready Location Utilities

/**
 * 🎯 PRODUCTION-READY LOCATION UTILITIES
 * Used in real ride-hailing and delivery applications
 * Provides accurate distance calculations and coordinate validation
 */

// 🗺️ COORDINATE VALIDATION
const validateCoordinates = (longitude, latitude) => {
  try {
    const lng = parseFloat(longitude);
    const lat = parseFloat(latitude);
    
    // Check if values are valid numbers
    if (isNaN(lng) || isNaN(lat)) {
      return {
        isValid: false,
        error: 'Coordinates must be valid numbers',
        longitude: 0,
        latitude: 0
      };
    }
    
    // Validate longitude range (-180 to 180)
    if (lng < -180 || lng > 180) {
      return {
        isValid: false,
        error: 'Longitude must be between -180 and 180 degrees',
        longitude: lng,
        latitude: lat
      };
    }
    
    // Validate latitude range (-90 to 90)
    if (lat < -90 || lat > 90) {
      return {
        isValid: false,
        error: 'Latitude must be between -90 and 90 degrees',
        longitude: lng,
        latitude: lat
      };
    }
    
    // Check for reasonable coordinates (not in middle of ocean)
    if (lng === 0 && lat === 0) {
      return {
        isValid: false,
        error: 'Coordinates cannot be at origin (0,0)',
        longitude: lng,
        latitude: lat
      };
    }
    
    return {
      isValid: true,
      longitude: lng,
      latitude: lat,
      error: null
    };
  } catch (error) {
    return {
      isValid: false,
      error: `Coordinate validation error: ${error.message}`,
      longitude: 0,
      latitude: 0
    };
  }
};

// 📏 HAVERSINE DISTANCE CALCULATION (Production-Grade)
const calculateDistance = (coord1, coord2) => {
  try {
    const [lng1, lat1] = coord1;
    const [lng2, lat2] = coord2;
    
    // Validate input coordinates
    const val1 = validateCoordinates(lng1, lat1);
    const val2 = validateCoordinates(lng2, lat2);
    
    if (!val1.isValid || !val2.isValid) {
      return {
        distance: 0,
        distanceText: 'Invalid coordinates',
        isAccurate: false,
        error: 'Invalid coordinates provided'
      };
    }
    
    // Convert to radians
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in kilometers
    
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
      isAccurate: distance < 1000, // Should be less than 1000km for reasonable locations
      error: null
    };
  } catch (error) {
    return {
      distance: 0,
      distanceText: 'Calculation error',
      isAccurate: false,
      error: `Distance calculation error: ${error.message}`
    };
  }
};

// 🎯 NEARBY SEARCH UTILITIES
const createNearbyQuery = (userLocation, maxDistance = 50) => {
  try {
    const validation = validateCoordinates(userLocation.longitude, userLocation.latitude);
    
    if (!validation.isValid) {
      throw new Error(`Invalid user location: ${validation.error}`);
    }
    
    return {
      "shop.location": {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [validation.longitude, validation.latitude]
          },
          $maxDistance: maxDistance * 1000 // Convert km to meters
        }
      },
      isVerified: true,
      "shop.isActive": true
    };
  } catch (error) {
    console.error('❌ Nearby query creation error:', error);
    return {};
  }
};

// 🏪 SHOP DISTANCE SORTING
const sortShopsByDistance = (shops, userLocation) => {
  try {
    const validation = validateCoordinates(userLocation.longitude, userLocation.latitude);
    
    if (!validation.isValid) {
      console.warn('⚠️ Invalid user location for sorting:', validation.error);
      return shops; // Return unsorted if invalid coordinates
    }
    
    return shops.map(shop => {
      if (!shop.shop?.location?.coordinates) {
        return {
          ...shop.toObject(),
          distance: 999999,
          distanceText: 'Location unavailable'
        };
      }
      
      const distanceResult = calculateDistance(
        [validation.longitude, validation.latitude],
        shop.shop.location.coordinates
      );
      
      return {
        ...shop.toObject(),
        distance: distanceResult.distance,
        distanceText: distanceResult.distanceText,
        isAccurate: distanceResult.isAccurate
      };
    }).sort((a, b) => a.distance - b.distance);
  } catch (error) {
    console.error('❌ Shop sorting error:', error);
    return shops;
  }
};

// 🔍 LOCATION DEBUGGING
const debugLocation = (location) => {
  if (!location) {
    return { error: 'No location provided' };
  }
  
  const { coordinates, type } = location;
  
  if (!coordinates || !Array.isArray(coordinates) || coordinates.length !== 2) {
    return { error: 'Invalid coordinates format' };
  }
  
  const [lng, lat] = coordinates;
  const validation = validateCoordinates(lng, lat);
  
  return {
    coordinates: [lng, lat],
    type: type || 'Point',
    validation: validation,
    isInGujarat: lng >= 69 && lng <= 74 && lat >= 20 && lat <= 25,
    isInAhmedabad: Math.abs(lng - 72.5714) < 0.1 && Math.abs(lat - 23.0225) < 0.1
  };
};

// 🎯 DEFAULT LOCATIONS (Gujarat)
const DEFAULT_LOCATIONS = {
  AHMEDABAD: { longitude: 72.5714, latitude: 23.0225 },
  SURAT: { longitude: 72.8311, latitude: 21.1702 },
  VADODARA: { longitude: 73.1811, latitude: 22.3072 },
  RAJKOT: { longitude: 70.8022, latitude: 22.3039 },
  BHAVNAGAR: { longitude: 72.1519, latitude: 21.7645 }
};

// 📊 LOCATION STATISTICS
const getLocationStats = async (Seller) => {
  try {
    const stats = await Seller.aggregate([
      {
        $match: {
          "shop.location.coordinates": { $exists: true },
          "shop.location.coordinates": { $ne: [0, 0] }
        }
      },
      {
        $group: {
          _id: null,
          totalShops: { $sum: 1 },
          shopsWithValidLocation: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$shop.location.coordinates", [0, 0]] },
                    { $ne: ["$shop.location.coordinates", null] }
                  ]
                },
                1,
                0
              ]
            }
          },
          averageLatitude: { $avg: { $arrayElemAt: ["$shop.location.coordinates", 1] } },
          averageLongitude: { $avg: { $arrayElemAt: ["$shop.location.coordinates", 0] } }
        }
      }
    ]);
    
    return stats[0] || {
      totalShops: 0,
      shopsWithValidLocation: 0,
      averageLatitude: 0,
      averageLongitude: 0
    };
  } catch (error) {
    console.error('❌ Location stats error:', error);
    return {
      totalShops: 0,
      shopsWithValidLocation: 0,
      averageLatitude: 0,
      averageLongitude: 0,
      error: error.message
    };
  }
};

module.exports = {
  validateCoordinates,
  calculateDistance,
  createNearbyQuery,
  sortShopsByDistance,
  debugLocation,
  DEFAULT_LOCATIONS,
  getLocationStats
};