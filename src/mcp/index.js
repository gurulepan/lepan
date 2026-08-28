import { createMCPTools } from "@openrouter/mcp";
import { config } from "../config.js";
import { startMcpServer } from "./server.js";

let mcp = null;

export async function getMcpTools() {
  if (!mcp) {
    await startMcpServer();

    console.log(`Подключение к MCP-серверу: ${config.mcpUrl}`);

    mcp = await createMCPTools({
      url: config.mcpUrl,
    });

    console.log(`MCP подключён, инструментов: ${mcp.tools.length}`);
  }

  return mcp.tools;
}

export async function closeMcp() {
  if (!mcp) {
    return;
  }

  try {
    await mcp.close();
    console.log("MCP соединение закрыто.");
  } catch (error) {
    console.error("Ошибка закрытия MCP:", error);
  } finally {
    mcp = null;
  }
}
