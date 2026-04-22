#!/bin/bash
set -e

echo "🚀 Starting Afia Oil Tracker local development..."
echo ""

# ============================================================================
# STEP 1: Configuration Files Setup
# ============================================================================

# Check for worker/.dev.vars
if [ ! -f "worker/.dev.vars" ]; then
  echo "⚠️  Missing worker/.dev.vars - copying from example..."
  cp worker/.dev.vars.example worker/.dev.vars
  echo "✅ Created worker/.dev.vars"
  echo "   💡 Tip: Mock mode enabled by default (no API keys required)"
  echo ""
fi

# Check for .env.local
if [ ! -f ".env.local" ]; then
  echo "⚠️  Missing .env.local - copying from example..."
  cp .env.example .env.local
  echo "✅ Created .env.local"
  echo ""
fi

# Verify mock mode is enabled
if grep -q 'ENABLE_MOCK_LLM="true"' worker/.dev.vars; then
  echo "✅ Mock mode enabled - no API keys required"
else
  echo "⚠️  Mock mode disabled - real API keys will be required"
  echo "   To enable mock mode, set ENABLE_MOCK_LLM=\"true\" in worker/.dev.vars"
fi
echo ""

# ============================================================================
# STEP 2: Dependencies Installation
# ============================================================================

# Check if frontend dependencies are installed
if [ ! -d "node_modules" ]; then
  echo "📦 Installing frontend dependencies..."
  npm install
  echo "✅ Frontend dependencies installed"
  echo ""
else
  echo "✅ Frontend dependencies already installed"
fi

# Check if worker dependencies are installed
if [ ! -d "worker/node_modules" ]; then
  echo "📦 Installing worker dependencies..."
  cd worker && npm install && cd ..
  echo "✅ Worker dependencies installed"
  echo ""
else
  echo "✅ Worker dependencies already installed"
fi

echo ""
echo "✅ Setup complete!"
echo ""

# ============================================================================
# STEP 3: Start Services
# ============================================================================

echo "Starting services..."
echo "  - Worker: http://localhost:8787"
echo "  - Frontend: http://localhost:5173"
echo "  - Admin: http://localhost:5173/admin (password: 1234)"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Start Worker in background
echo "🔧 Starting Cloudflare Worker..."
cd worker
wrangler dev > ../worker.log 2>&1 &
WORKER_PID=$!
cd ..
echo "   Worker PID: $WORKER_PID"

# Wait for Worker to start with timeout
echo "⏳ Waiting for Worker to start..."
WORKER_READY=false
for i in {1..30}; do
  if curl -s http://localhost:8787/health > /dev/null 2>&1; then
    echo "✅ Worker ready at http://localhost:8787"
    WORKER_READY=true
    break
  fi
  sleep 1
done

if [ "$WORKER_READY" = false ]; then
  echo "⚠️  Worker did not respond within 30 seconds"
  echo "   Check worker.log for errors"
  echo ""
fi

# Start Frontend in background
echo "🎨 Starting Frontend..."
npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!
echo "   Frontend PID: $FRONTEND_PID"

# Wait for Frontend to start with timeout
echo "⏳ Waiting for Frontend to start..."
FRONTEND_READY=false
for i in {1..30}; do
  if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo "✅ Frontend ready at http://localhost:5173"
    FRONTEND_READY=true
    break
  fi
  sleep 1
done

if [ "$FRONTEND_READY" = false ]; then
  echo "⚠️  Frontend did not respond within 30 seconds"
  echo "   Check frontend.log for errors"
  echo ""
fi

echo ""
echo "🎉 All services running!"
echo ""
echo "📝 Logs:"
echo "  - Worker: tail -f worker.log"
echo "  - Frontend: tail -f frontend.log"
echo ""
echo "🔗 Quick Links:"
echo "  - App: http://localhost:5173"
echo "  - Admin: http://localhost:5173/admin"
echo "  - Worker Health: http://localhost:8787/health"
echo ""
echo "💡 Tips:"
echo "  - Mock mode is enabled by default (no API keys needed)"
echo "  - Admin password: 1234"
echo "  - Press Ctrl+C to stop all services"
echo ""

# Cleanup on exit
cleanup() {
  echo ""
  echo "🛑 Stopping services..."
  kill $WORKER_PID $FRONTEND_PID 2>/dev/null || true
  echo "✅ All services stopped"
  exit 0
}

trap cleanup EXIT INT TERM

# Keep script running and show live logs
echo "📊 Live logs (Ctrl+C to stop):"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
tail -f worker.log frontend.log 2>/dev/null &
TAIL_PID=$!

# Wait for user interrupt
wait $TAIL_PID
