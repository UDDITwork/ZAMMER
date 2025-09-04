import React from 'react';
import { Link } from 'react-router-dom';

const LowStockAlert = ({ lowStockProducts, onClose }) => {
  if (!lowStockProducts || lowStockProducts.length === 0) {
    return null;
  }

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.856-.833-2.598 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-orange-800 mb-2">
              Low Stock Alert
            </h3>
            <p className="text-orange-700 text-sm mb-3">
              {lowStockProducts.length} product{lowStockProducts.length > 1 ? 's' : ''} running low on stock
            </p>
            
            <div className="space-y-2">
              {lowStockProducts.slice(0, 3).map((product) => (
                <div key={product._id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-orange-200">
                  <div className="flex items-center space-x-3">
                    {product.images && product.images.length > 0 && (
                      <img 
                        src={product.images[0]} 
                        alt={product.name}
                        className="w-10 h-10 object-cover rounded-lg"
                      />
                    )}
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{product.name}</p>
                      <p className="text-orange-600 text-xs">
                        Stock: {product.inventory?.availableQuantity || 0} units
                      </p>
                    </div>
                  </div>
                  <Link
                    to={`/seller/edit-product/${product._id}`}
                    className="text-orange-600 hover:text-orange-700 text-xs font-medium"
                  >
                    Manage Stock →
                  </Link>
                </div>
              ))}
            </div>
            
            {lowStockProducts.length > 3 && (
              <p className="text-orange-600 text-xs mt-2">
                +{lowStockProducts.length - 3} more products with low stock
              </p>
            )}
            
            <div className="mt-4 flex space-x-3">
              <Link
                to="/seller/view-products"
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                View All Products
              </Link>
              <button
                onClick={onClose}
                className="text-orange-600 hover:text-orange-700 text-sm font-medium"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
        
        <button
          onClick={onClose}
          className="flex-shrink-0 text-orange-400 hover:text-orange-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default LowStockAlert;
