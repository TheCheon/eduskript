#!/bin/bash

if ! command -v pnpm &> /dev/null; then
    echo "🔧 Installing pnpm..."
    npm install -g pnpm
    echo "✅ pnpm installed successfully"
else
    echo "✅ pnpm is already installed"
fi