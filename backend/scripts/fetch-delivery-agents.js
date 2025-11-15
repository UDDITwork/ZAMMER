#!/usr/bin/env node

/**
 * 📦 Delivery Agent Fetch Test Script
 *
 * Quickly fetch delivery agents from MongoDB for verification/debugging.
 * Supports simple CLI filters without requiring the full backend stack.
 *
 * Usage examples:
 *   node scripts/fetch-delivery-agents.js
 *   node scripts/fetch-delivery-agents.js --limit=10
 *   node scripts/fetch-delivery-agents.js --status=available --verified
 */

const path = require('path');
const mongoose = require('mongoose');

// Load environment variables from backend/.env
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const connectDB = require('../config/db');
const DeliveryAgent = require('../models/DeliveryAgent');

const parseArgs = () => {
  const result = {
    limit: 20,
    status: undefined,
    area: undefined,
    vehicle: undefined,
    verified: false,
    active: false,
    availableOnly: false
  };

  const aliasMap = {
    l: 'limit',
    s: 'status',
    a: 'area',
    v: 'vehicle'
  };

  const boolKeys = new Set(['verified', 'active', 'availableOnly']);
  const numberKeys = new Set(['limit']);

  const setValue = (key, value) => {
    if (!(key in result)) return;

    if (boolKeys.has(key)) {
      result[key] = value === undefined ? true : value !== 'false';
      return;
    }

    if (numberKeys.has(key)) {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) {
        result[key] = parsed;
      }
      return;
    }

    result[key] = value;
  };

  const argv = process.argv.slice(2);

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('-')) {
      continue;
    }

    if (arg.startsWith('--')) {
      const [rawKey, inlineValue] = arg.slice(2).split('=');
      const key = rawKey;
      if (boolKeys.has(key)) {
        setValue(key, inlineValue);
        continue;
      }

      if (inlineValue !== undefined) {
        setValue(key, inlineValue);
        continue;
      }

      const nextValue = argv[i + 1];
      if (nextValue && !nextValue.startsWith('-')) {
        setValue(key, nextValue);
        i++;
      } else {
        setValue(key, undefined);
      }
    } else {
      const trimmed = arg.replace(/^-+/, '');
      const key = aliasMap[trimmed];
      if (!key) {
        continue;
      }

      if (boolKeys.has(key)) {
        setValue(key, undefined);
        continue;
      }

      const nextValue = argv[i + 1];
      if (nextValue && !nextValue.startsWith('-')) {
        setValue(key, nextValue);
        i++;
      } else {
        setValue(key, undefined);
      }
    }
  }

  return result;
};

const args = parseArgs();

/**
 * Build a MongoDB query based on CLI arguments.
 */
const buildQuery = () => {
  const query = {};

  if (args.status) {
    query.status = args.status;
  }

  if (args.verified) {
    query.isVerified = true;
  }

  if (args.active) {
    query.isActive = true;
  }

  if (args.availableOnly) {
    query.status = { $in: ['available', 'assigned'] };
    query.isActive = true;
    query.isBlocked = false;
  }

  if (args.area) {
    query.area = new RegExp(args.area, 'i');
  }

  if (args.vehicle) {
    query.vehicleType = args.vehicle;
  }

  return query;
};

/**
 * Fetch delivery agents and print a concise summary table.
 */
const fetchDeliveryAgents = async () => {
  console.log('🧪 Running delivery agent fetch test...');

  const query = buildQuery();
  const limit = Number(args.limit) || 20;

  console.log('🔍 Query:', JSON.stringify(query, null, 2));
  console.log(`📏 Limit: ${limit}`);

  const agents = await DeliveryAgent.find(query)
    .select('name email mobileNumber status vehicleType area isVerified isActive createdAt')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  console.log(`\n📊 Found ${agents.length} delivery agent(s):\n`);

  if (agents.length === 0) {
    console.log('⚠️ No delivery agents matched the query.');
    return;
  }

  agents.forEach((agent, index) => {
    console.log(`#${index + 1}`);
    console.log(`   Name       : ${agent.name}`);
    console.log(`   Email      : ${agent.email}`);
    console.log(`   Mobile     : ${agent.mobileNumber}`);
    console.log(`   Status     : ${agent.status}`);
    console.log(`   Verified   : ${agent.isVerified ? '✅' : '❌'}`);
    console.log(`   Active     : ${agent.isActive ? '✅' : '❌'}`);
    console.log(`   Vehicle    : ${agent.vehicleType || 'N/A'}`);
    console.log(`   Area       : ${agent.area || 'N/A'}`);
    console.log(`   Created At : ${new Date(agent.createdAt).toLocaleString()}`);
    console.log('---');
  });
};

const main = async () => {
  try {
    await connectDB();
    await fetchDeliveryAgents();
  } catch (error) {
    console.error('💥 Failed to fetch delivery agents:', error);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('🔌 Database connection closed');
    }
  }
};

if (require.main === module) {
  main();
}

module.exports = fetchDeliveryAgents;

