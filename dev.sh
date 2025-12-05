#!/bin/bash

# Development startup script for Savings Tracker
echo "🚀 Starting Savings Tracker in Development Mode"
echo "=============================================="

# Check if we should run with API backend or localStorage
if [ "$1" = "api" ]; then
    echo "📡 Starting with API backend (full persistence)..."

    # Start backend in background
    echo "🔧 Starting backend server..."
    cd backend && npm install && npm run dev &
    BACKEND_PID=$!

    # Wait a moment for backend to start
    sleep 3

    # Start frontend with API
    echo "🌐 Starting frontend with API backend..."
    VITE_API_URL="http://localhost:3001/api" npm run dev &
    FRONTEND_PID=$!

    echo ""
    echo "✅ Development servers started!"
    echo "📱 Frontend: http://localhost:5173"
    echo "🔌 Backend API: http://localhost:3001"
    echo ""
    echo "💾 Data persists in SQLite database: backend/savings.db"
    echo ""
    echo "Press Ctrl+C to stop all servers"

    # Wait for Ctrl+C
    trap "echo '🛑 Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT
    wait

else
    echo "💾 Starting with localStorage fallback (browser persistence)..."

    # Start frontend only (will use localStorage)
    echo "🌐 Starting frontend with localStorage..."
    npm run dev &
    FRONTEND_PID=$!

    echo ""
    echo "✅ Development server started!"
    echo "📱 Frontend: http://localhost:5173"
    echo ""
    echo "💾 Data persists in browser localStorage"
    echo "   (clear browser data to reset)"
    echo ""
    echo "Press Ctrl+C to stop server"

    # Wait for Ctrl+C
    trap "echo '🛑 Stopping server...'; kill $FRONTEND_PID 2>/dev/null; exit" INT
    wait
fi
