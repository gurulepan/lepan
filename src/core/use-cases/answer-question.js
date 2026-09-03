import { randomUUID } from "node:crypto";
import { Answer } from "../domain/question.js";

/**
 * Единственная бизнес-точка входа: tools → LLM → журнал сессии.
 * Primary-адаптеры только вызывают execute().
 */
export class AnswerQuestion {
  /**
   * @param {import("../ports.js").LlmPort} llm
   * @param {import("../ports.js").ToolPort} tools
   * @param {import("../ports.js").SessionLogPort} sessionLog
   */
  constructor(llm, tools, sessionLog) {
    this.llm = llm;
    this.tools = tools;
    this.sessionLog = sessionLog;
  }

  /**
   * @param {import("../domain/question.js").IncomingQuestion} question
   * @returns {Promise<import("../domain/question.js").Answer>}
   */
  async execute(question) {
    const sessionId = randomUUID();

    let mcpTools;
    try {
      mcpTools = await this.tools.getTools();
    } catch (error) {
      console.error("Tools unavailable:", error);
      throw new ToolsUnavailableError(
        "Сейчас нет подключения к 1С, не могу получить данные.",
      );
    }

    const text = await this.llm.complete({
      question: question.text,
      tools: mcpTools,
      wantsReview: question.wantsReview,
    });

    await this.sessionLog.record({
      sessionId,
      userId: question.userId,
      channel: question.channel,
      question: question.text,
      wantsReview: question.wantsReview,
      answer: text,
      toolsCount: mcpTools?.length ?? 0,
      ts: new Date().toISOString(),
    });

    return new Answer({
      text: text || "Не удалось получить ответ.",
      sessionId,
      wantsReview: question.wantsReview,
    });
  }
}

export class ToolsUnavailableError extends Error {
  constructor(message) {
    super(message);
    this.name = "ToolsUnavailableError";
    this.code = "TOOLS_UNAVAILABLE";
  }
}
