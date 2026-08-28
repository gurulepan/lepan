FROM node:24-alpine

RUN apk add --no-cache bash

RUN npm install -g pnpm@10.18.3

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

RUN npm install -g @theyahia/aprovodka

COPY index.js ./
COPY src ./src
COPY mcp-server.sh ./
RUN chmod +x mcp-server.sh

USER node

CMD ["node", "index.js"]
