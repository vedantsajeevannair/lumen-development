# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (leverage caching)
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy codebase
COPY . .

# Build the Expo web application
RUN npx expo export --platform web

# Production server stage
FROM nginx:1.25-alpine

# Copy custom Nginx configuration if needed, or use default routing
# Copy build artifacts to nginx public directory
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
