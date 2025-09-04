import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import orderService from '../../services/orderService';

const LabelPreview = ({ orderId, isOpen, onClose }) => {
  const [labelData, setLabelData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && orderId) {
      fetchLabelData();
    }
  }, [isOpen, orderId]);

  const fetchLabelData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await orderService.getShippingLabel(orderId);
      
      if (response.success) {
        setLabelData(response.data);
      } else {
        setError(response.message || 'Failed to fetch label data');
      }
    } catch (error) {
      console.error('Error fetching label data:', error);
      setError('Error fetching label data');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      const response = await orderService.downloadShippingLabel(orderId);
      
      if (response.success) {
        toast.success('Label downloaded successfully');
        onClose();
      } else {
        toast.error(response.message || 'Failed to download label');
      }
    } catch (error) {
      console.error('Error downloading label:', error);
      toast.error('Error downloading label');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Shipping Label Preview</h2>
            <p className="text-sm text-gray-600 mt-1">
              Order #{labelData?.orderNumber || 'Loading...'}
            </p>
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

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
              <span className="ml-3 text-gray-600">Loading label data...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="bg-red-100 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Label</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={fetchLabelData}
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : labelData ? (
            <div className="space-y-6">
              {/* Label Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Label Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Tracking Number</p>
                    <p className="font-medium text-gray-900">{labelData.trackingNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Carrier</p>
                    <p className="font-medium text-gray-900">{labelData.carrier}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Service Type</p>
                    <p className="font-medium text-gray-900">{labelData.serviceType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Generated At</p>
                    <p className="font-medium text-gray-900">{formatDate(labelData.generatedAt)}</p>
                  </div>
                </div>
              </div>

              {/* Customer Information */}
              {labelData.labelData && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Customer Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Name</p>
                      <p className="font-medium text-gray-900">{labelData.labelData.customerName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Phone</p>
                      <p className="font-medium text-gray-900">{labelData.labelData.customerPhone}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-sm text-gray-600">Address</p>
                      <p className="font-medium text-gray-900">
                        {labelData.labelData.customerAddress}, {labelData.labelData.customerCity} - {labelData.labelData.customerPincode}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Order Items */}
              {labelData.labelData?.items && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Order Items</h3>
                  <div className="space-y-3">
                    {labelData.labelData.items.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{item.name}</p>
                          <p className="text-sm text-gray-600">
                            SKU: {item.sku} | Size: {item.size} | Color: {item.color} | Qty: {item.quantity}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">₹{item.price}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Shipping Codes */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Shipping Codes</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Destination Code</p>
                    <p className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{labelData.destinationCode}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Return Code</p>
                    <p className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{labelData.returnCode}</p>
                  </div>
                </div>
              </div>

              {/* PDF Preview Note */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h4 className="text-sm font-medium text-blue-900">PDF Label Ready</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      The complete shipping label with barcode, QR code, and tax invoice has been generated. 
                      Click "Download Label" to get the PDF file.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            {labelData && (
              <span>Label generated on {formatDate(labelData.generatedAt)}</span>
            )}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
            {labelData && (
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-md transition-colors flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download Label
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabelPreview;

