#!/bin/bash

# ZAMMER Google App Engine Deployment Script
# Run this script from the ZAMMER root directory

echo "🚀 Starting ZAMMER deployment to Google App Engine..."

# Check if we're in the right directory
if [ ! -f "app.yaml" ]; then
    echo "❌ Error: app.yaml not found. Make sure you're in the ZAMMER root directory."
    exit 1
fi

# Set project ID
echo "📡 Setting Google Cloud project..."
gcloud config set project onyx-osprey-462815-i9

# Verify project is set
PROJECT_ID=$(gcloud config get-value project)
echo "✅ Project set to: $PROJECT_ID"

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf frontend/build/
rm -rf backend/node_modules/.cache/

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install

# Build frontend for production
echo "🔨 Building frontend for production..."
REACT_APP_API_URL=https://onyx-osprey-462815-i9.appspot.com/api npm run build

# Verify build was created
if [ ! -d "build" ]; then
    echo "❌ Error: Frontend build failed"
    exit 1
fi

echo "✅ Frontend build completed successfully"

# Go back to root
cd ..

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install --production

# Go back to root
cd ..

# Deploy to Google App Engine
echo "🚀 Deploying to Google App Engine..."
gcloud app deploy app.yaml --quiet --verbosity=info

# Check deployment status
if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 ================================="
    echo "   DEPLOYMENT SUCCESSFUL!"
    echo "================================="
    echo "🌐 Your app is live at:"
    echo "   https://onyx-osprey-462815-i9.appspot.com"
    echo ""
    echo "📊 Useful commands:"
    echo "   View logs: gcloud app logs tail -s default"
    echo "   Open app: gcloud app browse"
    echo "   View versions: gcloud app versions list"
    echo "================================="
    
    # Optionally open the app
    read -p "🌐 Do you want to open the app in your browser? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        gcloud app browse
    fi
    
else
    echo "❌ Deployment failed. Check the error messages above."
    echo "🔍 You can view detailed logs with: gcloud app logs tail -s default"
    exit 1
fi