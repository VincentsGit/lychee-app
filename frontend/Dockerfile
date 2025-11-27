FROM node:25-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Use Vite dev server for hot reload
CMD ["npm", "run", "dev", "--", "--host"]