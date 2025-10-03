#!/usr/bin/env node

/**
 * 📧 Delivery Agent Email Extractor Script
 * 
 * This script extracts all delivery agent emails from the MongoDB database
 * and exports them in various formats (CSV, JSON, TXT)
 * 
 * Usage:
 * node extract-delivery-agent-emails.js [options]
 * 
 * Options:
 * --format=csv|json|txt|all (default: all)
 * --output=filename (default: delivery-agent-emails)
 * --active-only (only active agents)
 * --verified-only (only verified agents)
 * --include-details (include name, phone, status)
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Import the DeliveryAgent model
const DeliveryAgent = require('./models/DeliveryAgent');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  format: 'all',
  output: 'delivery-agent-emails',
  activeOnly: false,
  verifiedOnly: false,
  includeDetails: false
};

// Parse arguments
args.forEach(arg => {
  if (arg.startsWith('--format=')) {
    options.format = arg.split('=')[1];
  } else if (arg.startsWith('--output=')) {
    options.output = arg.split('=')[1];
  } else if (arg === '--active-only') {
    options.activeOnly = true;
  } else if (arg === '--verified-only') {
    options.verifiedOnly = true;
  } else if (arg === '--include-details') {
    options.includeDetails = true;
  }
});

// Validate format
const validFormats = ['csv', 'json', 'txt', 'all'];
if (!validFormats.includes(options.format)) {
  console.error('❌ Invalid format. Use: csv, json, txt, or all');
  process.exit(1);
}

/**
 * Connect to MongoDB
 */
async function connectDB() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    
    const mongoURI = process.env.MONGO_URI;
    if (!mongoURI) {
      throw new Error('MONGO_URI environment variable is not defined');
    }

    await mongoose.connect(mongoURI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log('✅ Connected to MongoDB successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
}

/**
 * Extract delivery agent emails from database
 */
async function extractDeliveryAgentEmails() {
  try {
    console.log('📊 Extracting delivery agent emails...');

    // Build query based on options
    const query = {};
    
    if (options.activeOnly) {
      query.isActive = true;
    }
    
    if (options.verifiedOnly) {
      query.isVerified = true;
    }

    // Select fields based on include-details option
    const selectFields = options.includeDetails 
      ? 'email name mobileNumber status isActive isVerified createdAt'
      : 'email';

    // Execute query
    const agents = await DeliveryAgent.find(query)
      .select(selectFields)
      .sort({ createdAt: -1 })
      .lean();

    console.log(`📧 Found ${agents.length} delivery agents`);

    if (agents.length === 0) {
      console.log('⚠️ No delivery agents found matching the criteria');
      return [];
    }

    // Display summary
    const activeCount = agents.filter(agent => agent.isActive).length;
    const verifiedCount = agents.filter(agent => agent.isVerified).length;
    
    console.log(`📈 Summary:`);
    console.log(`   Total agents: ${agents.length}`);
    console.log(`   Active agents: ${activeCount}`);
    console.log(`   Verified agents: ${verifiedCount}`);

    return agents;

  } catch (error) {
    console.error('❌ Error extracting delivery agent emails:', error.message);
    throw error;
  }
}

/**
 * Generate CSV format
 */
function generateCSV(agents) {
  const headers = options.includeDetails 
    ? ['Email', 'Name', 'Mobile Number', 'Status', 'Active', 'Verified', 'Created At']
    : ['Email'];

  const csvContent = [
    headers.join(','),
    ...agents.map(agent => {
      if (options.includeDetails) {
        return [
          `"${agent.email || ''}"`,
          `"${agent.name || ''}"`,
          `"${agent.mobileNumber || ''}"`,
          `"${agent.status || ''}"`,
          agent.isActive ? 'Yes' : 'No',
          agent.isVerified ? 'Yes' : 'No',
          `"${agent.createdAt ? new Date(agent.createdAt).toISOString() : ''}"`
        ].join(',');
      } else {
        return `"${agent.email || ''}"`;
      }
    })
  ].join('\n');

  return csvContent;
}

/**
 * Generate JSON format
 */
function generateJSON(agents) {
  return JSON.stringify(agents, null, 2);
}

/**
 * Generate TXT format (simple email list)
 */
function generateTXT(agents) {
  return agents.map(agent => agent.email).filter(email => email).join('\n');
}

/**
 * Save data to file
 */
function saveToFile(content, format, filename) {
  const filePath = path.join(__dirname, `${filename}.${format}`);
  
  try {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ ${format.toUpperCase()} file saved: ${filePath}`);
    return filePath;
  } catch (error) {
    console.error(`❌ Error saving ${format.toUpperCase()} file:`, error.message);
    throw error;
  }
}

/**
 * Main execution function
 */
async function main() {
  try {
    console.log('🚀 Starting Delivery Agent Email Extraction...');
    console.log('📋 Options:', options);

    // Connect to database
    await connectDB();

    // Extract emails
    const agents = await extractDeliveryAgentEmails();

    if (agents.length === 0) {
      console.log('⚠️ No data to export');
      return;
    }

    // Generate and save files based on format
    const savedFiles = [];

    if (options.format === 'all' || options.format === 'csv') {
      const csvContent = generateCSV(agents);
      const csvFile = saveToFile(csvContent, 'csv', options.output);
      savedFiles.push(csvFile);
    }

    if (options.format === 'all' || options.format === 'json') {
      const jsonContent = generateJSON(agents);
      const jsonFile = saveToFile(jsonContent, 'json', options.output);
      savedFiles.push(jsonFile);
    }

    if (options.format === 'all' || options.format === 'txt') {
      const txtContent = generateTXT(agents);
      const txtFile = saveToFile(txtContent, 'txt', options.output);
      savedFiles.push(txtFile);
    }

    // Display results
    console.log('\n🎉 Email extraction completed successfully!');
    console.log(`📁 Files created: ${savedFiles.length}`);
    savedFiles.forEach(file => {
      const stats = fs.statSync(file);
      console.log(`   📄 ${path.basename(file)} (${(stats.size / 1024).toFixed(2)} KB)`);
    });

    // Display sample emails
    console.log('\n📧 Sample emails:');
    agents.slice(0, 5).forEach((agent, index) => {
      console.log(`   ${index + 1}. ${agent.email}`);
    });

    if (agents.length > 5) {
      console.log(`   ... and ${agents.length - 5} more`);
    }

  } catch (error) {
    console.error('💥 Script execution failed:', error.message);
    process.exit(1);
  } finally {
    // Close database connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('🔌 Database connection closed');
    }
  }
}

// Handle script termination
process.on('SIGINT', async () => {
  console.log('\n🛑 Script interrupted by user');
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Script terminated');
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
  }
  process.exit(0);
});

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = {
  extractDeliveryAgentEmails,
  generateCSV,
  generateJSON,
  generateTXT
};
