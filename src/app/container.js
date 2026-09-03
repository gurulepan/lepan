import { AnswerQuestion } from "../core/use-cases/answer-question.js";
import { OpenRouterLlm } from "../adapters/secondary/llm/openrouter.js";
import { McpTools } from "../adapters/secondary/tools/mcp/client.js";
import { InMemorySessionLog } from "../adapters/secondary/session-log/memory.js";

export function createApp() {
  const llm = new OpenRouterLlm();
  const tools = new McpTools();
  const sessionLog = new InMemorySessionLog();

  const answerQuestion = new AnswerQuestion(llm, tools, sessionLog);

  return {
    answerQuestion,
    tools,
  };
}
