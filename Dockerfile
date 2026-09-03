FROM node:24.19.0-alpine AS builder

RUN npm install -g pnpm@10.18.3

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod

FROM node:24.19.0-alpine

RUN apk add --no-cache bash \
 && apk upgrade --no-cache \
 && rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx \
           /opt/yarn* /usr/local/bin/yarn /usr/local/bin/yarnpkg \
           /usr/local/lib/node_modules/corepack /usr/local/bin/corepack

WORKDIR /app

COPY --chown=node:node index.js mcp-server.sh ./
COPY --chown=node:node src ./src
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
RUN chmod +x mcp-server.sh

USER node

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD [ "${MCP_AUTOSTART}" != "true" ] || wget -q -T 4 -O /dev/null http://127.0.0.1:${MCP_PORT:-3000}/health

CMD ["node", "index.js"]
