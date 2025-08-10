import React, { useState } from 'react';
import { getMarketplaceProducts } from '../services/productService';

const DebugFilter = () => {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const testFilter = async (category, subCategory) => {
    setLoading(true);
    try {
      console.log(`🧪 Testing filter: ${category} → ${subCategory}`);
      const response = await getMarketplaceProducts({
        category,
        subCategory,
        page: 1,
        limit: 12
      });
      setResults(response);
      console.log('🧪 Test result:', response);
    } catch (error) {
      console.error('🧪 Test error:', error);
      setResults({ success: false, message: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', background: '#f5f5f5', margin: '20px' }}>
      <h3>🧪 Debug Filter Testing</h3>
      
      <div style={{ marginBottom: '20px' }}>
        <button onClick={() => testFilter('Men', 'Shirts')} disabled={loading}>
          Test: Men → Shirts
        </button>
        <button onClick={() => testFilter('Men', 'T-shirts')} disabled={loading}>
          Test: Men → T-shirts
        </button>
        <button onClick={() => testFilter('Women', 'Dresses')} disabled={loading}>
          Test: Women → Dresses
        </button>
      </div>

      {loading && <div>🔄 Testing...</div>}
      
      {results && (
        <div style={{ background: 'white', padding: '10px', borderRadius: '5px' }}>
          <h4>Results:</h4>
          <pre>{JSON.stringify(results, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default DebugFilter;
