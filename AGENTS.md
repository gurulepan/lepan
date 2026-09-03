# AGENTS.md

Telegram-бот **AI Guru**: сотрудники спрашивают про данные компании, ответ строится из **1С** через MCP. Стек: Node ESM, Grammy, `@openrouter/agent`, `@openrouter/mcp`, MCP-сервер `aprovodka` (`mcp-server.sh`).

Архитектура — **hexagonal**. Core не импортирует Grammy / OpenRouter / MCP SDK. Сборка зависимостей только в `src/app/container.js`. Точка процесса: корневой `index.js` → `src/index.js`.

## Слои

| Слой | Путь | Роль |
| --- | --- | --- |
| Config | `src/app/config.js` | единственное чтение `process.env` |
| Domain | `src/core/domain/question.js` | `IncomingQuestion`, `Answer`, `detectWantsReview` |
| Ports | `src/core/ports.js` | JSDoc: `LlmPort`, `ToolPort`, `SessionLogPort` |
| Use case | `src/core/use-cases/answer-question.js` | **единственный** сценарий: tools → LLM → session log |
| Primary | `src/adapters/primary/*` | мир → приложение (сейчас Telegram) |
| Secondary | `src/adapters/secondary/*` | приложение → мир (LLM, MCP, лог) |
| Compose | `src/app/container.js`, `src/index.js` | DI, warmup MCP, shutdown |

**Primary** слушает канал и вызывает `answerQuestion.execute()`. **Secondary** реализует порт; use case вызывает его.

Не путать: `wantsReview` — пользователь просит проверить данные 1С; `SessionLogPort` — журнал сессии, не аудит 1С.

## Поток одного сообщения

```
Telegram message:text
  → IncomingQuestion { text, userId, channel, wantsReview }
  → AnswerQuestion.execute
       → ToolPort.getTools()     // McpTools: autostart + createMCPTools
       → LlmPort.complete(...)   // OpenRouterLlm: callModel + tools
       → SessionLogPort.record()
  → Answer → formatAnswer → ctx.reply
```

Выбор MCP-tool делает **модель** по `name`/`description`. Core и бот **не** маршрутизируют `if вопрос про долги → tool X`. Цикл tool-call уже в `@openrouter/agent`; не дублировать его.

При недоступных tools: `ToolsUnavailableError` (текст про 1С). Обработка канала — в primary.

## Куда класть изменения

| Задача | Куда |
| --- | --- |
| Новый канал (Web, voice) | `adapters/primary/<channel>/`, вызов `execute()` |
| Другая модель / провайдер | новый secondary под `LlmPort` |
| Ещё один источник tools (Bitrix) | новый `ToolPort` + registry; Core почти не трогать |
| Postgres вместо памяти | `adapters/secondary/session-log/` |
| Лимиты, URL, ключи | `src/app/config.js` + `.env.example` |
| Текст системного промпта | `adapters/secondary/llm/system-prompt.js` (`SYSTEM_PROMPT`) |
| Автозапуск MCP HTTP | `adapters/secondary/tools/mcp/server.js` |

## Запреты

- `process.env` вне `src/app/config.js`
- импорт адаптеров из `src/core/`
- бизнес-логика и вызовы OpenRouter/MCP в `adapters/primary/telegram/bot.js` (там: typing, reply, маппинг ошибок канала)
- хардкод модели / `maxOutputTokens` / числа шагов агента — брать из `config`

## Запуск

`pnpm start` / `pnpm dev`. Env: `BOT_API_KEY`, `OPENROUTER_API_KEY`, 1С (`ONEC_*`), `MCP_PORT` / `MCP_URL`, `MCP_AUTOSTART`. Опционально: `OPENROUTER_MODEL`, `MAX_TOOL_STEPS`, `MAX_OUTPUT_TOKENS`.

При `MCP_AUTOSTART=true` на старте греется `tools.getTools()`, чтобы первый чат не ждал подъём MCP.

1С-скиллы в `.claude/skills/` (cf, cfe, epf, формы и т.д.) — отдельный контур от runtime-бота.
