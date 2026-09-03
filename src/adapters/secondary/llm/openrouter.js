import { OpenRouter } from "@openrouter/agent";
import { callModel } from "@openrouter/agent/call-model";
import { stepCountIs } from "@openrouter/agent/stop-conditions";
import { config } from "../../../app/config.js";
import { SYSTEM_PROMPT } from "./system-prompt.js";

const openrouter = new OpenRouter({
  apiKey: config.openrouterApiKey,
});

export class OpenRouterLlm {
  /**
   * @param {{ question: string, tools: any[], wantsReview?: boolean }} p
   */
  async complete({ question, tools, wantsReview = false }) {
    const today = new Date().toLocaleDateString("ru-RU", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const reviewHint = wantsReview
      ? "\nЕсли в данных есть странности, дубли или несоответствия — явно перечисли их в конце ответа."
      : "";

    const instructions = SYSTEM_PROMPT + reviewHint;

    const result = callModel(openrouter, {
      model: config.openrouterModel,
      instructions,
      maxOutputTokens: config.maxOutputTokens,

      input: [
        {
          role: "system",
          content: instructions,
        },
        {
          role: "user",
          content: `Сегодня ${today}.

Вопрос пользователя:
${question}`,
        },
      ],

      tools,

      stopWhen: [stepCountIs(config.maxToolSteps)],

      hooks: {
        PreToolUse: [
          {
            handler: ({ toolName, toolInput }) =>
              console.log("[TOOL →]", toolName, JSON.stringify(toolInput)),
          },
        ],
        PostToolUse: [
          {
            handler: ({ toolName, toolOutput, durationMs }) =>
              console.log(
                "[TOOL ✓]",
                toolName,
                `${durationMs}ms`,
                JSON.stringify(toolOutput),
              ),
          },
        ],
        PostToolUseFailure: [
          {
            handler: ({ toolName, error }) =>
              console.error("[TOOL ✗]", toolName, error),
          },
        ],
      },
    });

    return result.getText();
  }
}
