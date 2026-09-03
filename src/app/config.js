import dotenv from "dotenv";

dotenv.config();

const mcpPort = process.env.MCP_PORT || "3000";
const mcpUrl = process.env.MCP_URL || `http://localhost:${mcpPort}/mcp`;

const mcpHealthUrl = new URL(mcpUrl);
mcpHealthUrl.pathname = "/health";

export const config = {
  botToken: process.env.BOT_API_KEY,
  openrouterApiKey: process.env.OPENROUTER_API_KEY,
  openrouterModel: process.env.OPENROUTER_MODEL || "openrouter/free",
  mcpUrl,
  mcpHealthUrl: mcpHealthUrl.toString(),
  mcpAutostart: process.env.MCP_AUTOSTART === "true",
  maxToolSteps: Number(process.env.MAX_TOOL_STEPS || 5),
  maxOutputTokens: Number(process.env.MAX_OUTPUT_TOKENS || 1500),
};
