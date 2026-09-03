FROM node:24.19.0-alpine

RUN apk add --no-cache bash

RUN npm install -g pnpm@10.18.3

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod

COPY --chown=node:node index.js mcp-server.sh ./
COPY --chown=node:node src ./src
RUN chmod +x mcp-server.sh

USER node

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD [ "${MCP_AUTOSTART}" != "true" ] || wget -q -T 4 -O /dev/null http://127.0.0.1:${MCP_PORT:-3000}/health

CMD ["node", "index.js"]
