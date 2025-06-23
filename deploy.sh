#!/bin/bash

echo "🚀 ==============================="
echo "   ZAMMER DEPLOYMENT SCRIPT"
echo "==============================="
echo "🌍 Target: Google App Engine"
echo "📦 Project: zammer2"
echo "==============================="

# Set Google Cloud project
gcloud config set project zammer2

# Check if we're in the right directory
if [ ! -f "app.yaml" ]; then
    echo "❌ Error: app.yaml not found. Please run this script from the project root."
    exit 1
fi

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf frontend/build
rm -rf backend/public
rm -rf frontend/node_modules/.cache

# Build frontend with production API URL
echo "📦 Building frontend..."
cd frontend

# Clean install frontend dependencies
echo "📥 Installing frontend dependencies..."
rm -rf node_modules
npm install

# Build React app for production with correct API URL
echo "🔨 Building React app with production API URL..."
REACT_APP_API_URL=https://zammer2.appspot.com/api npm run build

# Verify build files exist
if [ ! -d "build" ]; then
    echo "❌ ERROR: Frontend build directory not found!"
    exit 1
fi

if [ ! -f "build/index.html" ]; then
    echo "❌ ERROR: index.html not found in build directory!"
    exit 1
fi

echo "✅ Frontend build completed successfully"
echo "📂 Build contents:"
ls -la build/
echo "📂 Static contents:"
ls -la build/static/

# Check JS and CSS files
if [ -d "build/static/js" ]; then
    echo "📂 JS files:"
    ls -la build/static/js/
fi

if [ -d "build/static/css" ]; then
    echo "📂 CSS files:"
    ls -la build/static/css/
fi

# Return to root directory
cd ..

# Copy frontend build to backend/public
echo "📋 Copying frontend build to backend..."
if [ -d "frontend/build" ]; then
    # Create backend/public directory
    mkdir -p backend/public
    
    # Copy all build files to backend/public
    cp -r frontend/build/* backend/public/
    echo "✅ Frontend build copied to backend/public"
    
    # Verify the copy was successful
    if [ ! -f "backend/public/index.html" ]; then
        echo "❌ ERROR: Failed to copy frontend build to backend/public"
        exit 1
    fi
    
    echo "📂 Backend/public contents:"
    ls -la backend/public/
    
    # Check static files were copied
    if [ -d "backend/public/static" ]; then
        echo "📂 Backend/public/static contents:"
        ls -la backend/public/static/
    fi
    
else
    echo "❌ Frontend build directory not found"
    exit 1
fi

# Build backend
echo "📦 Building backend..."
cd backend

# Clean install backend dependencies
echo "📥 Installing backend dependencies..."
rm -rf node_modules
npm install --production

if [ $? -ne 0 ]; then
    echo "❌ Backend dependency installation failed"
    exit 1
fi

echo "✅ Backend dependencies installed"

# Return to root directory
cd ..

# Verify everything is ready for deployment
echo "🔍 Pre-deployment verification..."

# Check app.yaml exists
if [ ! -f "app.yaml" ]; then
    echo "❌ ERROR: app.yaml not found"
    exit 1
fi

# Check backend/public/index.html exists
if [ ! -f "backend/public/index.html" ]; then
    echo "❌ ERROR: backend/public/index.html not found"
    exit 1
fi

# Check backend/public/static exists
if [ ! -d "backend/public/static" ]; then
    echo "❌ ERROR: backend/public/static directory not found"
    exit 1
fi

echo "✅ All pre-deployment checks passed"

# Deploy to Google App Engine
echo "🚀 Deploying to Google App Engine..."
gcloud app deploy app.yaml --quiet --promote

# Check deployment status
if [ $? -eq 0 ]; then
    echo "✅ ==============================="
    echo "   DEPLOYMENT SUCCESSFUL!"
    echo "==============================="
    echo "🌐 Your app is live at:"
    echo "   https://zammer2.appspot.com"
    echo "==============================="
    
    # Test the deployment
    echo "🧪 Testing deployment..."
    echo "🔗 Health check: https://zammer2.appspot.com/api/health"
    
    # Optional: Open the app in browser
    read -p "🌐 Open app in browser? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        gcloud app browse
    fi
    
    echo "📊 To view logs: gcloud app logs tail -s default"
    echo "🔧 To view in console: https://console.cloud.google.com/appengine"
    
else
    echo "❌ ==============================="
    echo "   DEPLOYMENT FAILED!"
    echo "==============================="
    echo "💡 Troubleshooting steps:"
    echo "1. Check the error messages above"
    echo "2. Verify app.yaml configuration"
    echo "3. Check if all dependencies are installed"
    echo "4. Run 'gcloud app logs tail -s default' for live logs"
    echo "5. Verify build files are properly copied"
    exit 1
fi