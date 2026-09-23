FROM node:20-slim AS builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install --ignore-scripts
COPY client/ ./
RUN npm run build

FROM node:20-slim
WORKDIR /app
COPY server/package*.json ./server/
RUN cd server && npm install --omit=dev --ignore-scripts
COPY server/ ./server/
COPY --from=builder /app/client/dist ./client/dist
WORKDIR /app/server
EXPOSE 5002
ENV PORT=5002
CMD ["node", "server.js"]
