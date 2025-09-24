// backend/test-missing-services.js - Check for Missing Services and Dependencies
const fs = require('fs');
const path = require('path');

class MissingServicesChecker {
  constructor() {
    this.missingServices = [];
    this.missingDependencies = [];
    this.inconsistencies = [];
    this.warnings = [];
  }

  /**
   * Log findings
   */
  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] [MISSING_SERVICES] ${message}`;
    
    console.log(logMessage);
    if (data) {
      console.log('Data:', JSON.stringify(data, null, 2));
    }
  }

  /**
   * Check if file exists
   */
  fileExists(filePath) {
    return fs.existsSync(filePath);
  }

  /**
   * Check service files
   */
  checkServiceFiles() {
    this.log('info', 'Checking service files...');

    const requiredServices = [
      './services/cashfreePayoutService.js',
      './services/batchPayoutService.js',
      './services/payoutCalculationService.js',
      './services/payoutNotificationService.js',
      './services/schedulerService.js'
    ];

    requiredServices.forEach(service => {
      if (!this.fileExists(service)) {
        this.missingServices.push({
          type: 'service',
          file: service,
          description: 'Required service file missing'
        });
        this.log('error', `Missing service file: ${service}`);
      } else {
        this.log('info', `✅ Found service file: ${service}`);
      }
    });
  }

  /**
   * Check model files
   */
  checkModelFiles() {
    this.log('info', 'Checking model files...');

    const requiredModels = [
      './models/CashfreeBeneficiary.js',
      './models/Payout.js',
      './models/PayoutBatch.js'
    ];

    requiredModels.forEach(model => {
      if (!this.fileExists(model)) {
        this.missingServices.push({
          type: 'model',
          file: model,
          description: 'Required model file missing'
        });
        this.log('error', `Missing model file: ${model}`);
      } else {
        this.log('info', `✅ Found model file: ${model}`);
      }
    });
  }

  /**
   * Check configuration files
   */
  checkConfigurationFiles() {
    this.log('info', 'Checking configuration files...');

    const requiredConfigs = [
      './config/cashfree.js'
    ];

    requiredConfigs.forEach(config => {
      if (!this.fileExists(config)) {
        this.missingServices.push({
          type: 'config',
          file: config,
          description: 'Required configuration file missing'
        });
        this.log('error', `Missing config file: ${config}`);
      } else {
        this.log('info', `✅ Found config file: ${config}`);
      }
    });
  }

  /**
   * Check controller files
   */
  checkControllerFiles() {
    this.log('info', 'Checking controller files...');

    const requiredControllers = [
      './controllers/payoutController.js'
    ];

    requiredControllers.forEach(controller => {
      if (!this.fileExists(controller)) {
        this.missingServices.push({
          type: 'controller',
          file: controller,
          description: 'Required controller file missing'
        });
        this.log('error', `Missing controller file: ${controller}`);
      } else {
        this.log('info', `✅ Found controller file: ${controller}`);
      }
    });
  }

  /**
   * Check route files
   */
  checkRouteFiles() {
    this.log('info', 'Checking route files...');

    const requiredRoutes = [
      './routes/payoutRoutes.js'
    ];

    requiredRoutes.forEach(route => {
      if (!this.fileExists(route)) {
        this.missingServices.push({
          type: 'route',
          file: route,
          description: 'Required route file missing'
        });
        this.log('error', `Missing route file: ${route}`);
      } else {
        this.log('info', `✅ Found route file: ${route}`);
      }
    });
  }

  /**
   * Check package.json dependencies
   */
  checkPackageDependencies() {
    this.log('info', 'Checking package.json dependencies...');

    if (!this.fileExists('./package.json')) {
      this.missingServices.push({
        type: 'package',
        file: './package.json',
        description: 'package.json file missing'
      });
      return;
    }

    const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
    const requiredDependencies = [
      'axios',
      'crypto',
      'mongoose',
      'node-cron',
      'express'
    ];

    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

    requiredDependencies.forEach(dep => {
      if (!dependencies[dep]) {
        this.missingDependencies.push({
          type: 'dependency',
          package: dep,
          description: `Required dependency ${dep} not found in package.json`
        });
        this.log('error', `Missing dependency: ${dep}`);
      } else {
        this.log('info', `✅ Found dependency: ${dep}`);
      }
    });
  }

  /**
   * Check service imports and exports
   */
  checkServiceImports() {
    this.log('info', 'Checking service imports and exports...');

    const servicesToCheck = [
      './services/cashfreePayoutService.js',
      './services/batchPayoutService.js',
      './services/payoutCalculationService.js',
      './services/payoutNotificationService.js'
    ];

    servicesToCheck.forEach(servicePath => {
      if (!this.fileExists(servicePath)) return;

      try {
        const content = fs.readFileSync(servicePath, 'utf8');
        
        // Check if service exports properly
        if (!content.includes('module.exports')) {
          this.inconsistencies.push({
            type: 'export',
            file: servicePath,
            issue: 'Service does not export properly',
            description: 'Missing module.exports statement'
          });
          this.log('warn', `Service ${servicePath} may not export properly`);
        }

        // Check for required imports
        const requiredImports = ['mongoose', 'axios'];
        requiredImports.forEach(importName => {
          if (!content.includes(`require('${importName}')`) && !content.includes(`require("${importName}")`)) {
            this.warnings.push({
              type: 'import',
              file: servicePath,
              warning: `Missing import for ${importName}`,
              description: `Service may need to import ${importName}`
            });
            this.log('warn', `Service ${servicePath} may be missing import for ${importName}`);
          }
        });

      } catch (error) {
        this.log('error', `Failed to check service ${servicePath}: ${error.message}`);
      }
    });
  }

  /**
   * Check model schema consistency
   */
  checkModelSchemaConsistency() {
    this.log('info', 'Checking model schema consistency...');

    const modelsToCheck = [
      './models/CashfreeBeneficiary.js',
      './models/Payout.js',
      './models/PayoutBatch.js'
    ];

    modelsToCheck.forEach(modelPath => {
      if (!this.fileExists(modelPath)) return;

      try {
        const content = fs.readFileSync(modelPath, 'utf8');
        
        // Check for required schema elements
        if (!content.includes('mongoose.Schema')) {
          this.inconsistencies.push({
            type: 'schema',
            file: modelPath,
            issue: 'Model does not define mongoose schema',
            description: 'Missing mongoose.Schema definition'
          });
          this.log('warn', `Model ${modelPath} may not define schema properly`);
        }

        if (!content.includes('mongoose.model')) {
          this.inconsistencies.push({
            type: 'model',
            file: modelPath,
            issue: 'Model does not register with mongoose',
            description: 'Missing mongoose.model registration'
          });
          this.log('warn', `Model ${modelPath} may not register with mongoose properly`);
        }

        // Check for required fields based on model type
        if (modelPath.includes('CashfreeBeneficiary')) {
          const requiredFields = ['seller', 'beneficiaryId', 'beneficiaryName', 'bankAccountNumber', 'bankIfsc'];
          requiredFields.forEach(field => {
            if (!content.includes(field)) {
              this.warnings.push({
                type: 'field',
                file: modelPath,
                warning: `Missing required field: ${field}`,
                description: `CashfreeBeneficiary model should have ${field} field`
              });
            }
          });
        }

      } catch (error) {
        this.log('error', `Failed to check model ${modelPath}: ${error.message}`);
      }
    });
  }

  /**
   * Check route registration
   */
  checkRouteRegistration() {
    this.log('info', 'Checking route registration...');

    if (!this.fileExists('./server.js')) {
      this.warnings.push({
        type: 'server',
        file: './server.js',
        warning: 'server.js file not found',
        description: 'Cannot check if routes are registered'
      });
      return;
    }

    try {
      const serverContent = fs.readFileSync('./server.js', 'utf8');
      
      if (!serverContent.includes('payoutRoutes')) {
        this.inconsistencies.push({
          type: 'route_registration',
          file: './server.js',
          issue: 'Payout routes not registered in server',
          description: 'payoutRoutes not found in server.js'
        });
        this.log('warn', 'Payout routes may not be registered in server.js');
      } else {
        this.log('info', '✅ Payout routes are registered in server.js');
      }

      if (!serverContent.includes('/api/payouts')) {
        this.inconsistencies.push({
          type: 'route_mounting',
          file: './server.js',
          issue: 'Payout routes not mounted at /api/payouts',
          description: 'Routes should be mounted at /api/payouts'
        });
        this.log('warn', 'Payout routes may not be mounted at correct path');
      } else {
        this.log('info', '✅ Payout routes are mounted at /api/payouts');
      }

    } catch (error) {
      this.log('error', `Failed to check server.js: ${error.message}`);
    }
  }

  /**
   * Generate missing services report
   */
  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('🔍 MISSING SERVICES AND DEPENDENCIES REPORT');
    console.log('='.repeat(80));

    console.log(`\n❌ MISSING SERVICES: ${this.missingServices.length}`);
    console.log(`📦 MISSING DEPENDENCIES: ${this.missingDependencies.length}`);
    console.log(`🔄 INCONSISTENCIES: ${this.inconsistencies.length}`);
    console.log(`⚠️ WARNINGS: ${this.warnings.length}`);

    if (this.missingServices.length > 0) {
      console.log('\n❌ MISSING SERVICES:');
      this.missingServices.forEach((service, index) => {
        console.log(`  ${index + 1}. [${service.type}] ${service.file}`);
        console.log(`     Description: ${service.description}`);
        console.log('');
      });
    }

    if (this.missingDependencies.length > 0) {
      console.log('\n📦 MISSING DEPENDENCIES:');
      this.missingDependencies.forEach((dep, index) => {
        console.log(`  ${index + 1}. [${dep.type}] ${dep.package}`);
        console.log(`     Description: ${dep.description}`);
        console.log('');
      });
    }

    if (this.inconsistencies.length > 0) {
      console.log('\n🔄 INCONSISTENCIES:');
      this.inconsistencies.forEach((inconsistency, index) => {
        console.log(`  ${index + 1}. [${inconsistency.type}] ${inconsistency.file}`);
        console.log(`     Issue: ${inconsistency.issue}`);
        console.log(`     Description: ${inconsistency.description}`);
        console.log('');
      });
    }

    if (this.warnings.length > 0) {
      console.log('\n⚠️ WARNINGS:');
      this.warnings.forEach((warning, index) => {
        console.log(`  ${index + 1}. [${warning.type}] ${warning.file}`);
        console.log(`     Warning: ${warning.warning}`);
        console.log(`     Description: ${warning.description}`);
        console.log('');
      });
    }

    console.log('='.repeat(80));

    // Save detailed report
    const reportData = {
      timestamp: new Date().toISOString(),
      summary: {
        missingServices: this.missingServices.length,
        missingDependencies: this.missingDependencies.length,
        inconsistencies: this.inconsistencies.length,
        warnings: this.warnings.length
      },
      details: {
        missingServices: this.missingServices,
        missingDependencies: this.missingDependencies,
        inconsistencies: this.inconsistencies,
        warnings: this.warnings
      }
    };

    fs.writeFileSync(
      './missing-services-report.json',
      JSON.stringify(reportData, null, 2)
    );

    this.log('info', 'Detailed missing services report saved to missing-services-report.json');
  }

  /**
   * Run all checks
   */
  runAllChecks() {
    this.log('info', 'Starting missing services and dependencies check...');
    
    console.log('\n' + '='.repeat(80));
    console.log('🔍 MISSING SERVICES AND DEPENDENCIES CHECKER');
    console.log('='.repeat(80) + '\n');

    this.checkServiceFiles();
    this.checkModelFiles();
    this.checkConfigurationFiles();
    this.checkControllerFiles();
    this.checkRouteFiles();
    this.checkPackageDependencies();
    this.checkServiceImports();
    this.checkModelSchemaConsistency();
    this.checkRouteRegistration();

    this.generateReport();
  }
}

// Run checks if this file is executed directly
if (require.main === module) {
  const checker = new MissingServicesChecker();
  checker.runAllChecks();
}

module.exports = MissingServicesChecker;
