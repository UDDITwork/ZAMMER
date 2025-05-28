import React, { useRef, useEffect, useState } from 'react';

// Simple test component to debug Google Places API
const SimplePlacesTest = () => {
  const inputRef = useRef(null);
  const [status, setStatus] = useState('Initializing...');
  const [apiKey, setApiKey] = useState('');
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    const checkApiKey = () => {
      const key = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
      console.log('🔑 API Key found:', key ? 'YES' : 'NO');
      console.log('🔑 API Key value:', key);
      setApiKey(key || 'NOT FOUND');
      
      if (!key) {
        setErrors(prev => [...prev, 'API key not found in environment variables']);
        setStatus('❌ API Key Missing');
        return false;
      }
      return true;
    };

    const loadGoogleMaps = () => {
      return new Promise((resolve, reject) => {
        if (window.google) {
          console.log('✅ Google Maps already loaded');
          resolve();
          return;
        }

        const script = document.createElement('script');
        const key = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
        script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
        script.async = true;
        script.defer = true;

        script.onload = () => {
          console.log('✅ Google Maps script loaded successfully');
          resolve();
        };

        script.onerror = (error) => {
          console.error('❌ Failed to load Google Maps script:', error);
          reject(new Error('Script loading failed'));
        };

        document.head.appendChild(script);
      });
    };

    const initializePlaces = () => {
      try {
        if (!window.google) {
          throw new Error('Google Maps not loaded');
        }

        if (!window.google.maps) {
          throw new Error('Google Maps API not available');
        }

        if (!window.google.maps.places) {
          throw new Error('Google Places API not available');
        }

        console.log('✅ Google Places API available');

        const autocomplete = new window.google.maps.places.Autocomplete(
          inputRef.current,
          {
            types: ['establishment', 'geocode'],
            componentRestrictions: { country: 'IN' },
            fields: ['place_id', 'formatted_address', 'geometry', 'name']
          }
        );

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          console.log('🎯 Place selected:', place);
          
          if (place.geometry) {
            setStatus(`✅ Place Selected: ${place.formatted_address}`);
          } else {
            setStatus('⚠️ Place selected but no geometry');
          }
        });

        setStatus('✅ Google Places Autocomplete initialized');
        console.log('✅ Autocomplete initialized successfully');

      } catch (error) {
        console.error('❌ Error initializing Places:', error);
        setErrors(prev => [...prev, error.message]);
        setStatus(`❌ Initialization failed: ${error.message}`);
      }
    };

    const runTests = async () => {
      try {
        setStatus('🔍 Checking API key...');
        if (!checkApiKey()) return;

        setStatus('📡 Loading Google Maps API...');
        await loadGoogleMaps();

        setStatus('⚙️ Initializing Places Autocomplete...');
        setTimeout(initializePlaces, 100); // Small delay to ensure DOM is ready

      } catch (error) {
        console.error('❌ Test failed:', error);
        setErrors(prev => [...prev, error.message]);
        setStatus(`❌ Test failed: ${error.message}`);
      }
    };

    runTests();
  }, []);

  const testApiKeyDirectly = () => {
    const key = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
    const testUrl = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
    window.open(testUrl, '_blank');
  };

  return (
    <div className="p-6 max-w-2xl mx-auto bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">🧪 Google Places API Test</h2>
      
      {/* Status Display */}
      <div className="mb-4 p-3 rounded-md bg-gray-50">
        <p className="font-medium text-gray-700">Status:</p>
        <p className="text-sm mt-1">{status}</p>
      </div>

      {/* API Key Info */}
      <div className="mb-4 p-3 rounded-md bg-blue-50">
        <p className="font-medium text-blue-700">API Key:</p>
        <p className="text-sm mt-1 font-mono break-all">
          {apiKey.length > 10 ? `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 10)}` : apiKey}
        </p>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200">
          <p className="font-medium text-red-700 mb-2">Errors:</p>
          {errors.map((error, index) => (
            <p key={index} className="text-sm text-red-600 mb-1">• {error}</p>
          ))}
        </div>
      )}

      {/* Test Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Test Address Input (Try typing "Mumbai" or "Delhi"):
        </label>
        <input
          ref={inputRef}
          type="text"
          placeholder="Start typing an address..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <p className="text-xs text-gray-500 mt-1">If working, you should see suggestions appear below as you type</p>
      </div>

      {/* Debug Actions */}
      <div className="space-y-2">
        <button
          onClick={testApiKeyDirectly}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          🔗 Test API Key Directly (Opens New Tab)
        </button>
        
        <button
          onClick={() => window.location.reload()}
          className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
        >
          🔄 Reload Page
        </button>
      </div>

      {/* Instructions */}
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
        <h3 className="font-medium text-yellow-800 mb-2">🔍 Debugging Instructions:</h3>
        <ol className="text-sm text-yellow-700 space-y-1">
          <li>1. Open Browser DevTools (F12) and check Console tab for errors</li>
          <li>2. Check Network tab for failed requests to googleapis.com</li>
          <li>3. Verify the API key test opens successfully in new tab</li>
          <li>4. Ensure Places API and Maps JavaScript API are enabled in Google Cloud Console</li>
          <li>5. Confirm billing is enabled in your Google Cloud project</li>
        </ol>
      </div>
    </div>
  );
};

export default SimplePlacesTest; 