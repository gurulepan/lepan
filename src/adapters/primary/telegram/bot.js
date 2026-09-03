import { Bot } from "grammy";
import { config } from "../../../app/config.js";
import { IncomingQuestion } from "../../../core/domain/question.js";
import { ToolsUnavailableError } from "../../../core/use-cases/answer-question.js";
import { formatAnswer } from "./formatter.js";

/**
 * Primary adapter: только транспорт.
 */
export function createTelegramBot(answerQuestion) {
  const bot = new Bot(config.botToken);

  bot.command("start", async (ctx) => {
    await ctx.reply("Я AI Guru — ассистент по 1С. Чем могу помочь? 🙂");
  });

  bot.on("message:text", async (ctx) => {
    const question = ctx.message.text;
    if (!ctx.from?.id || ctx.from.is_bot) return;
    if (question.startsWith("/")) return;

    let typingInterval = null;

    try {
      await ctx.api.sendChatAction(ctx.chat.id, "typing");
      typingInterval = setInterval(() => {
        ctx.api.sendChatAction(ctx.chat.id, "typing").catch(() => {});
      }, 3500);

      const incoming = new IncomingQuestion({
        text: question,
        userId: ctx.from.id,
        channel: "telegram",
        chatId: ctx.chat.id,
      });

      const result = await answerQuestion.execute(incoming);

      clearInterval(typingInterval);
      typingInterval = null;

      await ctx.reply(formatAnswer(result));
    } catch (error) {
      if (typingInterval) clearInterval(typingInterval);

      if (error instanceof ToolsUnavailableError) {
        await ctx.reply(`${error.message} 🙂`);
        return;
      }

      if (
        error?.statusCode === 402 ||
        error?.body?.includes?.("more credits")
      ) {
        await ctx.reply(
          "Недостаточно лимита OpenRouter. Уменьшите max tokens или пополните баланс.",
        );
        return;
      }

      console.error("Telegram handler error:", error);
      await ctx.reply(
        "Произошла техническая ошибка при обращении к 1С. Попробуйте ещё раз. 🙂",
      );
    }
  });

  return bot;
}
