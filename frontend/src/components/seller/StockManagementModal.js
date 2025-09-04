import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { addProductStock, getProductInventory } from '../../services/productService';

const StockManagementModal = ({ 
  isOpen, 
  onClose, 
  product, 
  onStockUpdated 
}) => {
  const [inventoryData, setInventoryData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [stockUpdates, setStockUpdates] = useState({});
  const [notes, setNotes] = useState('');

  // Size options
  const sizeOptions = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'];
  
  // Color options
  const colorOptions = [
    { name: 'Black', code: '#000000' },
    { name: 'White', code: '#FFFFFF' },
    { name: 'Red', code: '#FF0000' },
    { name: 'Blue', code: '#0000FF' },
    { name: 'Green', code: '#008000' },
    { name: 'Yellow', code: '#FFFF00' },
    { name: 'Purple', code: '#800080' },
    { name: 'Orange', code: '#FFA500' },
    { name: 'Pink', code: '#FFC0CB' },
    { name: 'Brown', code: '#964B00' },
    { name: 'Gray', code: '#808080' },
    { name: 'Navy', code: '#000080' }
  ];

  useEffect(() => {
    if (isOpen && product) {
      fetchInventoryData();
    }
  }, [isOpen, product]);

  const fetchInventoryData = async () => {
    setLoading(true);
    try {
      const response = await getProductInventory(product._id);
      if (response.success) {
        setInventoryData(response.data);
        console.log('📦 Inventory data loaded:', response.data);
      } else {
        toast.error('Failed to load inventory data');
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
      toast.error('Something went wrong while loading inventory');
    } finally {
      setLoading(false);
    }
  };

  const handleStockUpdate = (size, color, quantity) => {
    const key = `${size}-${color}`;
    setStockUpdates(prev => ({
      ...prev,
      [key]: {
        size,
        color,
        quantity: parseInt(quantity) || 0
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Convert stock updates to variant updates format
    const variantUpdates = Object.values(stockUpdates).filter(update => 
      update.quantity > 0
    );

    if (variantUpdates.length === 0) {
      toast.error('Please add stock for at least one size/color combination');
      return;
    }

    setSubmitting(true);
    try {
      const response = await addProductStock(product._id, variantUpdates, notes);
      if (response.success) {
        toast.success('Stock updated successfully!');
        setStockUpdates({});
        setNotes('');
        // Refresh inventory data to show updated stock levels
        await fetchInventoryData();
        onStockUpdated();
        onClose();
      } else {
        toast.error(response.message || 'Failed to update stock');
      }
    } catch (error) {
      console.error('Error updating stock:', error);
      toast.error('Something went wrong while updating stock');
    } finally {
      setSubmitting(false);
    }
  };

  const getCurrentStock = (size, color) => {
    if (!inventoryData?.variants) return 0;
    
    const variant = inventoryData.variants.find(v => 
      v.size === size && v.color === color
    );
    return variant ? variant.quantity : 0;
  };

  const getTotalStock = () => {
    if (!inventoryData?.variants) return 0;
    return inventoryData.variants.reduce((total, variant) => total + variant.quantity, 0);
  };

  const getLowStockVariants = () => {
    if (!inventoryData?.variants) return [];
    return inventoryData.variants.filter(variant => 
      variant.quantity <= inventoryData.lowStockThreshold
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Stock Management</h2>
            <p className="text-gray-600 mt-1">{product?.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading inventory data...</p>
            </div>
          </div>
        ) : (
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            {/* Inventory Summary */}
            {inventoryData && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h3 className="text-sm font-medium text-blue-700">Total Stock</h3>
                  <p className="text-2xl font-bold text-blue-900">{getTotalStock()}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h3 className="text-sm font-medium text-green-700">Available</h3>
                  <p className="text-2xl font-bold text-green-900">{inventoryData.availableQuantity}</p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <h3 className="text-sm font-medium text-yellow-700">Reserved</h3>
                  <p className="text-2xl font-bold text-yellow-900">{inventoryData.reservedQuantity}</p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <h3 className="text-sm font-medium text-red-700">Low Stock Threshold</h3>
                  <p className="text-2xl font-bold text-red-900">{inventoryData.lowStockThreshold}</p>
                </div>
              </div>
            )}

            {/* Current Stock Display */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Current Stock Levels</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {inventoryData?.variants?.map((variant, index) => (
                    <div 
                      key={`${variant.size}-${variant.color}-${index}`}
                      className={`p-3 rounded-lg border ${
                        variant.quantity <= inventoryData.lowStockThreshold 
                          ? 'bg-red-50 border-red-200' 
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-800">
                            {variant.size} - {variant.color}
                          </p>
                          <p className="text-sm text-gray-600">
                            {variant.quantity} units
                          </p>
                        </div>
                        <div 
                          className="w-4 h-4 rounded-full border"
                          style={{ backgroundColor: variant.colorCode }}
                        ></div>
                      </div>
                      {variant.quantity <= inventoryData.lowStockThreshold && (
                        <div className="mt-2 flex items-center text-red-600">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.856-.833-2.598 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                          <span className="text-xs font-medium">Low stock alert</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Add Stock Section */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Add Stock to Variants</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Stock Update Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sizeOptions.map(size => (
                    colorOptions.map(color => {
                      const key = `${size}-${color.name}`;
                      const currentStock = getCurrentStock(size, color.name);
                      const updateValue = stockUpdates[key]?.quantity || 0;
                      
                      return (
                        <div key={key} className="bg-white border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-2">
                              <div 
                                className="w-4 h-4 rounded-full border"
                                style={{ backgroundColor: color.code }}
                              ></div>
                              <span className="font-medium text-gray-800">
                                {size} - {color.name}
                              </span>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="text-sm text-gray-600">
                              Current: <span className="font-medium">{currentStock}</span>
                            </div>
                            
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">
                                Add Quantity
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={updateValue}
                                onChange={(e) => handleStockUpdate(size, color.name, e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                placeholder="0"
                              />
                            </div>
                            
                            {updateValue > 0 && (
                              <div className="text-sm text-green-600 font-medium">
                                New Total: {currentStock + updateValue}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ))}
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Add any notes about this stock update..."
                  />
                </div>

                {/* Submit Button */}
                <div className="flex justify-end space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || Object.values(stockUpdates).every(update => update.quantity <= 0)}
                    className={`px-6 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 ${
                      submitting || Object.values(stockUpdates).every(update => update.quantity <= 0)
                        ? 'opacity-50 cursor-not-allowed'
                        : ''
                    }`}
                  >
                    {submitting ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Updating Stock...
                      </div>
                    ) : (
                      'Update Stock'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StockManagementModal;
