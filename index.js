import { Bot } from "grammy";
import { OpenRouter } from "@openrouter/agent";
import { callModel } from "@openrouter/agent/call-model";
import { createMCPTools } from "@openrouter/mcp";
import dotenv from "dotenv";
import { system_promt } from "./system-prompt.js";

dotenv.config();

const openrouter = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

const bot = new Bot(process.env.BOT_API_KEY);

// MCP-подключение к 1С через aprovodka
let mcp = null;

async function getMcpTools() {
  if (!mcp) {
    const mcpUrl = `http://localhost:${process.env.MCP_PORT || 3000}/mcp`;
    console.log(`Подключение к MCP-серверу: ${mcpUrl}`);
    mcp = await createMCPTools({
      url: mcpUrl,
      auth: { kind: "headers", headers: {} },
    });
    console.log(`MCP подключён, инструментов: ${mcp.tools.length}`);
  }
  return mcp.tools;
}

bot.command("start", async (ctx) => {
  await ctx.reply("Я AI Guru. Чем могу помочь?");
});

bot.on("message", async (ctx) => {
  console.log("text", ctx.message.text);

  if (ctx.from?.id && ctx.message?.text && !ctx.from.isBot) {
    let typingInterval = null;

    try {
      await ctx.api.sendChatAction(ctx.chat.id, "typing");
      typingInterval = setInterval(async () => {
        try {
          await ctx.api.sendChatAction(ctx.chat.id, "typing");
        } catch (e) {}
      }, 3500);

      const question = ctx.message.text;
      const today = new Date().toLocaleDateString("ru-RU", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      // Получаем MCP-инструменты 1С
      let tools = [];
      try {
        tools = await getMcpTools();
      } catch (e) {
        console.warn("MCP недоступен, работаю без 1С:", e.message);
      }

      const result = callModel(openrouter, {
        model: "openai/gpt-oss-120b",
        input: [
          {
            role: "system",
            content: system_promt,
          },
          {
            role: "user",
            content: `Сегодня ${today}.\n\nВопрос: ${question}`,
          },
        ],
        tools: tools.length > 0 ? tools : undefined,
      });

      const response = await result.getText();

      clearInterval(typingInterval);
      await ctx.reply(response || "Пустой ответ 😕");
    } catch (error) {
      if (typingInterval) clearInterval(typingInterval);
      console.error("AI error:", error);
      await ctx.reply("Извините, технические ошибки. Попробуйте снова.");
    }
  }
});

// Graceful shutdown
process.on("SIGINT", async () => {
  if (mcp) await mcp.close();
  bot.stop();
  process.exit(0);
});

bot.start({
  drop_pending_updates: true,
});
