import dotenv from "dotenv";

dotenv.config();

const mcpPort = process.env.MCP_PORT || "3000";

const mcpUrl = process.env.MCP_URL || `http://localhost:${mcpPort}/mcp`;

// Health-эндпоинт на том же порту, что и MCP (/mcp → /health)
const mcpHealthUrl = new URL(mcpUrl);
mcpHealthUrl.pathname = "/health";

export const config = {
  botToken: process.env.BOT_API_KEY,
  openrouterApiKey: process.env.OPENROUTER_API_KEY,
  mcpUrl,
  mcpHealthUrl: mcpHealthUrl.toString(),
  mcpAutostart: process.env.MCP_AUTOSTART === "true",
};
