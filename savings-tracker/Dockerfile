ARG BUILD_FROM
# --- Build Stage ---
# Use a Node.js image to build the frontend only
FROM node:18-alpine AS builder

WORKDIR /usr/src/app

# Copy all source code into the builder
COPY . ./

# Install all dependencies and build the frontend
RUN npm install
RUN npm run build


# --- Final Stage ---
# Use the Home Assistant base image provided by the build environment
FROM $BUILD_FROM

# Install Nginx, Node.js, and build tools for native modules
RUN apk add --no-cache nginx nodejs npm python3 make g++

# Set the working directory for the final image
WORKDIR /app

# Copy the built frontend from the builder stage
COPY --from=builder /usr/src/app/dist ./dist

# Copy backend source code (without node_modules)
COPY backend/package*.json ./backend/

# Install backend dependencies on the target architecture
RUN cd backend && npm install --only=production

# Copy the rest of the backend source
COPY backend/*.js ./backend/

# Copy the add-on's Nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy the s6 service definitions and make them executable
COPY services.d /etc/services.d
RUN chmod +x /etc/services.d/*/run

