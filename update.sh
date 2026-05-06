#!/bin/bash
echo "======================================="
echo "Updating Application..."
echo "======================================="
echo ""

echo "Pulling latest changes from GitHub..."
git pull

echo ""
echo "Installing new dependencies..."
npm install

echo ""
echo "======================================="
echo "Update complete! You can now start the app."
echo "======================================="
