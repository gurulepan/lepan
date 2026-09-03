import { createMCPTools } from "@openrouter/mcp";
import { config } from "../../../../app/config.js";
import { startMcpServer } from "./server.js";

let mcp = null;

/**
 * ToolPort для 1С через MCP.
 */
export class McpTools {
  async getTools() {
    if (!mcp) {
      await startMcpServer();

      console.log(`Подключение к MCP: ${config.mcpUrl}`);

      mcp = await createMCPTools({
        url: config.mcpUrl,
      });

      console.log(`MCP подключён, tools: ${mcp.tools.length}`);
    }

    return mcp.tools;
  }

  async close() {
    if (!mcp) return;

    try {
      await mcp.close();
      console.log("MCP соединение закрыто.");
    } catch (error) {
      console.error("Ошибка закрытия MCP:", error);
    } finally {
      mcp = null;
    }
  }
}
