import { Bot } from "grammy";
import { OpenRouter } from "@openrouter/sdk";
import dotenv from "dotenv";
import { system_promt } from "./system-prompt.js";

dotenv.config();

const openrouter = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

const bot = new Bot(process.env.BOT_API_KEY);

bot.command("start", async (ctx) => {
  await ctx.reply("Я AI Guru. Чем могу помочь?");
});

bot.on("message", async (ctx) => {
  console.log("text", ctx.message.text);

  if (ctx.from?.id && ctx.message?.text && !ctx.from.isBot) {
    let typingInterval = null;

    try {
      // Показываем «печатает…»
      await ctx.api.sendChatAction(ctx.chat.id, "typing");

      // Обновляем индикатор каждые 3.5 секунды
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

      const stream = await openrouter.chat.send({
        chatRequest: {
          model: "openai/gpt-oss-120b",
          // model: "liquid/lfm-2.5-2.6b:free",
          messages: [
            {
              role: "system",
              content: system_promt,
            },
            {
              role: "user",
              content: question,
            },
          ],
          stream: true,
        },
      });

      let response = "";
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          response += content;
          process.stdout.write(content);
        }
      }

      clearInterval(typingInterval);

      await ctx.reply(response || "Пустой ответ 😕");
    } catch (error) {
      if (typingInterval) clearInterval(typingInterval);

      console.error("AI error:", error);
      await ctx.reply("Извините, технические ошибки. Попробуйте снова.");
    }
  }
});

bot.start({
  drop_pending_updates: true,
});
