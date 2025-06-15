#!/bin/bash

# Setup script for Nomos TypeScript SDK Example
# This script helps you get everything set up and running

echo "🚀 Setting up Nomos TypeScript SDK Example"
echo "=========================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ npm version: $(npm --version)"

# Navigate to the SDK directory and build it
echo ""
echo "📦 Building Nomos SDK..."
cd ../../sdk/ts

if [ ! -f "package.json" ]; then
    echo "❌ SDK package.json not found. Make sure you're in the right directory."
    exit 1
fi

# Install SDK dependencies
echo "Installing SDK dependencies..."
npm install

# Build the SDK
echo "Building SDK..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Failed to build SDK"
    exit 1
fi

echo "✅ SDK built successfully"

# Create a global link for the SDK
echo "Creating global link for SDK..."
npm link

if [ $? -ne 0 ]; then
    echo "❌ Failed to create SDK link"
    exit 1
fi

echo "✅ SDK linked globally"

# Navigate back to example directory
cd ../../examples/typescript-sdk-example

# Install example dependencies
echo ""
echo "📦 Installing example dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed"

# Link the SDK to this project
echo ""
echo "🔗 Linking SDK to example project..."
npm link nomos-sdk

if [ $? -ne 0 ]; then
    echo "❌ Failed to link SDK"
    exit 1
fi

echo "✅ SDK linked to project"

# Build TypeScript examples
echo ""
echo "🔨 Building TypeScript examples..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Failed to build TypeScript examples"
    exit 1
fi

echo "✅ TypeScript examples built"

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "Available commands:"
echo "  npm run start:js    - Run JavaScript example"
echo "  npm run basic       - Run basic TypeScript example"
echo "  npm run advanced    - Run advanced TypeScript example"
echo "  npm run interactive - Run interactive chat"
echo ""
echo "💡 Make sure your Nomos server is running on http://localhost:8000"
echo "   with a configured agent (e.g., barista) before running examples."
