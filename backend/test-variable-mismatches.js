// backend/test-variable-mismatches.js - Variable Name Mismatch and Inconsistency Detection
const fs = require('fs');
const path = require('path');

class VariableMismatchDetector {
  constructor() {
    this.mismatches = [];
    this.inconsistencies = [];
    this.warnings = [];
    this.filePatterns = {
      config: /config\/.*\.js$/,
      models: /models\/.*\.js$/,
      services: /services\/.*\.js$/,
      controllers: /controllers\/.*\.js$/,
      routes: /routes\/.*\.js$/
    };
  }

  /**
   * Log findings
   */
  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] [MISMATCH_DETECTOR] ${message}`;
    
    console.log(logMessage);
    if (data) {
      console.log('Data:', JSON.stringify(data, null, 2));
    }
  }

  /**
   * Record mismatch
   */
  recordMismatch(type, file, line, expected, actual, context = '') {
    this.mismatches.push({
      type,
      file,
      line,
      expected,
      actual,
      context,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Record inconsistency
   */
  recordInconsistency(type, file, line, issue, context = '') {
    this.inconsistencies.push({
      type,
      file,
      line,
      issue,
      context,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Record warning
   */
  recordWarning(type, file, line, warning, context = '') {
    this.warnings.push({
      type,
      file,
      line,
      warning,
      context,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Scan file for variable mismatches
   */
  scanFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      this.log('info', `Scanning file: ${filePath}`);

      // Check for common variable name patterns
      this.checkVariableNamingPatterns(filePath, lines);
      
      // Check for import/export mismatches
      this.checkImportExportMismatches(filePath, lines);
      
      // Check for configuration mismatches
      this.checkConfigurationMismatches(filePath, lines);
      
      // Check for model field mismatches
      this.checkModelFieldMismatches(filePath, lines);
      
      // Check for API endpoint mismatches
      this.checkAPIEndpointMismatches(filePath, lines);
      
      // Check for service method mismatches
      this.checkServiceMethodMismatches(filePath, lines);

    } catch (error) {
      this.log('error', `Failed to scan file ${filePath}: ${error.message}`);
    }
  }

  /**
   * Check variable naming patterns
   */
  checkVariableNamingPatterns(filePath, lines) {
    const variablePatterns = [
      // Check for camelCase variables
      { pattern: /const\s+([A-Z][a-zA-Z0-9]*)\s*=/g, expected: 'camelCase', type: 'variable_naming' },
      { pattern: /let\s+([A-Z][a-zA-Z0-9]*)\s*=/g, expected: 'camelCase', type: 'variable_naming' },
      { pattern: /var\s+([A-Z][a-zA-Z0-9]*)\s*=/g, expected: 'camelCase', type: 'variable_naming' },
      
      // Check for function naming
      { pattern: /function\s+([a-z][a-zA-Z0-9]*)\s*\(/g, expected: 'camelCase', type: 'function_naming' },
      { pattern: /const\s+([a-z][a-zA-Z0-9]*)\s*=\s*\(/g, expected: 'camelCase', type: 'function_naming' },
      
      // Check for constant naming
      { pattern: /const\s+([A-Z_][A-Z0-9_]*)\s*=/g, expected: 'UPPER_SNAKE_CASE', type: 'constant_naming' }
    ];

    lines.forEach((line, index) => {
      variablePatterns.forEach(({ pattern, expected, type }) => {
        let match;
        while ((match = pattern.exec(line)) !== null) {
          const variableName = match[1];
          const lineNumber = index + 1;
          
          if (type === 'variable_naming' && /^[A-Z]/.test(variableName)) {
            this.recordMismatch(
              type,
              filePath,
              lineNumber,
              expected,
              variableName,
              `Variable should be camelCase: ${line.trim()}`
            );
          }
          
          if (type === 'constant_naming' && !/^[A-Z_][A-Z0-9_]*$/.test(variableName)) {
            this.recordMismatch(
              type,
              filePath,
              lineNumber,
              expected,
              variableName,
              `Constant should be UPPER_SNAKE_CASE: ${line.trim()}`
            );
          }
        }
      });
    });
  }

  /**
   * Check import/export mismatches
   */
  checkImportExportMismatches(filePath, lines) {
    const importPatterns = [
      { pattern: /require\(['"]([^'"]+)['"]\)/g, type: 'require' },
      { pattern: /import\s+.*\s+from\s+['"]([^'"]+)['"]/g, type: 'import' }
    ];

    const exportPatterns = [
      { pattern: /module\.exports\s*=\s*([a-zA-Z0-9_]+)/g, type: 'module_export' },
      { pattern: /exports\.([a-zA-Z0-9_]+)\s*=/g, type: 'named_export' }
    ];

    lines.forEach((line, index) => {
      // Check for missing file extensions in requires
      importPatterns.forEach(({ pattern, type }) => {
        let match;
        while ((match = pattern.exec(line)) !== null) {
          const importPath = match[1];
          const lineNumber = index + 1;
          
          // Check if it's a relative import without extension
          if (importPath.startsWith('./') && !path.extname(importPath)) {
            this.recordWarning(
              'missing_extension',
              filePath,
              lineNumber,
              `Import path missing .js extension: ${importPath}`,
              line.trim()
            );
          }
        }
      });
    });
  }

  /**
   * Check configuration mismatches
   */
  checkConfigurationMismatches(filePath, lines) {
    if (!filePath.includes('config/')) return;

    const expectedConfigKeys = [
      'baseUrl', 'clientId', 'secretKey', 'apiVersion', 'webhookSecret', 'publicKey', 'environment'
    ];

    lines.forEach((line, index) => {
      // Check for hardcoded configuration values
      if (line.includes('baseUrl:') && line.includes('http')) {
        this.recordWarning(
          'hardcoded_config',
          filePath,
          index + 1,
          'Hardcoded baseUrl found, should use environment variable',
          line.trim()
        );
      }

      // Check for missing configuration keys
      expectedConfigKeys.forEach(key => {
        if (line.includes(key + ':') && !line.includes('process.env')) {
          this.recordWarning(
            'config_value_source',
            filePath,
            index + 1,
            `Configuration key ${key} should use process.env`,
            line.trim()
          );
        }
      });
    });
  }

  /**
   * Check model field mismatches
   */
  checkModelFieldMismatches(filePath, lines) {
    if (!filePath.includes('models/')) return;

    const expectedFieldPatterns = {
      'beneficiaryId': /beneficiaryId|beneficiary_id/,
      'bankAccountNumber': /bankAccountNumber|bank_account_number/,
      'bankIfsc': /bankIfsc|bank_ifsc/,
      'beneficiaryEmail': /beneficiaryEmail|beneficiary_email/,
      'beneficiaryPhone': /beneficiaryPhone|beneficiary_phone/,
      'beneficiaryAddress': /beneficiaryAddress|beneficiary_address/,
      'beneficiaryCity': /beneficiaryCity|beneficiary_city/,
      'beneficiaryState': /beneficiaryState|beneficiary_state/,
      'beneficiaryPostalCode': /beneficiaryPostalCode|beneficiary_postal_code/,
      'verificationStatus': /verificationStatus|verification_status/,
      'verificationAttempts': /verificationAttempts|verification_attempts/,
      'lastVerificationAttempt': /lastVerificationAttempt|last_verification_attempt/,
      'verificationNotes': /verificationNotes|verification_notes/,
      'cashfreeResponse': /cashfreeResponse|cashfree_response/,
      'addedOn': /addedOn|added_on/,
      'updatedOn': /updatedOn|updated_on/,
      'isActive': /isActive|is_active/,
      'deletedAt': /deletedAt|deleted_at/
    };

    lines.forEach((line, index) => {
      Object.entries(expectedFieldPatterns).forEach(([fieldName, pattern]) => {
        if (pattern.test(line) && line.includes(':')) {
          // Check if the field name is consistent
          const snakeCaseMatch = line.match(/([a-z_]+):/);
          const camelCaseMatch = line.match(/([a-zA-Z][a-zA-Z0-9]*):/);
          
          if (snakeCaseMatch && !fieldName.includes('_')) {
            this.recordMismatch(
              'field_naming',
              filePath,
              index + 1,
              'camelCase',
              snakeCaseMatch[1],
              `Field should be camelCase: ${line.trim()}`
            );
          }
        }
      });
    });
  }

  /**
   * Check API endpoint mismatches
   */
  checkAPIEndpointMismatches(filePath, lines) {
    if (!filePath.includes('controllers/') && !filePath.includes('routes/')) return;

    const expectedEndpointPatterns = [
      { pattern: /\/api\/payouts\/beneficiary/g, expected: 'POST,GET,PUT' },
      { pattern: /\/api\/payouts\/history/g, expected: 'GET' },
      { pattern: /\/api\/payouts\/stats/g, expected: 'GET' },
      { pattern: /\/api\/payouts\/admin\/beneficiaries/g, expected: 'GET' },
      { pattern: /\/api\/payouts\/admin\/payouts/g, expected: 'GET' },
      { pattern: /\/api\/payouts\/admin\/analytics/g, expected: 'GET' },
      { pattern: /\/api\/payouts\/admin\/process-batch/g, expected: 'POST' },
      { pattern: /\/api\/payouts\/admin\/process-single/g, expected: 'POST' },
      { pattern: /\/api\/payouts\/webhook/g, expected: 'POST' },
      { pattern: /\/api\/payouts\/health/g, expected: 'GET' }
    ];

    lines.forEach((line, index) => {
      expectedEndpointPatterns.forEach(({ pattern, expected }) => {
        if (pattern.test(line)) {
          // Check if the HTTP method is properly defined
          const methodMatch = line.match(/(\.get|\.post|\.put|\.delete|\.patch)\s*\(/);
          if (methodMatch) {
            const method = methodMatch[1].substring(1).toUpperCase();
            if (!expected.includes(method)) {
              this.recordMismatch(
                'http_method',
                filePath,
                index + 1,
                expected,
                method,
                `HTTP method mismatch for endpoint: ${line.trim()}`
              );
            }
          }
        }
      });
    });
  }

  /**
   * Check service method mismatches
   */
  checkServiceMethodMismatches(filePath, lines) {
    if (!filePath.includes('services/')) return;

    const expectedServiceMethods = [
      'createBeneficiary',
      'getBeneficiary',
      'removeBeneficiary',
      'createStandardTransfer',
      'createBatchTransfer',
      'getTransferStatus',
      'getBatchTransferStatus',
      'processPayout',
      'processBatchPayouts',
      'updatePayoutStatus',
      'healthCheck'
    ];

    lines.forEach((line, index) => {
      expectedServiceMethods.forEach(method => {
        if (line.includes(method) && line.includes('async')) {
          // Check if method is properly defined
          const methodPattern = new RegExp(`async\\s+${method}\\s*\\(`);
          if (!methodPattern.test(line)) {
            this.recordMismatch(
              'method_definition',
              filePath,
              index + 1,
              `async ${method}(`,
              line.trim(),
              `Service method definition mismatch: ${line.trim()}`
            );
          }
        }
      });
    });
  }

  /**
   * Scan all files in directory
   */
  scanDirectory(dirPath) {
    try {
      const files = fs.readdirSync(dirPath, { withFileTypes: true });
      
      files.forEach(file => {
        const fullPath = path.join(dirPath, file.name);
        
        if (file.isDirectory()) {
          this.scanDirectory(fullPath);
        } else if (file.isFile() && file.name.endsWith('.js')) {
          this.scanFile(fullPath);
        }
      });
    } catch (error) {
      this.log('error', `Failed to scan directory ${dirPath}: ${error.message}`);
    }
  }

  /**
   * Generate mismatch report
   */
  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('🔍 VARIABLE MISMATCH AND INCONSISTENCY REPORT');
    console.log('='.repeat(80));

    console.log(`\n🔍 MISMATCHES FOUND: ${this.mismatches.length}`);
    console.log(`🔄 INCONSISTENCIES FOUND: ${this.inconsistencies.length}`);
    console.log(`⚠️ WARNINGS: ${this.warnings.length}`);

    if (this.mismatches.length > 0) {
      console.log('\n🔍 MISMATCHES:');
      this.mismatches.forEach((mismatch, index) => {
        console.log(`  ${index + 1}. [${mismatch.type}] ${mismatch.file}:${mismatch.line}`);
        console.log(`     Expected: ${mismatch.expected}`);
        console.log(`     Actual: ${mismatch.actual}`);
        console.log(`     Context: ${mismatch.context}`);
        console.log('');
      });
    }

    if (this.inconsistencies.length > 0) {
      console.log('\n🔄 INCONSISTENCIES:');
      this.inconsistencies.forEach((inconsistency, index) => {
        console.log(`  ${index + 1}. [${inconsistency.type}] ${inconsistency.file}:${inconsistency.line}`);
        console.log(`     Issue: ${inconsistency.issue}`);
        console.log(`     Context: ${inconsistency.context}`);
        console.log('');
      });
    }

    if (this.warnings.length > 0) {
      console.log('\n⚠️ WARNINGS:');
      this.warnings.forEach((warning, index) => {
        console.log(`  ${index + 1}. [${warning.type}] ${warning.file}:${warning.line}`);
        console.log(`     Warning: ${warning.warning}`);
        console.log(`     Context: ${warning.context}`);
        console.log('');
      });
    }

    console.log('='.repeat(80));

    // Save detailed report
    const reportData = {
      timestamp: new Date().toISOString(),
      summary: {
        mismatches: this.mismatches.length,
        inconsistencies: this.inconsistencies.length,
        warnings: this.warnings.length
      },
      details: {
        mismatches: this.mismatches,
        inconsistencies: this.inconsistencies,
        warnings: this.warnings
      }
    };

    fs.writeFileSync(
      './variable-mismatch-report.json',
      JSON.stringify(reportData, null, 2)
    );

    this.log('info', 'Detailed mismatch report saved to variable-mismatch-report.json');
  }

  /**
   * Run complete scan
   */
  runScan() {
    this.log('info', 'Starting variable mismatch and inconsistency detection...');
    
    // Scan specific directories
    const directoriesToScan = [
      './config',
      './models',
      './services',
      './controllers',
      './routes'
    ];

    directoriesToScan.forEach(dir => {
      if (fs.existsSync(dir)) {
        this.scanDirectory(dir);
      } else {
        this.log('warn', `Directory not found: ${dir}`);
      }
    });

    this.generateReport();
  }
}

// Run scan if this file is executed directly
if (require.main === module) {
  const detector = new VariableMismatchDetector();
  detector.runScan();
}

module.exports = VariableMismatchDetector;
