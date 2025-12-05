ARG BUILD_FROM
FROM $BUILD_FROM

WORKDIR /usr/src/app

# Copy all source code
COPY . ./

# Build Frontend
RUN npm install
RUN npm run build

# Setup Backend
WORKDIR /usr/src/app/backend
RUN npm install --only=production

# Install Nginx
RUN apk add --no-cache nginx

# Copy Nginx configuration and run script
COPY nginx.conf /etc/nginx/nginx.conf
COPY run.sh /
RUN chmod +x /run.sh

CMD [ "/run.sh" ]
