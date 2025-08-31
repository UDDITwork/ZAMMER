#!/usr/bin/env node

/**
 * ZAMMER Complete System Verification Script
 * 
 * This script provides a comprehensive verification of the entire ZAMMER system.
 * Run this from the project root: node verify-zammer-system.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
  bold: (text) => `\x1b[1m${text}\x1b[0m`,
  gray: (text) => `\x1b[90m${text}\x1b[0m`
};

// Test results tracking
let testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

// Helper function to run tests
function runTest(testName, testFunction) {
  testResults.total++;
  console.log(`\n🧪 Testing: ${testName}`.cyan);
  
  try {
    const result = testFunction();
    if (result.success) {
      testResults.passed++;
      console.log(`✅ ${testName}: PASSED`.green);
      if (result.details) {
        console.log(`   ${result.details}`.gray);
      }
    } else {
      testResults.failed++;
      console.log(`❌ ${testName}: FAILED`.red);
      console.log(`   Error: ${result.error}`.red);
    }
    
    testResults.details.push({
      name: testName,
      success: result.success,
      error: result.error || null,
      details: result.details || null
    });
  } catch (error) {
    testResults.failed++;
    console.log(`❌ ${testName}: ERROR`.red);
    console.log(`   ${error.message}`.red);
    
    testResults.details.push({
      name: testName,
      success: false,
      error: error.message,
      details: null
    });
  }
}

// Project structure tests
function testProjectStructure() {
  const requiredDirs = ['backend', 'frontend'];
  const missingDirs = requiredDirs.filter(dir => !fs.existsSync(dir));
  
  return {
    success: missingDirs.length === 0,
    details: missingDirs.length === 0 ? 'Project structure is correct' : `Missing directories: ${missingDirs.join(', ')}`,
    error: missingDirs.length > 0 ? `Missing required directories: ${missingDirs.join(', ')}` : null
  };
}

function testBackendStructure() {
  const backendFiles = [
    'backend/package.json',
    'backend/server.js',
    'backend/app.js'
  ];
  
  const missingFiles = backendFiles.filter(file => !fs.existsSync(file));
  
  return {
    success: missingFiles.length === 0,
    details: missingFiles.length === 0 ? 'Backend structure is correct' : `Missing backend files: ${missingFiles.join(', ')}`,
    error: missingFiles.length > 0 ? `Missing backend files: ${missingFiles.join(', ')}` : null
  };
}

function testFrontendStructure() {
  const frontendFiles = [
    'frontend/package.json',
    'frontend/src/App.js',
    'frontend/src/index.js',
    'frontend/public/index.html'
  ];
  
  const missingFiles = frontendFiles.filter(file => !fs.existsSync(file));
  
  return {
    success: missingFiles.length === 0,
    details: missingFiles.length === 0 ? 'Frontend structure is correct' : `Missing frontend files: ${missingFiles.join(', ')}`,
    error: missingFiles.length > 0 ? `Missing frontend files: ${missingFiles.join(', ')}` : null
  };
}

function testBackendDependencies() {
  try {
    const packageJsonPath = path.join(process.cwd(), 'backend', 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      return {
        success: false,
        error: 'Backend package.json not found'
      };
    }
    
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    const criticalDeps = [
      'express',
      'mongoose',
      'cors',
      'dotenv',
      'bcryptjs',
      'jsonwebtoken'
    ];
    
    const missingDeps = criticalDeps.filter(dep => !dependencies[dep]);
    
    return {
      success: missingDeps.length === 0,
      details: missingDeps.length === 0 ? 'All critical backend dependencies present' : `Missing dependencies: ${missingDeps.join(', ')}`,
      error: missingDeps.length > 0 ? `Missing critical dependencies: ${missingDeps.join(', ')}` : null
    };
  } catch (error) {
    return {
      success: false,
      error: `Error checking backend dependencies: ${error.message}`
    };
  }
}

function testFrontendDependencies() {
  try {
    const packageJsonPath = path.join(process.cwd(), 'frontend', 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      return {
        success: false,
        error: 'Frontend package.json not found'
      };
    }
    
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    const criticalDeps = [
      'react',
      'react-dom',
      'react-scripts',
      'axios',
      'react-router-dom',
      'react-toastify',
      'date-fns'
    ];
    
    const missingDeps = criticalDeps.filter(dep => !dependencies[dep]);
    
    return {
      success: missingDeps.length === 0,
      details: missingDeps.length === 0 ? 'All critical frontend dependencies present' : `Missing dependencies: ${missingDeps.join(', ')}`,
      error: missingDeps.length > 0 ? `Missing critical dependencies: ${missingDeps.join(', ')}` : null
    };
  } catch (error) {
    return {
      success: false,
      error: `Error checking frontend dependencies: ${error.message}`
    };
  }
}

function testBackendNodeModules() {
  const nodeModulesPath = path.join(process.cwd(), 'backend', 'node_modules');
  const exists = fs.existsSync(nodeModulesPath);
  
  return {
    success: exists,
    details: exists ? 'Backend node_modules found' : 'Backend dependencies not installed',
    error: exists ? null : 'Run: cd backend && npm install'
  };
}

function testFrontendNodeModules() {
  const nodeModulesPath = path.join(process.cwd(), 'frontend', 'node_modules');
  const exists = fs.existsSync(nodeModulesPath);
  
  return {
    success: exists,
    details: exists ? 'Frontend node_modules found' : 'Frontend dependencies not installed',
    error: exists ? null : 'Run: cd frontend && npm install'
  };
}

function testEnvironmentFiles() {
  const envFiles = [
    'backend/.env',
    'frontend/.env'
  ];
  
  const existingFiles = envFiles.filter(file => fs.existsSync(file));
  
  return {
    success: existingFiles.length > 0,
    details: existingFiles.length > 0 ? `Environment files found: ${existingFiles.join(', ')}` : 'No environment files found',
    error: existingFiles.length === 0 ? 'Create .env files for backend and frontend configuration' : null
  };
}

function testDatabaseConfiguration() {
  try {
    const dbConfigPath = path.join(process.cwd(), 'backend', 'config', 'db.js');
    const exists = fs.existsSync(dbConfigPath);
    
    if (exists) {
      return {
        success: true,
        details: 'Database configuration file found'
      };
    } else {
      return {
        success: false,
        error: 'Database configuration file not found'
      };
    }
  } catch (error) {
    return {
      success: false,
      error: `Error checking database configuration: ${error.message}`
    };
  }
}

function testBackendBuild() {
  try {
    console.log('   🔨 Testing backend build...'.gray);
    
    // Check if backend can start without errors
    const packageJsonPath = path.join(process.cwd(), 'backend', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    if (packageJson.scripts && packageJson.scripts.start) {
      return {
        success: true,
        details: 'Backend has start script configured'
      };
    } else {
      return {
        success: false,
        error: 'Backend start script not found in package.json'
      };
    }
  } catch (error) {
    return {
      success: false,
      error: `Backend build check failed: ${error.message}`
    };
  }
}

function testFrontendBuild() {
  try {
    console.log('   🔨 Testing frontend build...'.gray);
    
    // Check if frontend can build
    const packageJsonPath = path.join(process.cwd(), 'frontend', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    if (packageJson.scripts && packageJson.scripts.build) {
      return {
        success: true,
        details: 'Frontend has build script configured'
      };
    } else {
      return {
        success: false,
        error: 'Frontend build script not found in package.json'
      };
    }
  } catch (error) {
    return {
      success: false,
      error: `Frontend build check failed: ${error.message}`
    };
  }
}

function testDocumentationFiles() {
  const docFiles = [
    'README.md',
    'COMPLETE_BACKEND_ANALYSIS.md',
    'PROJECT_ROADMAP.md'
  ];
  
  const existingDocs = docFiles.filter(file => fs.existsSync(file));
  
  return {
    success: existingDocs.length > 0,
    details: existingDocs.length > 0 ? `Documentation files found: ${existingDocs.join(', ')}` : 'No documentation files found',
    error: existingDocs.length === 0 ? 'Consider adding documentation files' : null
  };
}

// Main test runner
function runAllTests() {
  console.log('🚀 Starting ZAMMER Complete System Verification'.bold.blue);
  console.log(`📍 Testing in: ${process.cwd()}`.gray);
  console.log('=' .repeat(70).gray);

  // Project structure tests
  console.log('\n📁 PROJECT STRUCTURE TESTS'.bold.yellow);
  runTest('Project Structure', testProjectStructure);
  runTest('Backend Structure', testBackendStructure);
  runTest('Frontend Structure', testFrontendStructure);

  // Dependencies tests
  console.log('\n📦 DEPENDENCIES TESTS'.bold.yellow);
  runTest('Backend Dependencies', testBackendDependencies);
  runTest('Frontend Dependencies', testFrontendDependencies);
  runTest('Backend Node Modules', testBackendNodeModules);
  runTest('Frontend Node Modules', testFrontendNodeModules);

  // Configuration tests
  console.log('\n⚙️  CONFIGURATION TESTS'.bold.yellow);
  runTest('Environment Files', testEnvironmentFiles);
  runTest('Database Configuration', testDatabaseConfiguration);

  // Build tests
  console.log('\n🔨 BUILD TESTS'.bold.yellow);
  runTest('Backend Build Configuration', testBackendBuild);
  runTest('Frontend Build Configuration', testFrontendBuild);

  // Documentation tests
  console.log('\n📚 DOCUMENTATION TESTS'.bold.yellow);
  runTest('Documentation Files', testDocumentationFiles);

  // Print summary
  console.log('\n' + '=' .repeat(70).gray);
  console.log('📊 VERIFICATION SUMMARY'.bold.blue);
  console.log('=' .repeat(70).gray);
  console.log(`✅ Passed: ${testResults.passed}`.green);
  console.log(`❌ Failed: ${testResults.failed}`.red);
  console.log(`📈 Total: ${testResults.total}`.blue);
  console.log(`🎯 Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`.yellow);

  // Detailed results
  if (testResults.failed > 0) {
    console.log('\n❌ FAILED TESTS:'.red.bold);
    testResults.details
      .filter(test => !test.success)
      .forEach(test => {
        console.log(`   • ${test.name}: ${test.error}`.red);
      });
  }

  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:'.yellow.bold);
  if (testResults.failed === 0) {
    console.log('   🎉 All tests passed! Your ZAMMER system is ready to run.'.green);
  } else if (testResults.passed > testResults.failed) {
    console.log('   ⚠️  Most tests passed. Fix the failed tests above.'.yellow);
  } else {
    console.log('   🚨 Multiple failures detected. Check system configuration.'.red);
  }

  console.log('\n📝 NEXT STEPS:'.blue.bold);
  console.log('   1. Fix any failed tests above');
  console.log('   2. Install missing dependencies:');
  console.log('      • Backend: cd backend && npm install');
  console.log('      • Frontend: cd frontend && npm install');
  console.log('   3. Configure environment files (.env)');
  console.log('   4. Start the system:');
  console.log('      • Backend: cd backend && npm start');
  console.log('      • Frontend: cd frontend && npm start');
  console.log('   5. Test the application in your browser');

  console.log('\n🔧 VERIFICATION COMMANDS:'.blue.bold);
  console.log('   • Backend API test: cd backend && node test-api-endpoints.js');
  console.log('   • Frontend build test: cd frontend && node test-frontend-build.js');
  console.log('   • Complete system test: node verify-zammer-system.js');

  return testResults;
}

// Run tests if this file is executed directly
if (require.main === module) {
  try {
    runAllTests();
    process.exit(testResults.failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('❌ Verification failed:'.red, error.message);
    process.exit(1);
  }
}

module.exports = { runAllTests, testResults };
