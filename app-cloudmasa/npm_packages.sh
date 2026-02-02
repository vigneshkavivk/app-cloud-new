#!/bin/bash

# Base directory = where this script is located
BASE_DIR="$(cd "$(dirname "$0")" && pwd)"

CLIENT_DIR="$BASE_DIR/client"
SERVER_DIR="$BASE_DIR/server"

install_client() {
  echo "🔵 Installing CLIENT dependencies..."
  cd "$CLIENT_DIR" || { echo "❌ Client path not found: $CLIENT_DIR"; exit 1; }

  rm -rf node_modules package-lock.json
  npm cache clean --force
  npm install

  npm install vite@latest
  npm install @headlessui/react
  npm install recharts
  npm install chart.js react-chartjs-2
  npm install @aws-sdk/client-sesv2 nodemailer
}

remove_client() {
  echo "🔵 Removing CLIENT dependencies..."
  cd "$CLIENT_DIR" || exit 1

  npm uninstall vite @headlessui/react recharts chart.js react-chartjs-2 \
    @aws-sdk/client-sesv2 nodemailer

  rm -rf node_modules package-lock.json
}

install_server() {
  echo "🟢 Installing SERVER dependencies..."
  cd "$SERVER_DIR" || { echo "❌ Server path not found: $SERVER_DIR"; exit 1; }

  rm -rf node_modules package-lock.json
  npm cache clean --force
  npm install

  npm install mongoose@latest
  npm install resend axios
  npm install @aws-sdk/client-cloudwatch
  npm install google-auth-library
  npm install @google-cloud/container
  npm install @google-cloud/bigquery
  npm install @azure/arm-containerservice
  npm install @azure/identity
  npm install socket.io express
}

remove_server() {
  echo "🟢 Removing SERVER dependencies..."
  cd "$SERVER_DIR" || exit 1

  npm uninstall mongoose resend axios \
    @aws-sdk/client-cloudwatch google-auth-library \
    @google-cloud/container @google-cloud/bigquery \
    @azure/arm-containerservice @azure/identity \
    socket.io express

  rm -rf node_modules package-lock.json
}

echo "=============================="
echo "  NPM PACKAGE MANAGER SCRIPT  "
echo "=============================="
echo "1  Install CLIENT + SERVER"
echo "2  Remove CLIENT + SERVER"
echo "=============================="
read -p "Enter your choice (1 or 2): " choice

case "$choice" in
  1)
    install_client
    install_server
    echo "✅ CLIENT + SERVER installation completed!"
    ;;
  2)
    remove_client
    remove_server
    echo "✅ CLIENT + SERVER removal completed!"
    ;;
  *)
    echo "❌ Invalid choice. Please enter 1 or 2."
    ;;
esac
