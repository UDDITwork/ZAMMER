// backend/test-cashfree-api-connectivity.js
// 🚀 Quick API connectivity test for Cashfree Payouts V2

require('dotenv').config();
const axios = require('axios');

class CashfreeAPITester {
  constructor() {
    this.baseURL = process.env.NODE_ENV === 'production' 
      ? 'https://api.cashfree.com/payout' 
      : 'https://sandbox.cashfree.com/payout';
    
    this.clientId = process.env.CASHFREE_PAYOUT_CLIENT_ID_PROD;
    this.secretKey = process.env.CASHFREE_PAYOUT_SECRET_KEY_PROD;
    this.apiVersion = '2024-01-01';
  }

  log(message, data = null) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
  }

  async testCredentials() {
    this.log('🔑 Testing API credentials...');
    
    try {
      const headers = {
        'Content-Type': 'application/json',
        'x-api-version': this.apiVersion,
        'x-client-id': this.clientId,
        'x-client-secret': this.secretKey
      };

      const response = await axios.get(`${this.baseURL}/credentials/verify`, { 
        headers,
        timeout: 10000 
      });

      if (response.status === 200) {
        this.log('✅ Credentials verified successfully!', response.data);
        return true;
      } else {
        this.log('❌ Credentials verification failed', { status: response.status, data: response.data });
        return false;
      }

    } catch (error) {
      this.log('❌ Credentials test failed', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      return false;
    }
  }

  async testIPWhitelisting() {
    this.log('🌐 Testing IP whitelisting...');
    
    try {
      const headers = {
        'Content-Type': 'application/json',
        'x-api-version': this.apiVersion,
        'x-client-id': this.clientId,
        'x-client-secret': this.secretKey
      };

      const response = await axios.get(`${this.baseURL}/account/balance`, { 
        headers,
        timeout: 10000 
      });

      if (response.status === 200) {
        this.log('✅ IP whitelisting verified!', response.data);
        return true;
      } else {
        this.log('❌ IP whitelisting failed', { status: response.status, data: response.data });
        return false;
      }

    } catch (error) {
      if (error.response?.status === 403) {
        this.log('❌ IP not whitelisted. Please add your server IP to Cashfree dashboard.');
      } else {
        this.log('❌ IP whitelisting test failed', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data
        });
      }
      return false;
    }
  }

  async testBeneficiaryCreation() {
    this.log('👤 Testing beneficiary creation...');
    
    try {
      const testData = {
        beneficiary_id: `TEST_BENEFICIARY_${Date.now()}`,
        beneficiary_name: 'Test Beneficiary',
        beneficiary_instrument_details: {
          bank_account_number: '1234567890',
          bank_ifsc: 'SBIN0001234'
        },
        beneficiary_contact_details: {
          beneficiary_email: 'test@example.com',
          beneficiary_phone: '9876543210'
        }
      };

      const headers = {
        'Content-Type': 'application/json',
        'x-api-version': this.apiVersion,
        'x-client-id': this.clientId,
        'x-client-secret': this.secretKey
      };

      const response = await axios.post(`${this.baseURL}/beneficiary`, testData, { 
        headers,
        timeout: 10000 
      });

      if (response.status === 200) {
        this.log('✅ Beneficiary created successfully!', response.data);
        return response.data.beneficiary_id;
      } else {
        this.log('❌ Beneficiary creation failed', { status: response.status, data: response.data });
        return null;
      }

    } catch (error) {
      this.log('❌ Beneficiary creation test failed', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      return null;
    }
  }

  async testTransferCreation(beneficiaryId) {
    this.log('💰 Testing transfer creation...');
    
    try {
      const testData = {
        transfer_id: `TEST_TRANSFER_${Date.now()}`,
        transfer_amount: 1.00,
        transfer_mode: 'banktransfer',
        beneficiary_details: {
          beneficiary_id: beneficiaryId
        },
        transfer_remarks: 'Test transfer for API verification'
      };

      const headers = {
        'Content-Type': 'application/json',
        'x-api-version': this.apiVersion,
        'x-client-id': this.clientId,
        'x-client-secret': this.secretKey
      };

      const response = await axios.post(`${this.baseURL}/transfers`, testData, { 
        headers,
        timeout: 10000 
      });

      if (response.status === 200) {
        this.log('✅ Transfer created successfully!', response.data);
        return response.data.transfer_id;
      } else {
        this.log('❌ Transfer creation failed', { status: response.status, data: response.data });
        return null;
      }

    } catch (error) {
      this.log('❌ Transfer creation test failed', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      return null;
    }
  }

  async runAllTests() {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 CASHFREE PAYOUTS V2 API CONNECTIVITY TEST');
    console.log('='.repeat(60) + '\n');

    this.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    this.log(`Base URL: ${this.baseURL}`);
    this.log(`Client ID: ${this.clientId ? '✅ Set' : '❌ Missing'}`);
    this.log(`Secret Key: ${this.secretKey ? '✅ Set' : '❌ Missing'}`);

    console.log('\n' + '-'.repeat(60));

    const results = {
      credentials: false,
      ipWhitelisting: false,
      beneficiaryCreation: false,
      transferCreation: false
    };

    // Test 1: Credentials
    results.credentials = await this.testCredentials();
    
    if (!results.credentials) {
      this.log('❌ Cannot proceed without valid credentials');
      return;
    }

    // Test 2: IP Whitelisting
    results.ipWhitelisting = await this.testIPWhitelisting();
    
    if (!results.ipWhitelisting) {
      this.log('❌ Cannot proceed without IP whitelisting');
      return;
    }

    // Test 3: Beneficiary Creation
    const beneficiaryId = await this.testBeneficiaryCreation();
    results.beneficiaryCreation = !!beneficiaryId;

    // Test 4: Transfer Creation (only if beneficiary was created)
    if (beneficiaryId) {
      const transferId = await this.testTransferCreation(beneficiaryId);
      results.transferCreation = !!transferId;
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(60));

    Object.entries(results).forEach(([test, passed]) => {
      console.log(`${passed ? '✅' : '❌'} ${test.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
    });

    const allPassed = Object.values(results).every(result => result);
    
    if (allPassed) {
      console.log('\n🎉 ALL TESTS PASSED! Your Cashfree integration is working correctly.');
    } else {
      console.log('\n⚠️ SOME TESTS FAILED! Please check the errors above.');
    }

    console.log('='.repeat(60) + '\n');
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new CashfreeAPITester();
  tester.runAllTests().catch(console.error);
}

module.exports = CashfreeAPITester;