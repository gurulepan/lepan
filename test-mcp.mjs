import "dotenv/config";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const MCP_URL =
  process.env.MCP_URL ||
  `http://localhost:${process.env.MCP_PORT || "3000"}/mcp`;

function separator(title = "") {
  console.log("\n" + "=".repeat(64));

  if (title) {
    console.log(`        ${title}`);
    console.log("=".repeat(64));
  }
}

function mask(value) {
  if (!value) {
    return "❌ НЕ ЗАДАНО";
  }

  if (value.length <= 4) {
    return "***";
  }

  return `${value.slice(0, 2)}***${value.slice(-2)}`;
}

function printEnv() {
  separator("ENVIRONMENT");

  console.log("Node:", process.version);
  console.log("CWD:", process.cwd());

  console.log("\nMCP:");
  console.log("MCP_URL:", MCP_URL);
  console.log(
    "MCP_PORT:",
    process.env.MCP_PORT || "❌"
  );

  console.log("\n1C ENV:");

  console.log(
    "ONEC_BASE_URL:",
    process.env.ONEC_BASE_URL || "❌ НЕ ЗАДАНО"
  );

  console.log(
    "ONEC_LOGIN:",
    process.env.ONEC_LOGIN
      ? mask(process.env.ONEC_LOGIN)
      : "❌ НЕ ЗАДАНО"
  );

  console.log(
    "ONEC_PASSWORD:",
    process.env.ONEC_PASSWORD
      ? "***"
      : "❌ НЕ ЗАДАНО"
  );

  console.log(
    "\nВажно: эти env принадлежат TEST PROCESS."
  );

  console.log(
    "Они НЕ доказывают, что MCP server использует те же env."
  );
}

async function connectMcp() {
  separator("TEST 1 — CONNECT MCP");

  console.log("MCP URL:", MCP_URL);

  const client = new Client(
    {
      name: "onec-mcp-list-entities-test",
      version: "1.0.0",
    },
    {
      capabilities: {},
    }
  );

  const transport =
    new StreamableHTTPClientTransport(
      new URL(MCP_URL)
    );

  try {
    await client.connect(transport);

    console.log("✅ MCP Client подключён");

    return {
      client,
      transport,
    };
  } catch (error) {
    console.error("❌ MCP CONNECT FAILED");
    console.error(error);

    return null;
  }
}

async function listMcpTools(client) {
  separator("TEST 2 — MCP TOOLS");

  try {
    const result = await client.listTools();

    const tools = result.tools || [];

    console.log(
      "Количество tools:",
      tools.length
    );

    // ВЫВОД ВСЕХ НАЗВАНИЙ ИНСТРУМЕНТОВ
    console.log("\n📋 СПИСОК ВСЕХ ДОСТУПНЫХ ИНСТРУМЕНТОВ MCP:");
    console.log("-".repeat(64));
    
    tools.forEach((tool, index) => {
      const num = String(index + 1).padStart(2, ' ');
      console.log(`${num}. ${tool.name}`);
    });
    
    console.log("-".repeat(64));
    console.log(`Всего: ${tools.length} инструментов\n`);

    // ПОЛНАЯ МЕТАДАННЫХ ВСЕХ ИНСТРУМЕНТОВ
    console.log("📖 ПОЛНАЯ METADATA ВСЕХ ИНСТРУМЕНТОВ:");
    console.log("-".repeat(64));
    
    console.log(JSON.stringify(result, null, 2));
    
    console.log("-".repeat(64));

    // ДЕТАЛЬНАЯ ИНФОРМАЦИЯ ПО КАЖДОМУ ИНСТРУМЕНТУ
    console.log("\n📖 ПОДРОБНАЯ ИНФОРМАЦИЯ ПО ИНСТРУМЕНТАМ:");
    console.log("-".repeat(64));
    
    tools.forEach((tool, index) => {
      const num = String(index + 1).padStart(2, ' ');
      console.log(`\n${num}. ${tool.name}`);
      console.log(`   Описание: ${tool.description || "нет описания"}`);
      
      if (tool.inputSchema) {
        const required = tool.inputSchema.required || [];
        const properties = tool.inputSchema.properties || {};
        const propNames = Object.keys(properties);
        
        if (propNames.length > 0) {
          console.log(`   Параметры (${propNames.length}):`);
          propNames.forEach(prop => {
            const isRequired = required.includes(prop) ? "обязательный" : "опциональный";
            const propInfo = properties[prop];
            const type = propInfo.type || "unknown";
            const desc = propInfo.description ? ` - ${propInfo.description}` : "";
            console.log(`     - ${prop} (${type}, ${isRequired})${desc}`);
          });
        } else {
          console.log("   Параметры: нет");
        }
      }
    });
    
    console.log("-".repeat(64));

    const listEntities = tools.find(
      (tool) => tool.name === "list_entities"
    );

    console.log(
      "\nlist_entities:",
      listEntities
        ? "✅ найден"
        : "❌ отсутствует"
    );

    if (listEntities) {
      console.log("\nDESCRIPTION:");

      console.log(
        listEntities.description || "нет description"
      );

      console.log("\nINPUT SCHEMA:");

      console.dir(
        listEntities.inputSchema,
        { depth: null }
      );
    }

    return {
      tools,
      listEntities,
    };
  } catch (error) {
    console.error(
      "❌ listTools FAILED:",
      error.message
    );

    return {
      tools: [],
      listEntities: null,
    };
  }
}

async function testListEntities(client) {
  separator("TEST 3 — CALL list_entities");

  console.log("MCP CALL: list_entities");
  console.log("ARGS: {}");

  try {
    const result = await client.callTool({
      name: "list_entities",
      arguments: {},
    });

    console.log("\nRAW RESULT:");

    console.dir(
      result,
      { depth: null }
    );

    console.log(
      "\nisError:",
      result?.isError
    );

    if (
      result?.content &&
      Array.isArray(result.content)
    ) {
      console.log(
        "\nCONTENT ITEMS:",
        result.content.length
      );

      for (
        let i = 0;
        i < result.content.length;
        i++
      ) {
        const item = result.content[i];

        console.log(
          `\nCONTENT #${i + 1}`
        );

        console.dir(
          item,
          { depth: null }
        );

        if (item?.type === "text") {
          console.log("\nTEXT:");
          console.log(item.text);
        }
      }
    }

    return result;
  } catch (error) {
    console.error(
      "\n❌ MCP TOOL ERROR: list_entities"
    );

    console.error(error);

    return {
      error,
    };
  }
}

async function main() {
  separator(
    "MCP — list_entities DIAGNOSTIC"
  );

  printEnv();

  const mcp = await connectMcp();

  if (!mcp) {
    separator("FINAL RESULT");

    console.log(
      "❌ MCP не подключился."
    );

    process.exitCode = 1;

    return;
  }

  const { client } = mcp;

  try {
    const {
      tools,
      listEntities,
    } = await listMcpTools(client);

    if (!listEntities) {
      separator("FINAL RESULT");

      console.log(
        "❌ Tool list_entities отсутствует."
      );

      process.exitCode = 1;

      return;
    }

    const result =
      await testListEntities(client);

    separator("FINAL RESULT");

    console.log(
      "MCP Connection: ✅"
    );

    console.log(
      "Tools:",
      tools.length
    );

    console.log(
      "list_entities:",
      "✅"
    );

    console.log(
      "list_entities call:",
      result?.isError
        ? "❌ ERROR"
        : "✅ SUCCESS"
    );

    if (result?.isError) {
      console.log(
        "\n⚠️ list_entities вернул ошибку."
      );

      console.log(
        "Смотри RAW RESULT выше."
      );
    } else {
      console.log(
        "\n✅ list_entities успешно выполнен."
      );
    }
  } finally {
    try {
      await client.close();
    } catch (error) {
      console.log(
        "MCP client close warning:",
        error.message
      );
    }

    console.log(
      "\nMCP Client закрыт."
    );
  }
}

main().catch((error) => {
  console.error(
    "\n============================================================"
  );

  console.error(
    "        FATAL ERROR"
  );

  console.error(
    "============================================================"
  );

  console.error(error);

  process.exitCode = 1;
});