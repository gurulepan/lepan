import { Bot } from "grammy";
import { config } from "../config.js";
import { getMcpTools } from "../mcp/index.js";
import { askModel } from "../llm/openrouter.js";

export function createBot() {
  const bot = new Bot(config.botToken);

  bot.command("start", async (ctx) => {
    await ctx.reply("Я AI Guru — ассистент по 1С. Чем могу помочь? 🙂");
  });

  bot.on("message", async (ctx) => {
    const question = ctx.message.text;

    if (!ctx.from?.id || !question || ctx.from.isBot) {
      return;
    }

    let typingInterval = null;

    try {
      await ctx.api.sendChatAction(ctx.chat.id, "typing");

      typingInterval = setInterval(async () => {
        try {
          await ctx.api.sendChatAction(ctx.chat.id, "typing");
        } catch {}
      }, 3500);

      let tools = [];

      try {
        tools = await getMcpTools();

        console.log(`MCP tools переданы модели: ${tools.length}`);
      } catch (error) {
        console.error("Ошибка подключения к MCP:", error);

        await ctx.reply(
          "Сейчас нет подключения к 1С, не могу получить данные. 🙂",
        );

        return;
      }

      console.log("Запрос к OpenRouter...");

      const response = await askModel({ question, tools });

      clearInterval(typingInterval);
      typingInterval = null;

      await ctx.reply(response || "Не удалось получить ответ от 1С. 😕");
    } catch (error) {
      if (typingInterval) {
        clearInterval(typingInterval);
      }

      if (
        error?.statusCode === 402 ||
        error?.body?.includes?.("more credits")
      ) {
        await ctx.reply(
          "Недостаточно доступного лимита OpenRouter для этого запроса. " +
            "Попробуйте уменьшить лимит токенов или пополнить баланс.",
        );

        return;
      }

      await ctx.reply(
        "Произошла техническая ошибка при обращении к 1С. Попробуйте ещё раз. 🙂",
      );
    }
  });

  return bot;
}
