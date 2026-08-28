import { OpenRouter } from "@openrouter/agent";
import { callModel } from "@openrouter/agent/call-model";
import { stepCountIs } from "@openrouter/agent/stop-conditions";
import { config } from "../config.js";
import { system_promt } from "./system-prompt.js";

const openrouter = new OpenRouter({
  apiKey: config.openrouterApiKey,
});

export function askModel({ question, tools }) {
  const today = new Date().toLocaleDateString("ru-RU", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const result = callModel(openrouter, {
    model: "openrouter/free",
    instructions: system_promt,
    // Ограничиваем размер ответа.
    // Это важно, иначе OpenRouter пытается зарезервировать
    // до 65536 токенов.
    maxOutputTokens: 1500,

    input: [
      {
        role: "system",
        content: system_promt,
      },
      {
        role: "user",
        content: `Сегодня ${today}.

Вопрос пользователя:
${question}`,
      },
    ],

    // Передаём MCP-инструменты 1С
    tools,

    // Не позволяем агенту бесконечно ходить по инструментам.
    // Для обычного запроса 5 шагов более чем достаточно.
    stopWhen: [stepCountIs(5)],
  });

  return result.getText();
}
