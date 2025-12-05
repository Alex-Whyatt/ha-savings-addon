#!/usr/bin/with-contenv bashio

echo "Starting Nginx..."
nginx -c /etc/nginx/nginx.conf

echo "Starting Savings Tracker backend..."
export DATABASE_PATH=/data/savings.db
cd /app/backend
npm start
