import { createBot } from "./src/bot/bot.js";
import { closeMcp, getMcpTools } from "./src/mcp/index.js";
import { stopMcpServer } from "./src/mcp/server.js";
import { config } from "./src/config.js";

const bot = createBot();

// ========================================
// GRACEFUL SHUTDOWN
// ========================================

async function shutdown() {
  console.log("\nОстановка бота...");

  await closeMcp();
  await stopMcpServer();

  bot.stop();

  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// ========================================
// START BOT
// ========================================

console.log("========================================");
console.log("        AI GURU START");
console.log("========================================");

console.log(`MCP: ${config.mcpUrl}`);
console.log("OpenRouter: подключён");
console.log("Telegram: запуск...");

// Прогрев MCP при автозапуске: поднимаем сервер и подключаем инструменты
// сразу, а не при первом сообщении пользователя. Ошибка прогрева не роняет
// бот — каждый запрос всё равно повторит попытку через getMcpTools().
if (config.mcpAutostart) {
  getMcpTools().catch((error) => {
    console.error("MCP недоступен при старте:", error?.message || error);
  });
}

bot.start({
  drop_pending_updates: true,
});
