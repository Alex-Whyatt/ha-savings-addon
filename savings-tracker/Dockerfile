ARG BUILD_FROM
# --- Build Stage ---
# Use a Node.js image to build the frontend and install backend dependencies
FROM node:18-alpine AS builder

WORKDIR /usr/src/app

# Copy all source code into the builder
COPY . ./

# Install all dependencies and build the frontend
RUN npm install
RUN npm run build

# Install only production dependencies for the backend
RUN cd backend && npm install --only=production


# --- Final Stage ---
# Use the Home Assistant base image provided by the build environment
FROM $BUILD_FROM

# Install Nginx (to serve the frontend) and Node.js (to run the backend)
# The base image is minimal and doesn't include these by default.
RUN apk add --no-cache nginx nodejs npm

# Set the working directory for the final image
WORKDIR /app

# Copy the built frontend from the builder stage
COPY --from=builder /usr/src/app/dist ./dist

# Copy the backend source code and its production dependencies from the builder stage
COPY --from=builder /usr/src/app/backend ./backend

# Copy the add-on's Nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy the s6 service definitions and make them executable
COPY services.d /etc/services.d
RUN chmod +x /etc/services.d/*/run

