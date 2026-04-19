#!/bin/bash

# Setup Stage 2 (local-model) branch
# This script creates the local-model branch and sets up the initial configuration

set -e

echo "🚀 Setting up Stage 2 (local-model) branch..."

# Check if we're on master
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "master" ]; then
    echo "⚠️  Warning: You're not on master branch (current: $CURRENT_BRANCH)"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo "❌ Error: You have uncommitted changes. Please commit or stash them first."
    exit 1
fi

# Create and checkout local-model branch
echo "📝 Creating local-model branch..."
git checkout -b local-model

# Create placeholder for local model implementation
echo "📦 Creating local model implementation placeholder..."
mkdir -p src/services/localModel

cat > src/services/localModel/README.md << 'EOF'
# Local Model Implementation

This directory will contain the ONNX local model implementation for Stage 2.

## TODO

1. Add ONNX model files
2. Implement model loading
3. Implement inference logic
4. Add fallback to LLM API
5. Add performance monitoring
6. Add accuracy comparison tests

## Files to Create

- `modelLoader.ts` - Load ONNX model
- `inference.ts` - Run inference
- `fallback.ts` - Fallback logic to LLM
- `monitoring.ts` - Track metrics
- `__tests__/` - Test files
EOF

# Create environment variable documentation
cat > .env.stage2.example << 'EOF'
# Stage 2 Environment Variables (Local Model + LLM Fallback)

# Enable local model
VITE_ENABLE_LOCAL_MODEL=true
VITE_STAGE=stage2

# Worker URL for Stage 2
VITE_PROXY_URL=https://afia-worker-stage2.savona.workers.dev

# Admin password
VITE_ADMIN_PASSWORD=your_admin_password_here

# Local model configuration
VITE_LOCAL_MODEL_PATH=/models/afia-model.onnx
VITE_LOCAL_MODEL_THRESHOLD=0.7

# Fallback configuration
VITE_FALLBACK_ENABLED=true
VITE_FALLBACK_ON_LOW_CONFIDENCE=true
VITE_FALLBACK_CONFIDENCE_THRESHOLD=0.6
EOF

# Update package.json with stage2 scripts
echo "📝 Adding Stage 2 scripts to package.json..."
cat > scripts/add-stage2-scripts.js << 'EOF'
const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Add Stage 2 specific scripts
packageJson.scripts = {
  ...packageJson.scripts,
  'dev:stage2': 'VITE_ENABLE_LOCAL_MODEL=true VITE_STAGE=stage2 vite',
  'build:stage2': 'VITE_ENABLE_LOCAL_MODEL=true VITE_STAGE=stage2 tsc -b && vite build',
  'test:stage2': 'STAGE=stage2 vitest run',
  'preview:stage2': 'npm run build:stage2 && vite preview'
};

fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
console.log('✅ Added Stage 2 scripts to package.json');
EOF

node scripts/add-stage2-scripts.js
rm scripts/add-stage2-scripts.js

# Commit changes
echo "💾 Committing initial Stage 2 setup..."
git add .
git commit -m "feat: initialize Stage 2 (local-model) branch

- Create local-model branch for Stage 2 development
- Add local model implementation placeholder
- Add Stage 2 environment variables example
- Add Stage 2 npm scripts
- Prepare for ONNX model integration

Stage 2 will use local ONNX model with LLM API fallback"

echo ""
echo "✅ Stage 2 branch setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Push branch to remote: git push -u origin local-model"
echo "2. Implement local model in src/services/localModel/"
echo "3. Add ONNX model files to public/models/"
echo "4. Update worker to support local model fallback"
echo "5. Add tests for local model + fallback"
echo "6. Deploy to Stage 2: cd worker && npx wrangler deploy --env stage2"
echo ""
echo "📚 Documentation:"
echo "- DEPLOYMENT_STRATEGY.md - Overall strategy"
echo "- .env.stage2.example - Environment variables"
echo "- src/services/localModel/README.md - Implementation guide"
