# Dockerfile for Frontend (Vite)
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose Vite port
EXPOSE 5173

# Run development server
CMD ["npm", "run", "dev", "--", "--host"]
