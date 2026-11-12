FROM node:20-slim

WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY . .
RUN mkdir -p logs

EXPOSE 5000
CMD ["node", "server.js"]
