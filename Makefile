install:
	pnpm install --frozen-lockfile

lint:
	pnpm lint

# Запуск MCP-сервера 1С (aprovodka) в HTTP-режиме
mcp:
	./mcp-server.sh

# Запуск MCP-сервера в фоне
mcp-bg:
	nohup ./mcp-server.sh > mcp-server.log 2>&1 &
	@echo "MCP-сервер запущен в фоне. Логи: mcp-server.log"

# Проверка health MCP-сервера
mcp-health:
	curl -s http://localhost:3000/health | python3 -m json.tool

# Запуск бота
start:
	pnpm start

# Запуск бота в dev-режиме (nodemon)
dev:
	pnpm dev

# Сборка docker-образа
image:
	docker build -t guru-bot:local .

# Запуск бота + MCP-сервера
start-all:
	@echo "Запуск MCP + бота..."
	@./mcp-server.sh &
	@sleep 2
	@pnpm start

update-deps:
	pnpm run update-deps
