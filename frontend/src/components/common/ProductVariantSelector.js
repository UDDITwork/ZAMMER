import React, { useState, useEffect } from 'react';

const ProductVariantSelector = ({ 
  product, 
  onVariantSelect, 
  selectedVariant, 
  disabled = false 
}) => {
  const [availableVariants, setAvailableVariants] = useState([]);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');

  // Size options
  const sizeOptions = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'];

  useEffect(() => {
    if (product?.variants) {
      // Group variants by size and color
      const variants = product.variants.filter(variant => variant.quantity > 0);
      setAvailableVariants(variants);
      
      // Set initial selection if provided
      if (selectedVariant) {
        setSelectedSize(selectedVariant.size);
        setSelectedColor(selectedVariant.color);
      }
    }
  }, [product, selectedVariant]);

  const handleSizeChange = (size) => {
    setSelectedSize(size);
    setSelectedColor(''); // Reset color when size changes
    
    // Find available colors for this size
    const availableColors = availableVariants
      .filter(variant => variant.size === size && variant.quantity > 0)
      .map(variant => variant.color);
    
    if (availableColors.length > 0) {
      setSelectedColor(availableColors[0]);
    }
    
    // Notify parent component
    if (onVariantSelect && size) {
      const variant = availableVariants.find(v => v.size === size && v.color === availableColors[0]);
      onVariantSelect(variant);
    }
  };

  const handleColorChange = (color) => {
    setSelectedColor(color);
    
    // Notify parent component
    if (onVariantSelect && selectedSize && color) {
      const variant = availableVariants.find(v => v.size === selectedSize && v.color === color);
      onVariantSelect(variant);
    }
  };

  const getAvailableSizes = () => {
    const sizes = [...new Set(availableVariants.map(variant => variant.size))];
    return sizes.sort((a, b) => sizeOptions.indexOf(a) - sizeOptions.indexOf(b));
  };

  const getAvailableColors = (size) => {
    if (!size) return [];
    return availableVariants
      .filter(variant => variant.size === size && variant.quantity > 0)
      .map(variant => variant.color);
  };

  const getVariantQuantity = (size, color) => {
    const variant = availableVariants.find(v => v.size === size && v.color === color);
    return variant ? variant.quantity : 0;
  };

  const getStockStatus = (quantity) => {
    if (quantity === 0) return { status: 'out-of-stock', text: 'Out of Stock', color: 'text-red-600' };
    if (quantity <= 5) return { status: 'low-stock', text: 'Low Stock', color: 'text-orange-600' };
    return { status: 'in-stock', text: 'In Stock', color: 'text-green-600' };
  };

  if (!product?.variants || availableVariants.length === 0) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.856-.833-2.598 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span className="text-red-700 font-medium">This product is currently out of stock</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Size Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Size <span className="text-red-500">*</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {getAvailableSizes().map((size) => {
            const isSelected = selectedSize === size;
            const isDisabled = disabled;
            
            return (
              <button
                key={size}
                type="button"
                onClick={() => handleSizeChange(size)}
                disabled={isDisabled}
                className={`px-4 py-2 border rounded-lg text-sm font-medium transition-all duration-200 ${
                  isSelected
                    ? 'border-orange-500 bg-orange-50 text-orange-700 ring-2 ring-orange-200'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50'
                } ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {size}
              </button>
            );
          })}
        </div>
        {!selectedSize && (
          <p className="text-sm text-gray-500 mt-1">Please select a size</p>
        )}
      </div>

      {/* Color Selection */}
      {selectedSize && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Color <span className="text-red-500">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {getAvailableColors(selectedSize).map((color) => {
              const isSelected = selectedColor === color;
              const isDisabled = disabled;
              const quantity = getVariantQuantity(selectedSize, color);
              const stockStatus = getStockStatus(quantity);
              
              return (
                <button
                  key={color}
                  type="button"
                  onClick={() => handleColorChange(color)}
                  disabled={isDisabled}
                  className={`px-4 py-2 border rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-2 ${
                    isSelected
                      ? 'border-orange-500 bg-orange-50 text-orange-700 ring-2 ring-orange-200'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50'
                  } ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <span>{color}</span>
                  <span className={`text-xs ${stockStatus.color}`}>
                    ({quantity})
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Stock Information */}
      {selectedSize && selectedColor && (
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">
                Selected: {selectedSize} - {selectedColor}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              {(() => {
                const quantity = getVariantQuantity(selectedSize, selectedColor);
                const stockStatus = getStockStatus(quantity);
                
                return (
                  <>
                    <span className={`text-sm font-medium ${stockStatus.color}`}>
                      {stockStatus.text}
                    </span>
                    <span className="text-sm text-gray-600">
                      ({quantity} available)
                    </span>
                  </>
                );
              })()}
            </div>
          </div>
          
          {/* Low Stock Warning */}
          {(() => {
            const quantity = getVariantQuantity(selectedSize, selectedColor);
            if (quantity > 0 && quantity <= 5) {
              return (
                <div className="mt-2 flex items-center text-orange-600">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.856-.833-2.598 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <span className="text-xs font-medium">
                    Only {quantity} left in stock - Order soon!
                  </span>
                </div>
              );
            }
            return null;
          })()}
        </div>
      )}

      {/* Out of Stock Message */}
      {selectedSize && selectedColor && getVariantQuantity(selectedSize, selectedColor) === 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.856-.833-2.598 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-red-700 font-medium">
              This size and color combination is out of stock
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductVariantSelector;
