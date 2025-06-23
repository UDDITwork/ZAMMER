#!/bin/bash

# ZAMMER Initial Setup Script for Google App Engine
# Run this script ONCE before first deployment

echo "🔧 Setting up ZAMMER for Google App Engine deployment..."

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Error: Google Cloud CLI is not installed."
    echo "📥 Please install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Login to Google Cloud
echo "🔑 Logging into Google Cloud..."
gcloud auth login

# Set project ID
echo "📡 Setting project ID..."
gcloud config set project zammer2

# Enable required APIs
echo "🔧 Enabling required APIs..."
gcloud services enable appengine.googleapis.com
gcloud services enable cloudbuild.googleapis.com

# Create App Engine application (only if it doesn't exist)
echo "🏗️ Creating App Engine application..."
if ! gcloud app describe --quiet >/dev/null 2>&1; then
    gcloud app create --region=asia-south1
    echo "✅ App Engine application created in asia-south1"
else
    echo "✅ App Engine application already exists"
fi

# Install dependencies locally for development
echo "📦 Installing local dependencies..."

# Frontend dependencies
cd frontend
npm install
cd ..

# Backend dependencies
cd backend
npm install
cd ..

# Make deployment script executable
chmod +x deploy.sh

echo ""
echo "🎉 ================================="
echo "   SETUP COMPLETED!"
echo "================================="
echo "✅ Google Cloud project configured"
echo "✅ App Engine application ready"
echo "✅ Required APIs enabled"
echo "✅ Dependencies installed"
echo ""
echo "🚀 Next steps:"
echo "   1. Run: ./deploy.sh (to deploy)"
echo "   2. Or run: npm run deploy:gcp"
echo "================================="