#!/bin/bash

echo "🔍 Verifying Hebrew Flashcards Setup"
echo "===================================="
echo ""

# Check if flashcards.words.json exists
if [ -f "flashcards.words.json" ]; then
    WORD_COUNT=$(cat flashcards.words.json | grep -o '"word"' | wc -l)
    FILE_SIZE=$(du -h flashcards.words.json | cut -f1)
    echo "✅ flashcards.words.json found ($FILE_SIZE, ~$WORD_COUNT entries)"
else
    echo "❌ flashcards.words.json NOT FOUND"
    exit 1
fi

# Check backend structure
echo ""
echo "Backend:"
if [ -f "backend/src/words/words.service.ts" ]; then
    echo "  ✅ words.service.ts exists"
else
    echo "  ❌ words.service.ts NOT FOUND"
fi

if [ -f "backend/src/words/interfaces/word.interface.ts" ]; then
    echo "  ✅ word.interface.ts exists"
else
    echo "  ❌ word.interface.ts NOT FOUND"
fi

if [ -d "backend/node_modules" ]; then
    echo "  ✅ node_modules installed"
else
    echo "  ⚠️  node_modules NOT installed (run: cd backend && npm install)"
fi

# Check frontend structure
echo ""
echo "Frontend:"
if [ -f "frontend/src/App.tsx" ]; then
    echo "  ✅ App.tsx exists"
else
    echo "  ❌ App.tsx NOT FOUND"
fi

if [ -d "frontend/node_modules" ]; then
    echo "  ✅ node_modules installed"
else
    echo "  ⚠️  node_modules NOT installed (run: cd frontend && npm install)"
fi

# Check for old MongoDB files (should not exist)
echo ""
echo "Cleanup Check:"
if [ -d "backend/src/seed" ]; then
    echo "  ⚠️  Old seed directory still exists (should be removed)"
else
    echo "  ✅ No old seed directory"
fi

if [ -d "backend/src/words/entities" ]; then
    echo "  ⚠️  Old entities directory still exists (should be removed)"
else
    echo "  ✅ No old entities directory"
fi

# Check package.json for MongoDB dependencies
echo ""
echo "Dependencies Check:"
if grep -q "mongodb" backend/package.json; then
    echo "  ⚠️  MongoDB still in package.json (should be removed)"
else
    echo "  ✅ No MongoDB dependency"
fi

if grep -q "typeorm" backend/package.json; then
    echo "  ⚠️  TypeORM still in package.json (should be removed)"
else
    echo "  ✅ No TypeORM dependency"
fi

echo ""
echo "===================================="
echo "✅ Setup verification complete!"
echo ""
echo "To start the application:"
echo "  ./start.sh"
echo ""
echo "Or manually:"
echo "  Terminal 1: cd backend && npm run start:dev"
echo "  Terminal 2: cd frontend && npm run dev"
