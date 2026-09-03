import { spawn } from "node:child_process";
import { config } from "../../../../app/config.js";

const HEALTH_POLL_INTERVAL_MS = 500;
const HEALTH_TIMEOUT_MS = 15000;
const SHUTDOWN_TIMEOUT_MS = 5000;

let serverProcess = null;

async function isServerAlive() {
  try {
    const response = await fetch(config.mcpHealthUrl, {
      signal: AbortSignal.timeout(1500),
    });

    return response.ok;
  } catch {
    return false;
  }
}

async function waitForHealth(timeoutMs) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (await isServerAlive()) {
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, HEALTH_POLL_INTERVAL_MS));
  }

  return false;
}

function killServer() {
  return new Promise((resolve) => {
    let exited = false;

    serverProcess.once("exit", () => {
      exited = true;
      resolve();
    });

    serverProcess.kill("SIGTERM");

    setTimeout(() => {
      if (!exited) {
        console.warn(
          "MCP-сервер не завершился за " +
            `${SHUTDOWN_TIMEOUT_MS / 1000} с, отправляем SIGKILL.`,
        );

        serverProcess.kill("SIGKILL");
      }
    }, SHUTDOWN_TIMEOUT_MS).unref();
  });
}

export async function startMcpServer() {
  if (!config.mcpAutostart) {
    return;
  }

  // Guard: сервер уже запущен (make mcp-bg или осиротел после рестарта nodemon)
  if (await isServerAlive()) {
    console.log("MCP-сервер уже запущен, подключаемся к существующему.");
    return;
  }

  console.log("Запуск MCP-сервера (./mcp-server.sh)...");

  serverProcess = spawn("./mcp-server.sh", {
    stdio: "inherit",
    env: { ...process.env, MCP_PORT: new URL(config.mcpUrl).port || "3000" },
  });

  serverProcess.on("error", (error) => {
    console.error("Ошибка запуска MCP-сервера:", error);
    serverProcess = null;
  });

  serverProcess.on("exit", (code) => {
    if (serverProcess) {
      console.log(`MCP-сервер остановлен, код: ${code}`);
      serverProcess = null;
    }
  });

  const started = await waitForHealth(HEALTH_TIMEOUT_MS);

  if (!started) {
    console.error(
      `MCP-сервер не поднялся за ${HEALTH_TIMEOUT_MS / 1000} с, останавливаем.`,
    );

    await stopMcpServer();

    throw new Error("MCP-сервер не ответил на health-проверку");
  }

  console.log("MCP-сервер запущен.");
}

export async function stopMcpServer() {
  if (!serverProcess) {
    return;
  }

  console.log("Остановка MCP-сервера...");

  try {
    await killServer();
  } catch (error) {
    console.error("Ошибка остановки MCP-сервера:", error);
  } finally {
    serverProcess = null;
  }
}
