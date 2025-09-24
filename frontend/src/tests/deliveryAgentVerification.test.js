// frontend/src/tests/deliveryAgentVerification.test.js
// Comprehensive frontend tests for delivery agent order ID verification system

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { toast } from 'react-toastify';
import OrderPickup from '../pages/delivery/OrderPickup';
import { useDelivery } from '../contexts/DeliveryContext';

// Mock dependencies
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
  useParams: () => ({ orderId: 'test-order-id' })
}));

jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn()
  }
}));

jest.mock('../contexts/DeliveryContext', () => ({
  useDelivery: jest.fn()
}));

jest.mock('../components/layouts/DeliveryLayout', () => {
  return function MockDeliveryLayout({ children }) {
    return <div data-testid="delivery-layout">{children}</div>;
  };
});

// Mock fetch for API calls
global.fetch = jest.fn();

describe('Delivery Agent Order ID Verification System - Frontend', () => {
  const mockNavigate = jest.fn();
  const mockShowNotification = jest.fn();
  const mockCompletePickup = jest.fn();
  const mockGetCurrentLocation = jest.fn();

  const mockOrder = {
    id: 'test-order-id',
    orderNumber: 'ORD123456789',
    customer: {
      name: 'Test Customer',
      phone: '+919876543210'
    },
    seller: {
      name: 'Test Seller',
      shopName: 'Test Shop',
      address: 'Test Address',
      phone: '+919876543211'
    },
    items: [
      {
        name: 'Test Product',
        quantity: 2,
        image: 'test-image.jpg'
      }
    ],
    totalAmount: 200,
    deliveryFee: 50,
    deliveryAddress: {
      address: 'Test Delivery Address',
      city: 'Test City',
      postalCode: '123456'
    }
  };

  const mockAssignedOrders = [mockOrder];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock useDelivery hook
    useDelivery.mockReturnValue({
      assignedOrders: mockAssignedOrders,
      completePickup: mockCompletePickup,
      deliveryService: {
        getCurrentLocation: mockGetCurrentLocation,
        validateOrderId: jest.fn()
      },
      getCurrentLocation: mockGetCurrentLocation,
      showNotification: mockShowNotification
    });

    // Mock successful location fetch
    mockGetCurrentLocation.mockResolvedValue({
      success: true,
      data: {
        latitude: 12.9716,
        longitude: 77.5946,
        accuracy: 10
      }
    });

    // Mock successful pickup completion
    mockCompletePickup.mockResolvedValue({
      success: true,
      message: 'Pickup completed successfully'
    });
  });

  describe('Order ID Verification Form', () => {
    it('should render order ID verification input field', () => {
      render(
        <BrowserRouter>
          <OrderPickup />
        </BrowserRouter>
      );

      const orderIdInput = screen.getByLabelText(/Order ID \(Ask seller for this\)/i);
      expect(orderIdInput).toBeInTheDocument();
      expect(orderIdInput).toHaveAttribute('type', 'text');
      expect(orderIdInput).toHaveAttribute('required');
    });

    it('should render pickup notes textarea', () => {
      render(
        <BrowserRouter>
          <OrderPickup />
        </BrowserRouter>
      );

      const notesTextarea = screen.getByLabelText(/Pickup Notes \(Optional\)/i);
      expect(notesTextarea).toBeInTheDocument();
      expect(notesTextarea.tagName).toBe('TEXTAREA');
    });

    it('should render confirm pickup button', () => {
      render(
        <BrowserRouter>
          <OrderPickup />
        </BrowserRouter>
      );

      const confirmButton = screen.getByRole('button', { name: /Confirm Pickup/i });
      expect(confirmButton).toBeInTheDocument();
    });
  });

  describe('Order ID Verification Logic', () => {
    it('should validate order ID input', async () => {
      render(
        <BrowserRouter>
          <OrderPickup />
        </BrowserRouter>
      );

      const orderIdInput = screen.getByLabelText(/Order ID \(Ask seller for this\)/i);
      const confirmButton = screen.getByRole('button', { name: /Confirm Pickup/i });

      // Try to submit without order ID
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockCompletePickup).not.toHaveBeenCalled();
      });
    });

    it('should accept valid order ID and complete pickup', async () => {
      render(
        <BrowserRouter>
          <OrderPickup />
        </BrowserRouter>
      );

      const orderIdInput = screen.getByLabelText(/Order ID \(Ask seller for this\)/i);
      const notesTextarea = screen.getByLabelText(/Pickup Notes \(Optional\)/i);
      const confirmButton = screen.getByRole('button', { name: /Confirm Pickup/i });

      // Enter valid order ID
      fireEvent.change(orderIdInput, { target: { value: 'ORD123456789' } });
      fireEvent.change(notesTextarea, { target: { value: 'Items collected successfully' } });

      // Submit form
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockCompletePickup).toHaveBeenCalledWith('test-order-id', {
          orderIdVerification: 'ORD123456789',
          pickupNotes: 'Items collected successfully',
          location: {
            type: 'Point',
            coordinates: [77.5946, 12.9716]
          }
        });
      });
    });

    it('should handle order ID validation errors', async () => {
      // Mock validation failure
      mockCompletePickup.mockResolvedValue({
        success: false,
        message: 'Order ID verification failed'
      });

      render(
        <BrowserRouter>
          <OrderPickup />
        </BrowserRouter>
      );

      const orderIdInput = screen.getByLabelText(/Order ID \(Ask seller for this\)/i);
      const confirmButton = screen.getByRole('button', { name: /Confirm Pickup/i });

      // Enter order ID and submit
      fireEvent.change(orderIdInput, { target: { value: 'WRONG_ORDER_ID' } });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockCompletePickup).toHaveBeenCalled();
        expect(mockShowNotification).toHaveBeenCalledWith(
          'Order ID verification failed',
          'error'
        );
      });
    });

    it('should handle whitespace in order ID input', async () => {
      render(
        <BrowserRouter>
          <OrderPickup />
        </BrowserRouter>
      );

      const orderIdInput = screen.getByLabelText(/Order ID \(Ask seller for this\)/i);
      const confirmButton = screen.getByRole('button', { name: /Confirm Pickup/i });

      // Enter order ID with whitespace
      fireEvent.change(orderIdInput, { target: { value: '  ORD123456789  ' } });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockCompletePickup).toHaveBeenCalledWith('test-order-id', 
          expect.objectContaining({
            orderIdVerification: '  ORD123456789  '
          })
        );
      });
    });
  });

  describe('Form Validation', () => {
    it('should show error for empty order ID', async () => {
      render(
        <BrowserRouter>
          <OrderPickup />
        </BrowserRouter>
      );

      const confirmButton = screen.getByRole('button', { name: /Confirm Pickup/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockCompletePickup).not.toHaveBeenCalled();
      });
    });

    it('should clear error when user starts typing', async () => {
      render(
        <BrowserRouter>
          <OrderPickup />
        </BrowserRouter>
      );

      const orderIdInput = screen.getByLabelText(/Order ID \(Ask seller for this\)/i);
      const confirmButton = screen.getByRole('button', { name: /Confirm Pickup/i });

      // Try to submit without order ID
      fireEvent.click(confirmButton);

      // Start typing
      fireEvent.change(orderIdInput, { target: { value: 'ORD' } });

      // Error should be cleared
      expect(orderIdInput).toHaveValue('ORD');
    });
  });

  describe('Location Integration', () => {
    it('should get current location on component mount', async () => {
      render(
        <BrowserRouter>
          <OrderPickup />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(mockGetCurrentLocation).toHaveBeenCalled();
      });
    });

    it('should handle location fetch failure', async () => {
      mockGetCurrentLocation.mockResolvedValue({
        success: false,
        message: 'Location access denied'
      });

      render(
        <BrowserRouter>
          <OrderPickup />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(mockShowNotification).toHaveBeenCalledWith(
          'Location access denied',
          'warning'
        );
      });
    });

    it('should include location in pickup data when available', async () => {
      render(
        <BrowserRouter>
          <OrderPickup />
        </BrowserRouter>
      );

      const orderIdInput = screen.getByLabelText(/Order ID \(Ask seller for this\)/i);
      const confirmButton = screen.getByRole('button', { name: /Confirm Pickup/i });

      // Wait for location to be fetched
      await waitFor(() => {
        expect(mockGetCurrentLocation).toHaveBeenCalled();
      });

      // Enter order ID and submit
      fireEvent.change(orderIdInput, { target: { value: 'ORD123456789' } });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockCompletePickup).toHaveBeenCalledWith('test-order-id', 
          expect.objectContaining({
            location: {
              type: 'Point',
              coordinates: [77.5946, 12.9716]
            }
          })
        );
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading state during pickup completion', async () => {
      // Mock slow API response
      mockCompletePickup.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      );

      render(
        <BrowserRouter>
          <OrderPickup />
        </BrowserRouter>
      );

      const orderIdInput = screen.getByLabelText(/Order ID \(Ask seller for this\)/i);
      const confirmButton = screen.getByRole('button', { name: /Confirm Pickup/i });

      // Enter order ID and submit
      fireEvent.change(orderIdInput, { target: { value: 'ORD123456789' } });
      fireEvent.click(confirmButton);

      // Should show loading state
      expect(screen.getByText(/Confirming Pickup.../i)).toBeInTheDocument();
      expect(confirmButton).toBeDisabled();

      await waitFor(() => {
        expect(screen.queryByText(/Confirming Pickup.../i)).not.toBeInTheDocument();
      });
    });

    it('should show loading state during location fetch', async () => {
      // Mock slow location fetch
      mockGetCurrentLocation.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ 
          success: true, 
          data: { latitude: 12.9716, longitude: 77.5946, accuracy: 10 }
        }), 100))
      );

      render(
        <BrowserRouter>
          <OrderPickup />
        </BrowserRouter>
      );

      // Should show location loading state
      expect(screen.getByText(/Getting location.../i)).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByText(/Getting location.../i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      mockCompletePickup.mockRejectedValue(new Error('Network error'));

      render(
        <BrowserRouter>
          <OrderPickup />
        </BrowserRouter>
      );

      const orderIdInput = screen.getByLabelText(/Order ID \(Ask seller for this\)/i);
      const confirmButton = screen.getByRole('button', { name: /Confirm Pickup/i });

      // Enter order ID and submit
      fireEvent.change(orderIdInput, { target: { value: 'ORD123456789' } });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockShowNotification).toHaveBeenCalledWith(
          'Failed to complete pickup. Please try again.',
          'error'
        );
      });
    });

    it('should handle missing order gracefully', () => {
      // Mock order not found
      useDelivery.mockReturnValue({
        assignedOrders: [],
        completePickup: mockCompletePickup,
        deliveryService: { getCurrentLocation: mockGetCurrentLocation },
        getCurrentLocation: mockGetCurrentLocation,
        showNotification: mockShowNotification
      });

      render(
        <BrowserRouter>
          <OrderPickup />
        </BrowserRouter>
      );

      expect(mockShowNotification).toHaveBeenCalledWith(
        'Order not found',
        'error'
      );
    });
  });

  describe('User Experience', () => {
    it('should display order information correctly', () => {
      render(
        <BrowserRouter>
          <OrderPickup />
        </BrowserRouter>
      );

      expect(screen.getByText('Test Customer')).toBeInTheDocument();
      expect(screen.getByText('Test Shop')).toBeInTheDocument();
      expect(screen.getByText('Test Product')).toBeInTheDocument();
      expect(screen.getByText('₹200')).toBeInTheDocument();
    });

    it('should show progress indicator', () => {
      render(
        <BrowserRouter>
          <OrderPickup />
        </BrowserRouter>
      );

      expect(screen.getByText(/Order Accepted/i)).toBeInTheDocument();
      expect(screen.getByText(/Pickup in Progress/i)).toBeInTheDocument();
      expect(screen.getByText(/Delivery/i)).toBeInTheDocument();
    });

    it('should show pickup instructions', () => {
      render(
        <BrowserRouter>
          <OrderPickup />
        </BrowserRouter>
      );

      expect(screen.getByText(/Pickup Instructions/i)).toBeInTheDocument();
      expect(screen.getByText(/Ask the seller for the order ID/i)).toBeInTheDocument();
      expect(screen.getByText(/Enter the order ID below to verify/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper form labels', () => {
      render(
        <BrowserRouter>
          <OrderPickup />
        </BrowserRouter>
      );

      const orderIdInput = screen.getByLabelText(/Order ID \(Ask seller for this\)/i);
      const notesTextarea = screen.getByLabelText(/Pickup Notes \(Optional\)/i);

      expect(orderIdInput).toBeInTheDocument();
      expect(notesTextarea).toBeInTheDocument();
    });

    it('should have proper button roles', () => {
      render(
        <BrowserRouter>
          <OrderPickup />
        </BrowserRouter>
      );

      const confirmButton = screen.getByRole('button', { name: /Confirm Pickup/i });
      const updateLocationButton = screen.getByRole('button', { name: /Update location/i });

      expect(confirmButton).toBeInTheDocument();
      expect(updateLocationButton).toBeInTheDocument();
    });

    it('should have proper error messaging', async () => {
      render(
        <BrowserRouter>
          <OrderPickup />
        </BrowserRouter>
      );

      const confirmButton = screen.getByRole('button', { name: /Confirm Pickup/i });
      fireEvent.click(confirmButton);

      // Should show validation error
      await waitFor(() => {
        expect(mockCompletePickup).not.toHaveBeenCalled();
      });
    });
  });
});
