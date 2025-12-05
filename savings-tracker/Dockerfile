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
ARG BUILD_FROM
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

# Copy the add-on's Nginx configuration and run script
COPY nginx.conf /etc/nginx/nginx.conf
COPY run.sh /
RUN chmod +x /run.sh

# Set the command to run when the container starts
CMD ["/run.sh"]

