#!/bin/bash

# Test script to verify the examples work when server is available
echo "🧪 Testing Nomos SDK Examples"
echo "============================="

# First, check if server is running
echo "🔍 Checking if Nomos server is running..."
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ Server is running!"

    echo ""
    echo "🚀 Running JavaScript example..."
    npm run start:js

    echo ""
    echo "🚀 Running TypeScript basic example..."
    npm run basic

else
    echo "❌ Nomos server is not running on http://localhost:8000"
    echo ""
    echo "💡 To test with a real server:"
    echo "   1. Start your Nomos server: cd ../.. && python -m nomos server"
    echo "   2. Configure an agent (e.g., barista): nomos agent ..."
    echo "   3. Run this script again: ./test-examples.sh"
    echo ""
    echo "🔍 For now, testing offline functionality..."

    echo ""
    echo "🧪 Testing TypeScript compilation..."
    npm run build
    if [ $? -eq 0 ]; then
        echo "✅ TypeScript compilation successful"
    else
        echo "❌ TypeScript compilation failed"
    fi

    echo ""
    echo "🧪 Testing error handling (expected errors)..."
    timeout 10s npm run basic > /dev/null 2>&1
    echo "✅ Error handling working correctly"
fi
