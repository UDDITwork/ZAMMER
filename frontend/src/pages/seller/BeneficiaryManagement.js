// frontend/src/pages/seller/BeneficiaryManagement.js
// Seller-side beneficiary management for Cashfree payouts

import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import SellerLayout from '../../components/layouts/SellerLayout';
import { toast } from 'react-toastify';
import sellerService from '../../services/sellerService';

const BeneficiaryManagement = () => {
  const { sellerAuth } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [beneficiary, setBeneficiary] = useState(null);
  const [bankDetails, setBankDetails] = useState({
    accountNumber: '',
    ifscCode: '',
    accountHolderName: '',
    bankName: ''
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchBeneficiaryDetails();
  }, []);

  const fetchBeneficiaryDetails = async () => {
    try {
      setLoading(true);
      const response = await sellerService.getBeneficiary();
      if (response.success) {
        setBeneficiary(response.data);
        if (response.data.bankDetails) {
          setBankDetails({
            accountNumber: response.data.bankDetails.accountNumber || '',
            ifscCode: response.data.bankDetails.ifscCode || '',
            accountHolderName: response.data.bankDetails.accountHolderName || '',
            bankName: response.data.bankDetails.bankName || ''
          });
        }
      }
    } catch (error) {
      console.error('Error fetching beneficiary:', error);
      if (error.message !== 'No beneficiary found') {
        toast.error('Failed to load beneficiary details');
      }
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!bankDetails.accountNumber.trim()) {
      newErrors.accountNumber = 'Account number is required';
    } else if (!/^\d{9,18}$/.test(bankDetails.accountNumber)) {
      newErrors.accountNumber = 'Account number must be 9-18 digits';
    }
    
    if (!bankDetails.ifscCode.trim()) {
      newErrors.ifscCode = 'IFSC code is required';
    } else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bankDetails.ifscCode.toUpperCase())) {
      newErrors.ifscCode = 'Invalid IFSC code format';
    }
    
    if (!bankDetails.accountHolderName.trim()) {
      newErrors.accountHolderName = 'Account holder name is required';
    } else if (bankDetails.accountHolderName.trim().length < 2) {
      newErrors.accountHolderName = 'Account holder name must be at least 2 characters';
    }
    
    if (!bankDetails.bankName.trim()) {
      newErrors.bankName = 'Bank name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setBankDetails(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleCreateBeneficiary = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors below');
      return;
    }

    try {
      setSubmitting(true);
      const response = await sellerService.createBeneficiary(bankDetails);
      
      if (response.success) {
        toast.success('Beneficiary created successfully! Please wait for verification.');
        setBeneficiary(response.data);
      } else {
        throw new Error(response.message || 'Failed to create beneficiary');
      }
    } catch (error) {
      console.error('Error creating beneficiary:', error);
      toast.error(error.message || 'Failed to create beneficiary');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateBeneficiary = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors below');
      return;
    }

    try {
      setSubmitting(true);
      const response = await sellerService.updateBeneficiary(bankDetails);
      
      if (response.success) {
        toast.success('Beneficiary updated successfully! Please wait for verification.');
        setBeneficiary(response.data);
      } else {
        throw new Error(response.message || 'Failed to update beneficiary');
      }
    } catch (error) {
      console.error('Error updating beneficiary:', error);
      toast.error(error.message || 'Failed to update beneficiary');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'verified':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'verified':
        return '✅';
      case 'pending':
        return '⏳';
      case 'failed':
        return '❌';
      default:
        return '❓';
    }
  };

  if (loading) {
    return (
      <SellerLayout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading beneficiary details...</p>
          </div>
        </div>
      </SellerLayout>
    );
  }

  return (
    <SellerLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Payout Management</h1>
          <p className="text-gray-600 mt-2">
            Manage your bank details for receiving payouts from ZAMMER
          </p>
        </div>

        {/* Current Beneficiary Status */}
        {beneficiary && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Current Beneficiary Status</h2>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(beneficiary.status)}`}>
                <span className="mr-2">{getStatusIcon(beneficiary.status)}</span>
                {beneficiary.status}
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Account Details</h3>
                <div className="space-y-2">
                  <p className="text-sm">
                    <span className="font-medium">Account Number:</span> 
                    <span className="ml-2 font-mono">{beneficiary.bankDetails?.accountNumber?.replace(/(.{4})(.*)(.{4})/, '$1****$3') || 'N/A'}</span>
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">IFSC Code:</span> 
                    <span className="ml-2 font-mono">{beneficiary.bankDetails?.ifscCode || 'N/A'}</span>
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Bank Name:</span> 
                    <span className="ml-2">{beneficiary.bankDetails?.bankName || 'N/A'}</span>
                  </p>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Verification Details</h3>
                <div className="space-y-2">
                  <p className="text-sm">
                    <span className="font-medium">Beneficiary ID:</span> 
                    <span className="ml-2 font-mono text-xs">{beneficiary.beneficiaryId || 'N/A'}</span>
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Created:</span> 
                    <span className="ml-2">{beneficiary.addedOn ? new Date(beneficiary.addedOn).toLocaleDateString('en-IN') : 'N/A'}</span>
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Last Updated:</span> 
                    <span className="ml-2">{beneficiary.updatedOn ? new Date(beneficiary.updatedOn).toLocaleDateString('en-IN') : 'N/A'}</span>
                  </p>
                </div>
              </div>
            </div>

            {beneficiary.status === 'PENDING' && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">Verification in Progress</h3>
                    <p className="text-sm text-yellow-700 mt-1">
                      Your beneficiary details are being verified by Cashfree. This usually takes 1-2 business days.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {beneficiary.status === 'FAILED' && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Verification Failed</h3>
                    <p className="text-sm text-red-700 mt-1">
                      Your beneficiary details could not be verified. Please check your bank details and try again.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bank Details Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {beneficiary ? 'Update Bank Details' : 'Add Bank Details'}
            </h2>
            <p className="text-gray-600 mt-1">
              {beneficiary 
                ? 'Update your bank account details for receiving payouts'
                : 'Add your bank account details to start receiving payouts'
              }
            </p>
          </div>

          <form onSubmit={beneficiary ? handleUpdateBeneficiary : handleCreateBeneficiary}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Account Holder Name */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Holder Name *
                </label>
                <input
                  type="text"
                  name="accountHolderName"
                  value={bankDetails.accountHolderName}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                    errors.accountHolderName ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter account holder name as per bank records"
                  disabled={submitting}
                />
                {errors.accountHolderName && (
                  <p className="mt-1 text-sm text-red-600">{errors.accountHolderName}</p>
                )}
              </div>

              {/* Account Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Number *
                </label>
                <input
                  type="text"
                  name="accountNumber"
                  value={bankDetails.accountNumber}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                    errors.accountNumber ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter your bank account number"
                  disabled={submitting}
                />
                {errors.accountNumber && (
                  <p className="mt-1 text-sm text-red-600">{errors.accountNumber}</p>
                )}
              </div>

              {/* IFSC Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  IFSC Code *
                </label>
                <input
                  type="text"
                  name="ifscCode"
                  value={bankDetails.ifscCode}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                    errors.ifscCode ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter IFSC code (e.g., SBIN0001234)"
                  disabled={submitting}
                />
                {errors.ifscCode && (
                  <p className="mt-1 text-sm text-red-600">{errors.ifscCode}</p>
                )}
              </div>

              {/* Bank Name */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bank Name *
                </label>
                <input
                  type="text"
                  name="bankName"
                  value={bankDetails.bankName}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                    errors.bankName ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter your bank name"
                  disabled={submitting}
                />
                {errors.bankName && (
                  <p className="mt-1 text-sm text-red-600">{errors.bankName}</p>
                )}
              </div>
            </div>

            {/* Important Notice */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">Important Information</h3>
                  <div className="text-sm text-blue-700 mt-1 space-y-1">
                    <p>• Bank details must match your registered business name</p>
                    <p>• Account holder name should be exactly as per bank records</p>
                    <p>• IFSC code format: 4 letters + 0 + 6 characters (e.g., SBIN0001234)</p>
                    <p>• Verification usually takes 1-2 business days</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white px-6 py-2 rounded-md font-medium transition-colors flex items-center"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {beneficiary ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  beneficiary ? 'Update Beneficiary' : 'Create Beneficiary'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </SellerLayout>
  );
};

export default BeneficiaryManagement;
