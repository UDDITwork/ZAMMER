// backend/tests/deliveryAgentVerification.test.js
// Comprehensive tests for delivery agent order ID verification system

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const DeliveryAgent = require('../models/DeliveryAgent');
const Order = require('../models/Order');
const User = require('../models/User');
const Seller = require('../models/Seller');

describe('Delivery Agent Order ID Verification System', () => {
  let deliveryAgent;
  let order;
  let user;
  let seller;
  let agentToken;

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/zammer_test');
  });

  beforeEach(async () => {
    // Clean up database
    await DeliveryAgent.deleteMany({});
    await Order.deleteMany({});
    await User.deleteMany({});
    await Seller.deleteMany({});

    // Create test user
    user = new User({
      name: 'Test Customer',
      email: 'customer@test.com',
      phone: '+919876543210',
      password: 'hashedpassword'
    });
    await user.save();

    // Create test seller
    seller = new Seller({
      firstName: 'Test',
      lastName: 'Seller',
      email: 'seller@test.com',
      phone: '+919876543211',
      password: 'hashedpassword',
      shop: {
        name: 'Test Shop',
        address: 'Test Address'
      }
    });
    await seller.save();

    // Create test delivery agent
    deliveryAgent = new DeliveryAgent({
      name: 'Test Agent',
      email: 'agent@test.com',
      phoneNumber: '+919876543212',
      password: 'hashedpassword',
      vehicleDetails: {
        type: 'bike',
        number: 'KA01AB1234'
      },
      status: 'available'
    });
    await deliveryAgent.save();

    // Create test order
    order = new Order({
      orderNumber: 'ORD123456789',
      user: user._id,
      seller: seller._id,
      orderItems: [{
        product: new mongoose.Types.ObjectId(),
        quantity: 2,
        price: 100
      }],
      totalPrice: 200,
      status: 'Pickup_Ready',
      deliveryAgent: {
        agent: deliveryAgent._id,
        assignedAt: new Date(),
        status: 'assigned'
      }
    });
    await order.save();

    // Get agent token
    agentToken = deliveryAgent.generateAuthToken();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('POST /api/delivery/orders/:id/pickup', () => {
    it('should successfully complete pickup with correct order ID', async () => {
      const response = await request(app)
        .put(`/api/delivery/orders/${order._id}/pickup`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          orderIdVerification: 'ORD123456789',
          pickupNotes: 'Items collected successfully'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Order pickup completed successfully');
      expect(response.body.data.status).toBe('Out_for_Delivery');
      expect(response.body.data.deliveryStatus).toBe('pickup_completed');

      // Verify database updates
      const updatedOrder = await Order.findById(order._id);
      expect(updatedOrder.pickup.isCompleted).toBe(true);
      expect(updatedOrder.deliveryAgent.status).toBe('pickup_completed');
      expect(updatedOrder.status).toBe('Out_for_Delivery');
    });

    it('should fail with incorrect order ID', async () => {
      const response = await request(app)
        .put(`/api/delivery/orders/${order._id}/pickup`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          orderIdVerification: 'WRONG_ORDER_ID',
          pickupNotes: 'Items collected successfully'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('ORDER_ID_MISMATCH');
      expect(response.body.message).toContain('Order ID verification failed');

      // Verify database remains unchanged
      const unchangedOrder = await Order.findById(order._id);
      expect(unchangedOrder.pickup.isCompleted).toBe(false);
      expect(unchangedOrder.deliveryAgent.status).toBe('assigned');
    });

    it('should fail with missing order ID verification', async () => {
      const response = await request(app)
        .put(`/api/delivery/orders/${order._id}/pickup`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          pickupNotes: 'Items collected successfully'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('MISSING_ORDER_ID_VERIFICATION');
    });

    it('should fail for unauthorized agent', async () => {
      // Create another agent
      const otherAgent = new DeliveryAgent({
        name: 'Other Agent',
        email: 'other@test.com',
        phoneNumber: '+919876543213',
        password: 'hashedpassword'
      });
      await otherAgent.save();
      const otherToken = otherAgent.generateAuthToken();

      const response = await request(app)
        .put(`/api/delivery/orders/${order._id}/pickup`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({
          orderIdVerification: 'ORD123456789',
          pickupNotes: 'Items collected successfully'
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('UNAUTHORIZED_ORDER');
    });

    it('should fail for non-existent order', async () => {
      const fakeOrderId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .put(`/api/delivery/orders/${fakeOrderId}/pickup`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          orderIdVerification: 'ORD123456789',
          pickupNotes: 'Items collected successfully'
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('ORDER_NOT_FOUND');
    });

    it('should fail for already completed pickup', async () => {
      // First, complete the pickup
      await request(app)
        .put(`/api/delivery/orders/${order._id}/pickup`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          orderIdVerification: 'ORD123456789',
          pickupNotes: 'Items collected successfully'
        });

      // Try to complete again
      const response = await request(app)
        .put(`/api/delivery/orders/${order._id}/pickup`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          orderIdVerification: 'ORD123456789',
          pickupNotes: 'Items collected successfully'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('PICKUP_ALREADY_COMPLETED');
    });

    it('should update delivery agent stats after successful pickup', async () => {
      const initialStats = deliveryAgent.stats.pickupsCompleted || 0;

      await request(app)
        .put(`/api/delivery/orders/${order._id}/pickup`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          orderIdVerification: 'ORD123456789',
          pickupNotes: 'Items collected successfully'
        });

      const updatedAgent = await DeliveryAgent.findById(deliveryAgent._id);
      expect(updatedAgent.stats.pickupsCompleted).toBe(initialStats + 1);
    });

    it('should handle case-insensitive order ID verification', async () => {
      const response = await request(app)
        .put(`/api/delivery/orders/${order._id}/pickup`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          orderIdVerification: 'ord123456789', // lowercase
          pickupNotes: 'Items collected successfully'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('ORDER_ID_MISMATCH');
    });

    it('should handle whitespace in order ID verification', async () => {
      const response = await request(app)
        .put(`/api/delivery/orders/${order._id}/pickup`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          orderIdVerification: '  ORD123456789  ', // with whitespace
          pickupNotes: 'Items collected successfully'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Order ID Verification Edge Cases', () => {
    it('should handle empty order ID', async () => {
      const response = await request(app)
        .put(`/api/delivery/orders/${order._id}/pickup`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          orderIdVerification: '',
          pickupNotes: 'Items collected successfully'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('MISSING_ORDER_ID_VERIFICATION');
    });

    it('should handle null order ID', async () => {
      const response = await request(app)
        .put(`/api/delivery/orders/${order._id}/pickup`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          orderIdVerification: null,
          pickupNotes: 'Items collected successfully'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('MISSING_ORDER_ID_VERIFICATION');
    });

    it('should handle very long order ID', async () => {
      const longOrderId = 'A'.repeat(1000);
      const response = await request(app)
        .put(`/api/delivery/orders/${order._id}/pickup`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          orderIdVerification: longOrderId,
          pickupNotes: 'Items collected successfully'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('ORDER_ID_MISMATCH');
    });
  });

  describe('Database Consistency Tests', () => {
    it('should maintain referential integrity after pickup', async () => {
      await request(app)
        .put(`/api/delivery/orders/${order._id}/pickup`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          orderIdVerification: 'ORD123456789',
          pickupNotes: 'Items collected successfully'
        });

      // Verify all references are intact
      const updatedOrder = await Order.findById(order._id)
        .populate('user')
        .populate('seller')
        .populate('deliveryAgent.agent');

      expect(updatedOrder.user._id.toString()).toBe(user._id.toString());
      expect(updatedOrder.seller._id.toString()).toBe(seller._id.toString());
      expect(updatedOrder.deliveryAgent.agent._id.toString()).toBe(deliveryAgent._id.toString());
    });

    it('should update order timeline correctly', async () => {
      await request(app)
        .put(`/api/delivery/orders/${order._id}/pickup`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          orderIdVerification: 'ORD123456789',
          pickupNotes: 'Items collected successfully'
        });

      const updatedOrder = await Order.findById(order._id);
      expect(updatedOrder.orderTimeline).toBeDefined();
      expect(updatedOrder.orderTimeline.length).toBeGreaterThan(0);
      
      const pickupEvent = updatedOrder.orderTimeline.find(event => event.status === 'pickup_completed');
      expect(pickupEvent).toBeDefined();
      expect(pickupEvent.agentId.toString()).toBe(deliveryAgent._id.toString());
    });
  });
});
