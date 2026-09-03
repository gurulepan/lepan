import { createApp } from "./app/container.js";
import { config } from "./app/config.js";
import { createTelegramBot } from "./adapters/primary/telegram/bot.js";
import { stopMcpServer } from "./adapters/secondary/tools/mcp/server.js";

const { answerQuestion, tools } = createApp();
const bot = createTelegramBot(answerQuestion);

async function shutdown(signal) {
  console.log(`${signal}: останавливаемся...`);
  try {
    await bot.stop();
    await tools.close?.();
    await stopMcpServer();
  } finally {
    process.exit(0);
  }
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));

console.log("========================================");
console.log("        AI GURU START");
console.log("========================================");

console.log(`MCP: ${config.mcpUrl}`);
console.log("OpenRouter: подключён");
console.log("Telegram: запуск...");

if (config.mcpAutostart) {
  tools.getTools().catch((error) => {
    console.error("MCP недоступен при старте:", error?.message || error);
  });
}

bot.start({
  drop_pending_updates: true,
});

console.log("Telegram bot started");
