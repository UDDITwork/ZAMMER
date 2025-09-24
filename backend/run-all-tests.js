// backend/run-all-tests.js - Comprehensive Test Runner for Cashfree Payouts V2
const CashfreeIntegrationTester = require('./test-cashfree-integration');
const VariableMismatchDetector = require('./test-variable-mismatches');
const APIEndpointTester = require('./test-api-endpoints');
const fs = require('fs');
const path = require('path');

class ComprehensiveTestRunner {
  constructor() {
    this.testSuites = [
      { name: 'Cashfree Integration', runner: CashfreeIntegrationTester },
      { name: 'Variable Mismatches', runner: VariableMismatchDetector },
      { name: 'API Endpoints', runner: APIEndpointTester }
    ];
    this.results = {
      totalPassed: 0,
      totalFailed: 0,
      totalWarnings: 0,
      totalMismatches: 0,
      totalInconsistencies: 0,
      suiteResults: []
    };
  }

  /**
   * Log test results
   */
  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] [TEST_RUNNER] ${message}`;
    
    console.log(logMessage);
    if (data) {
      console.log('Data:', JSON.stringify(data, null, 2));
    }
  }

  /**
   * Run individual test suite
   */
  async runTestSuite(suite) {
    this.log('info', `Running ${suite.name} test suite...`);
    
    try {
      const startTime = Date.now();
      
      if (suite.name === 'Cashfree Integration') {
        const tester = new suite.runner();
        await tester.runAllTests();
        
        this.results.suiteResults.push({
          name: suite.name,
          status: 'completed',
          duration: Date.now() - startTime,
          results: tester.testResults
        });
        
        this.results.totalPassed += tester.testResults.passed;
        this.results.totalFailed += tester.testResults.failed;
        this.results.totalWarnings += tester.testResults.warnings.length;
        this.results.totalMismatches += tester.testResults.mismatches.length;
        this.results.totalInconsistencies += tester.testResults.inconsistencies.length;
        
      } else if (suite.name === 'Variable Mismatches') {
        const detector = new suite.runner();
        detector.runScan();
        
        this.results.suiteResults.push({
          name: suite.name,
          status: 'completed',
          duration: Date.now() - startTime,
          results: {
            mismatches: detector.mismatches.length,
            inconsistencies: detector.inconsistencies.length,
            warnings: detector.warnings.length
          }
        });
        
        this.results.totalMismatches += detector.mismatches.length;
        this.results.totalInconsistencies += detector.inconsistencies.length;
        this.results.totalWarnings += detector.warnings.length;
        
      } else if (suite.name === 'API Endpoints') {
        const tester = new suite.runner();
        await tester.runAllTests();
        
        this.results.suiteResults.push({
          name: suite.name,
          status: 'completed',
          duration: Date.now() - startTime,
          results: tester.testResults
        });
        
        this.results.totalPassed += tester.testResults.passed;
        this.results.totalFailed += tester.testResults.failed;
        this.results.totalWarnings += tester.testResults.warnings.length;
      }
      
      this.log('info', `${suite.name} test suite completed in ${Date.now() - startTime}ms`);
      
    } catch (error) {
      this.log('error', `Failed to run ${suite.name} test suite: ${error.message}`);
      
      this.results.suiteResults.push({
        name: suite.name,
        status: 'failed',
        duration: 0,
        error: error.message
      });
    }
  }

  /**
   * Check environment setup
   */
  checkEnvironmentSetup() {
    this.log('info', 'Checking environment setup...');
    
    const requiredFiles = [
      './config/cashfree.js',
      './models/CashfreeBeneficiary.js',
      './models/Payout.js',
      './models/PayoutBatch.js',
      './services/cashfreePayoutService.js',
      './services/batchPayoutService.js',
      './services/payoutCalculationService.js',
      './services/payoutNotificationService.js',
      './controllers/payoutController.js',
      './routes/payoutRoutes.js'
    ];
    
    let missingFiles = [];
    requiredFiles.forEach(file => {
      if (!fs.existsSync(file)) {
        missingFiles.push(file);
      }
    });
    
    if (missingFiles.length > 0) {
      this.log('error', `Missing required files: ${missingFiles.join(', ')}`);
      return false;
    }
    
    this.log('info', 'All required files are present');
    return true;
  }

  /**
   * Check database connection
   */
  async checkDatabaseConnection() {
    this.log('info', 'Checking database connection...');
    
    try {
      const mongoose = require('mongoose');
      
      if (mongoose.connection.readyState === 1) {
        this.log('info', 'Database is connected');
        return true;
      } else {
        this.log('warn', 'Database is not connected. Some tests may fail.');
        return false;
      }
    } catch (error) {
      this.log('error', `Database connection check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Generate comprehensive report
   */
  generateComprehensiveReport() {
    console.log('\n' + '='.repeat(100));
    console.log('🎯 COMPREHENSIVE TEST RESULTS SUMMARY');
    console.log('='.repeat(100));

    console.log(`\n📊 OVERALL STATISTICS:`);
    console.log(`   ✅ Total Passed: ${this.results.totalPassed}`);
    console.log(`   ❌ Total Failed: ${this.results.totalFailed}`);
    console.log(`   ⚠️ Total Warnings: ${this.results.totalWarnings}`);
    console.log(`   🔍 Total Mismatches: ${this.results.totalMismatches}`);
    console.log(`   🔄 Total Inconsistencies: ${this.results.totalInconsistencies}`);

    console.log(`\n📋 TEST SUITE RESULTS:`);
    this.results.suiteResults.forEach((suite, index) => {
      console.log(`   ${index + 1}. ${suite.name}:`);
      console.log(`      Status: ${suite.status}`);
      console.log(`      Duration: ${suite.duration}ms`);
      
      if (suite.status === 'failed') {
        console.log(`      Error: ${suite.error}`);
      } else if (suite.results) {
        if (suite.results.passed !== undefined) {
          console.log(`      Passed: ${suite.results.passed}`);
          console.log(`      Failed: ${suite.results.failed}`);
        }
        if (suite.results.mismatches !== undefined) {
          console.log(`      Mismatches: ${suite.results.mismatches}`);
        }
        if (suite.results.inconsistencies !== undefined) {
          console.log(`      Inconsistencies: ${suite.results.inconsistencies}`);
        }
        if (suite.results.warnings !== undefined) {
          console.log(`      Warnings: ${suite.results.warnings}`);
        }
      }
      console.log('');
    });

    // Generate recommendations
    this.generateRecommendations();

    console.log('='.repeat(100));
    
    if (this.results.totalFailed === 0 && this.results.totalMismatches === 0 && this.results.totalInconsistencies === 0) {
      console.log('🎉 ALL TESTS PASSED! The Cashfree Payouts V2 integration is ready for production.');
    } else {
      console.log('⚠️ SOME ISSUES FOUND! Please review and fix the issues before deploying to production.');
    }
    
    console.log('='.repeat(100) + '\n');

    // Save comprehensive report
    const reportData = {
      timestamp: new Date().toISOString(),
      summary: this.results,
      recommendations: this.generateRecommendationsData()
    };

    fs.writeFileSync(
      './comprehensive-test-report.json',
      JSON.stringify(reportData, null, 2)
    );

    this.log('info', 'Comprehensive test report saved to comprehensive-test-report.json');
  }

  /**
   * Generate recommendations
   */
  generateRecommendations() {
    console.log(`\n💡 RECOMMENDATIONS:`);
    
    if (this.results.totalFailed > 0) {
      console.log(`   🔧 Fix ${this.results.totalFailed} failed tests before deployment`);
    }
    
    if (this.results.totalMismatches > 0) {
      console.log(`   🔍 Address ${this.results.totalMismatches} variable name mismatches`);
    }
    
    if (this.results.totalInconsistencies > 0) {
      console.log(`   🔄 Resolve ${this.results.totalInconsistencies} inconsistencies in the codebase`);
    }
    
    if (this.results.totalWarnings > 0) {
      console.log(`   ⚠️ Review ${this.results.totalWarnings} warnings for potential improvements`);
    }
    
    if (this.results.totalFailed === 0 && this.results.totalMismatches === 0 && this.results.totalInconsistencies === 0) {
      console.log(`   ✅ All tests passed! Consider running performance tests before production deployment`);
      console.log(`   ✅ Ensure all environment variables are properly configured`);
      console.log(`   ✅ Verify webhook endpoints are accessible from Cashfree`);
      console.log(`   ✅ Test the complete payout flow with test data`);
    }
  }

  /**
   * Generate recommendations data
   */
  generateRecommendationsData() {
    const recommendations = [];
    
    if (this.results.totalFailed > 0) {
      recommendations.push({
        type: 'critical',
        message: `Fix ${this.results.totalFailed} failed tests before deployment`,
        action: 'Review test failures and fix underlying issues'
      });
    }
    
    if (this.results.totalMismatches > 0) {
      recommendations.push({
        type: 'high',
        message: `Address ${this.results.totalMismatches} variable name mismatches`,
        action: 'Standardize variable naming conventions across the codebase'
      });
    }
    
    if (this.results.totalInconsistencies > 0) {
      recommendations.push({
        type: 'high',
        message: `Resolve ${this.results.totalInconsistencies} inconsistencies`,
        action: 'Review and standardize code patterns and configurations'
      });
    }
    
    if (this.results.totalWarnings > 0) {
      recommendations.push({
        type: 'medium',
        message: `Review ${this.results.totalWarnings} warnings`,
        action: 'Address warnings for better code quality'
      });
    }
    
    if (this.results.totalFailed === 0 && this.results.totalMismatches === 0 && this.results.totalInconsistencies === 0) {
      recommendations.push({
        type: 'info',
        message: 'All tests passed! Ready for production deployment',
        action: 'Proceed with production deployment after final verification'
      });
    }
    
    return recommendations;
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    this.log('info', 'Starting comprehensive test suite for Cashfree Payouts V2...');
    
    console.log('\n' + '='.repeat(100));
    console.log('🚀 CASHFREE PAYOUTS V2 - COMPREHENSIVE TEST SUITE');
    console.log('='.repeat(100) + '\n');

    // Check environment setup
    if (!this.checkEnvironmentSetup()) {
      this.log('error', 'Environment setup check failed. Please fix the issues and try again.');
      return;
    }

    // Check database connection
    await this.checkDatabaseConnection();

    // Run all test suites
    for (const suite of this.testSuites) {
      await this.runTestSuite(suite);
    }

    // Generate comprehensive report
    this.generateComprehensiveReport();
  }
}

// Run all tests if this file is executed directly
if (require.main === module) {
  const runner = new ComprehensiveTestRunner();
  runner.runAllTests().catch(console.error);
}

module.exports = ComprehensiveTestRunner;
