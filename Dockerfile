FROM node:20-slim

WORKDIR /app

COPY core-mcp/package*.json ./
RUN npm ci

COPY core-mcp/ .
RUN npm run build

EXPOSE 3001

CMD ["node", "dist/index.js"]
