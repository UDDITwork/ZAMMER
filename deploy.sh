#!/bin/bash

echo "🚀 ZAMMER Deployment Script"
echo "=========================="

# Check if we're in the right directory
if [ ! -f "app.yaml" ]; then
    echo "❌ Error: app.yaml not found. Please run this script from the project root."
    exit 1
fi

# Build frontend
echo "📦 Building frontend..."
cd frontend
npm install
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Frontend build failed"
    exit 1
fi
echo "✅ Frontend built successfully"

# Go back to root
cd ..

# Copy frontend build to backend
echo "📋 Copying frontend build to backend..."
if [ -d "frontend/build" ]; then
    # Create backend/public if it doesn't exist
    mkdir -p backend/public
    
    # Copy frontend build to backend/public
    cp -r frontend/build/* backend/public/
    echo "✅ Frontend build copied to backend/public"
else
    echo "❌ Frontend build directory not found"
    exit 1
fi

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install --production
if [ $? -ne 0 ]; then
    echo "❌ Backend dependency installation failed"
    exit 1
fi
echo "✅ Backend dependencies installed"

# Go back to root
cd ..

# Deploy to Google App Engine
echo "🚀 Deploying to Google App Engine..."
gcloud app deploy app.yaml --quiet

if [ $? -eq 0 ]; then
    echo "🎉 Deployment successful!"
    echo "🌐 Your app is now live at: https://zammer2.uc.r.appspot.com"
else
    echo "❌ Deployment failed"
    exit 1
fi