
















































import "dotenv/config";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

/*
============================================================
  1C + MCP FULL DIAGNOSTIC
============================================================

Проверяет:

  TEST PROCESS
    └── dotenv / .env

  DIRECT 1C
    ├── $metadata
    ├── EntitySet parsing
    ├── реальные EntitySet
    └── чтение первых сущностей

  MCP
    ├── connection
    ├── tools
    ├── get_metadata
    ├── list_entities
    └── odata_query для реального EntitySet

ВАЖНО:
- Пароли не выводятся.
- API keys не выводятся.
- Authorization header не выводится.
============================================================
*/

const MCP_URL =
  process.env.MCP_URL ||
  `http://localhost:${process.env.MCP_PORT || "3000"}/mcp`;

const ONEC_BASE_URL = (
  process.env.ONEC_BASE_URL || ""
).replace(/\/+$/, "");

const ONEC_LOGIN =
  process.env.ONEC_LOGIN ||
  process.env.ONEC_USERNAME ||
  "";

const ONEC_PASSWORD =
  process.env.ONEC_PASSWORD ||
  "";

const ODATA_URL =
  `${ONEC_BASE_URL}/odata/standard.odata`;

const METADATA_URL =
  `${ODATA_URL}/$metadata`;


/* =========================================================
   HELPERS
========================================================= */

function separator(title = "") {
  console.log("\n" + "=".repeat(64));

  if (title) {
    console.log(`        ${title}`);
    console.log("=".repeat(64));
  }
}

function mask(value) {
  if (!value) return "❌ НЕ ЗАДАНО";

  if (value.length <= 4) {
    return "***";
  }

  return `${value.slice(0, 2)}***${value.slice(-2)}`;
}

function printEnv() {
  separator("ENVIRONMENT");

  console.log("Node:", process.version);

  console.log("MCP_URL:", MCP_URL);
  console.log("MCP_PORT:", process.env.MCP_PORT || "❌");

  console.log(
    "ONEC_BASE_URL:",
    ONEC_BASE_URL || "❌ НЕ ЗАДАНО"
  );

  console.log(
    "ONEC_LOGIN:",
    ONEC_LOGIN ? mask(ONEC_LOGIN) : "❌ НЕ ЗАДАНО"
  );

  console.log(
    "ONEC_PASSWORD:",
    ONEC_PASSWORD ? mask(ONEC_PASSWORD) : "❌ НЕ ЗАДАНО"
  );

  console.log(
    "ONEC_USERNAME:",
    process.env.ONEC_USERNAME
      ? mask(process.env.ONEC_USERNAME)
      : "❌ НЕ ЗАДАНО"
  );

  console.log(
    "dotenv:",
    ONEC_BASE_URL || ONEC_LOGIN || ONEC_PASSWORD
      ? "✅ env загружен / значения найдены"
      : "⚠️ значения 1С не найдены"
  );

  console.log("\nВсе env, связанные с MCP/1C:");

  for (const [key, value] of Object.entries(process.env)) {
    if (
      /^(MCP|ONEC)/i.test(key)
    ) {
      if (/PASSWORD|TOKEN|KEY|SECRET/i.test(key)) {
        console.log(`${key}=***`);
      } else {
        console.log(`${key}=${value}`);
      }
    }
  }
}


/* =========================================================
   1C AUTH
========================================================= */

function onecHeaders(extra = {}) {
  const headers = {
    Accept: "application/json",
    ...extra,
  };

  if (ONEC_LOGIN && ONEC_PASSWORD) {
    headers.Authorization =
      "Basic " +
      Buffer.from(
        `${ONEC_LOGIN}:${ONEC_PASSWORD}`
      ).toString("base64");
  }

  return headers;
}


/* =========================================================
   DIRECT HTTP REQUEST TO 1C
========================================================= */

async function onecFetch(
  url,
  {
    method = "GET",
    headers = {},
  } = {}
) {
  console.log("\n[1C REQUEST]");

  console.log("METHOD:", method);
  console.log("URL:", url);

  console.log(
    "AUTH:",
    ONEC_LOGIN && ONEC_PASSWORD
      ? "Basic Auth configured"
      : "❌ NO AUTH"
  );

  const started = Date.now();

  let response;

  try {
    response = await fetch(url, {
      method,
      headers: onecHeaders(headers),
    });
  } catch (error) {
    console.error("\n[1C NETWORK ERROR]");
    console.error(error);

    throw error;
  }

  const elapsed = Date.now() - started;

  const contentType =
    response.headers.get("content-type");

  console.log("\n[1C RESPONSE]");

  console.log("STATUS:", response.status, response.statusText);
  console.log("TIME:", `${elapsed} ms`);
  console.log("CONTENT-TYPE:", contentType || "none");

  console.log(
    "WWW-AUTHENTICATE:",
    response.headers.get("www-authenticate") || "нет"
  );

  const text = await response.text();

  console.log("LENGTH:", text.length);

  return {
    response,
    text,
  };
}


/* =========================================================
   TEST 1 — DIRECT 1C ROOT
========================================================= */

async function testOneCRoot() {
  separator("TEST 1 — 1C OData ROOT");

  console.log("URL:");
  console.log(ODATA_URL + "/");

  try {
    const {
      response,
      text,
    } = await onecFetch(
      ODATA_URL + "/"
    );

    console.log("\nBODY:");
    console.log(text.slice(0, 2000));

    return {
      ok: response.ok,
      status: response.status,
      text,
    };
  } catch (error) {
    console.error(
      "❌ ROOT TEST FAILED:",
      error.message
    );

    return {
      ok: false,
      error,
    };
  }
}


/* =========================================================
   TEST 2 — DIRECT 1C METADATA
========================================================= */

async function getMetadataDirect() {
  separator("TEST 2 — 1C OData $metadata");

  console.log("URL:");
  console.log(METADATA_URL);

  try {
    const {
      response,
      text,
    } = await onecFetch(
      METADATA_URL,
      {
        headers: {
          Accept: "application/xml",
        },
      }
    );

    console.log("\nHTTP STATUS:");
    console.log(response.status, response.statusText);

    console.log("\nCONTENT-TYPE:");
    console.log(
      response.headers.get("content-type") || "none"
    );

    console.log("\nFULL METADATA:");
    console.log("------------------------------------------------------------");

    /*
      Выводим ПОЛНЫЙ metadata.
      В твоём случае он всего ~3322 bytes.
    */

    console.log(text);

    console.log("------------------------------------------------------------");

    return {
      ok: response.ok,
      status: response.status,
      text,
    };
  } catch (error) {
    console.error(
      "❌ METADATA TEST FAILED:",
      error.message
    );

    return {
      ok: false,
      error,
    };
  }
}


/* =========================================================
   PARSE ENTITY SETS
========================================================= */

function parseEntitySets(xml) {
  const entities = [];

  /*
    Основной вариант:

    <EntitySet
      Name="Catalog_..."
      EntityType="StandardODATA.Catalog_..."
    />
  */

  const regex =
    /<EntitySet\b[^>]*\bName="([^"]+)"[^>]*\bEntityType="([^"]+)"[^>]*\/?>/gi;

  for (const match of xml.matchAll(regex)) {
    entities.push({
      name: match[1],
      entityType: match[2],
    });
  }

  /*
    Дополнительный fallback:
    если атрибуты идут в другом порядке.
  */

  if (entities.length === 0) {
    const fallback =
      /<EntitySet\b([^>]+)>/gi;

    for (const match of xml.matchAll(fallback)) {
      const attrs = match[1];

      const name =
        attrs.match(/\bName="([^"]+)"/i)?.[1];

      const entityType =
        attrs.match(/\bEntityType="([^"]+)"/i)?.[1];

      if (name) {
        entities.push({
          name,
          entityType: entityType || "",
        });
      }
    }
  }

  return entities;
}


/* =========================================================
   TEST 3 — ENTITY SETS
========================================================= */

async function analyzeEntitySets(metadata) {
  separator("TEST 3 — PARSE 1C ENTITY SETS");

  if (!metadata?.text) {
    console.log(
      "❌ Нет metadata для анализа"
    );

    return [];
  }

  const entities =
    parseEntitySets(metadata.text);

  console.log(
    "EntitySet count:",
    entities.length
  );

  if (entities.length === 0) {
    console.log("\n⚠️ ENTITY SETS НЕ НАЙДЕНЫ");

    console.log(
      "\nПервые 2000 символов metadata:"
    );

    console.log(
      metadata.text.slice(0, 2000)
    );

    return [];
  }

  console.log("\nREAL ENTITY SETS FROM 1C:");

  entities.forEach((entity, index) => {
    console.log(
      `${String(index + 1).padStart(3, " ")}. ` +
      `${entity.name}` +
      (
        entity.entityType
          ? `  ->  ${entity.entityType}`
          : ""
      )
    );
  });

  return entities;
}


/* =========================================================
   TEST 4 — READ REAL ENTITY SETS
========================================================= */

async function testRealEntitySets(
  entities
) {
  separator("TEST 4 — READ REAL ENTITY SETS FROM 1C");

  if (!entities.length) {
    console.log(
      "⚠️ Нет EntitySet для тестирования."
    );

    return [];
  }

  /*
    Проверяем максимум первые 10.
  */

  const selected =
    entities.slice(0, 10);

  const results = [];

  for (const entity of selected) {
    console.log("\n------------------------------------------------------------");
    console.log(
      `ENTITY: ${entity.name}`
    );

    /*
      encodeURIComponent нужен для русских имен.
    */

    const url =
      `${ODATA_URL}/${encodeURIComponent(entity.name)}?$top=1`;

    console.log("URL:", url);

    try {
      const {
        response,
        text,
      } = await onecFetch(url);

      let parsed = null;

      try {
        parsed = JSON.parse(text);
      } catch {
        // not JSON
      }

      console.log("\nRESULT:");

      if (parsed) {
        console.dir(
          parsed,
          { depth: 5 }
        );
      } else {
        console.log(
          text.slice(0, 1000)
        );
      }

      results.push({
        entity: entity.name,
        status: response.status,
        ok: response.ok,
        text,
        parsed,
      });
    } catch (error) {
      console.error(
        "ERROR:",
        error.message
      );

      results.push({
        entity: entity.name,
        ok: false,
        error: error.message,
      });
    }
  }

  return results;
}


/* =========================================================
   MCP CONNECT
========================================================= */

async function connectMcp() {
  separator("TEST 5 — CONNECT MCP");

  console.log(
    "MCP URL:",
    MCP_URL
  );

  const client =
    new Client(
      {
        name: "onec-mcp-diagnostic",
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

    console.log(
      "✅ MCP Client подключён"
    );

    return {
      client,
      transport,
    };
  } catch (error) {
    console.error(
      "❌ MCP CONNECT FAILED"
    );

    console.error(error);

    return null;
  }
}


/* =========================================================
   MCP TOOLS
========================================================= */

async function listMcpTools(client) {
  separator("TEST 6 — MCP TOOLS");

  try {
    const result =
      await client.listTools();

    const tools =
      result.tools || [];

    console.log(
      "Количество tools:",
      tools.length
    );

    for (const tool of tools) {
      console.log(
        `- ${tool.name}: ${tool.description || ""}`
      );
    }

    return tools;
  } catch (error) {
    console.error(
      "❌ listTools FAILED:",
      error.message
    );

    return [];
  }
}


/* =========================================================
   MCP TOOL CALL HELPER
========================================================= */

async function callMcpTool(
  client,
  name,
  args = {}
) {
  console.log("\n------------------------------------------------------------");

  console.log(
    `MCP CALL: ${name}`
  );

  console.log(
    "ARGS:",
    JSON.stringify(
      args,
      null,
      2
    )
  );

  try {
    const result =
      await client.callTool({
        name,
        arguments: args,
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
        const item =
          result.content[i];

        console.log(
          `\nCONTENT #${i + 1}`
        );

        console.dir(
          item,
          { depth: null }
        );

        if (
          item.type === "text"
        ) {
          console.log(
            "\nTEXT:"
          );

          console.log(
            item.text
          );
        }
      }
    }

    return result;
  } catch (error) {
    console.error(
      `\n❌ MCP TOOL ERROR: ${name}`
    );

    console.error(error);

    return {
      error,
    };
  }
}


/* =========================================================
   MCP get_metadata
========================================================= */

async function testMcpMetadata(client) {
  separator("TEST 7 — MCP get_metadata");

  return await callMcpTool(
    client,
    "get_metadata",
    {}
  );
}


/* =========================================================
   MCP list_entities
========================================================= */

async function testMcpListEntities(client) {
  separator("TEST 8 — MCP list_entities");

  return await callMcpTool(
    client,
    "list_entities",
    {}
  );
}


/* =========================================================
   PARSE MCP TEXT
========================================================= */

function extractJsonFromMcpResult(result) {
  if (
    !result ||
    !Array.isArray(result.content)
  ) {
    return null;
  }

  for (const item of result.content) {
    if (
      item?.type !== "text" ||
      typeof item.text !== "string"
    ) {
      continue;
    }

    const text =
      item.text.trim();

    try {
      return JSON.parse(text);
    } catch {
      /*
        Иногда MCP может вернуть текст
        вокруг JSON.
      */

      const start =
        text.indexOf("{");

      const end =
        text.lastIndexOf("}");

      if (
        start !== -1 &&
        end !== -1 &&
        end > start
      ) {
        try {
          return JSON.parse(
            text.slice(
              start,
              end + 1
            )
          );
        } catch {
          // ignore
        }
      }
    }
  }

  return null;
}


/* =========================================================
   MCP odata_query
========================================================= */

async function testMcpOdataQuery(
  client,
  entities
) {
  separator("TEST 9 — MCP odata_query");

  if (!entities.length) {
    console.log(
      "⚠️ Нет реальных EntitySet."
    );

    return null;
  }

  const entity =
    entities[0].name;

  console.log(
    "Используем РЕАЛЬНУЮ сущность из 1С:"
  );

  console.log(
    entity
  );

  return await callMcpTool(
    client,
    "odata_query",
    {
      entity,
      top: 1,
    }
  );
}


/* =========================================================
   MCP ENV DIAGNOSTIC
========================================================= */

async function printLocalDiagnostic() {
  separator("TEST 10 — TEST PROCESS DIAGNOSTIC");

  console.log(
    "ВАЖНО: эти env принадлежат test-mcp.mjs."
  );

  console.log(
    "Они НЕ доказывают, что MCP server использует те же env."
  );

  console.log("\nTEST PROCESS:");

  console.log(
    "PID:",
    process.pid
  );

  console.log(
    "CWD:",
    process.cwd()
  );

  console.log(
    "ONEC_BASE_URL:",
    ONEC_BASE_URL
  );

  console.log(
    "ONEC_LOGIN:",
    ONEC_LOGIN
      ? "✅ SET"
      : "❌ MISSING"
  );

  console.log(
    "ONEC_PASSWORD:",
    ONEC_PASSWORD
      ? "✅ SET"
      : "❌ MISSING"
  );
}


/* =========================================================
   MAIN
========================================================= */

async function main() {
  separator("1C + MCP FULL DIAGNOSTIC");

  printEnv();

  await printLocalDiagnostic();

  /*
  ==========================================================
    DIRECT 1C
  ==========================================================
  */

  const root =
    await testOneCRoot();

  const metadata =
    await getMetadataDirect();

  const entities =
    await analyzeEntitySets(
      metadata
    );

  const directResults =
    await testRealEntitySets(
      entities
    );

  /*
  ==========================================================
    MCP
  ==========================================================
  */

  const mcp =
    await connectMcp();

  if (!mcp) {
    separator("FINAL RESULT");

    console.log(
      "❌ MCP не подключился."
    );

    console.log(
      "\nНо прямые тесты 1С уже выполнены."
    );

    process.exitCode = 1;

    return;
  }

  const {
    client,
    transport,
  } = mcp;

  try {
    const tools =
      await listMcpTools(
        client
      );

    /*
      Проверяем наличие нужных tools.
    */

    const toolNames =
      new Set(
        tools.map(
          (tool) => tool.name
        )
      );

    console.log("\nREQUIRED TOOLS:");

    for (
      const name of [
        "get_metadata",
        "list_entities",
        "odata_query",
      ]
    ) {
      console.log(
        `${name}:`,
        toolNames.has(name)
          ? "✅"
          : "❌"
      );
    }

    /*
    ----------------------------------------------------------
      MCP get_metadata
    ----------------------------------------------------------
    */

    const mcpMetadata =
      await testMcpMetadata(
        client
      );

    /*
    ----------------------------------------------------------
      MCP list_entities
    ----------------------------------------------------------
    */

    const mcpEntitiesResult =
      await testMcpListEntities(
        client
      );

    const mcpEntities =
      extractJsonFromMcpResult(
        mcpEntitiesResult
      );

    /*
    ----------------------------------------------------------
      MCP odata_query
    ----------------------------------------------------------
    */

    let mcpOdataResult = null;

    if (
      toolNames.has("odata_query") &&
      entities.length > 0
    ) {
      mcpOdataResult =
        await testMcpOdataQuery(
          client,
          entities
        );
    } else {
      console.log(
        "\n⚠️ odata_query не запускаем:"
      );

      console.log(
        "нет tool или нет EntitySet."
      );
    }

    /*
    ==========================================================
      FINAL DIAGNOSTIC
    ==========================================================
    */

    separator("FINAL DIAGNOSTIC");

    console.log("\nDIRECT 1C:");

    console.log(
      "OData root:",
      root?.ok
        ? "✅"
        : "❌"
    );

    console.log(
      "$metadata:",
      metadata?.ok
        ? "✅"
        : "❌"
    );

    console.log(
      "EntitySets:",
      entities.length
    );

    console.log(
      "Readable EntitySets:",
      directResults.filter(
        (x) => x.ok
      ).length
    );

    console.log("\nMCP:");

    console.log(
      "Connection:",
      "✅"
    );

    console.log(
      "Tools:",
      tools.length
    );

    console.log(
      "get_metadata:",
      toolNames.has("get_metadata")
        ? "✅"
        : "❌"
    );

    console.log(
      "list_entities:",
      toolNames.has("list_entities")
        ? "✅"
        : "❌"
    );

    console.log(
      "odata_query:",
      toolNames.has("odata_query")
        ? "✅"
        : "❌"
    );

    /*
    ==========================================================
      AUTOMATIC CONCLUSION
    ==========================================================
    */

    console.log(
      "\n============================================================"
    );

    console.log(
      "        AUTOMATIC CONCLUSION"
    );

    console.log(
      "============================================================"
    );

    if (!metadata?.ok) {
      console.log(
        "❌ 1С не отдаёт $metadata."
      );

      console.log(
        "Проблему надо искать в URL / авторизации / публикации OData."
      );
    } else if (entities.length === 0) {
      console.log(
        "⚠️ $metadata доступен, но EntitySet не распарсились."
      );

      console.log(
        "Нужно проверить структуру XML и parser MCP."
      );
    } else if (
      mcpEntities &&
      Number(mcpEntities.total) === 0
    ) {
      console.log(
        "🚨 НАЙДЕНА КЛЮЧЕВАЯ ПРОБЛЕМА:"
      );

      console.log(
        "1С напрямую отдаёт EntitySet:"
      );

      console.log(
        `  ${entities.length}`
      );

      console.log(
        "но MCP list_entities возвращает:"
      );

      console.log(
        JSON.stringify(
          mcpEntities,
          null,
          2
        )
      );

      console.log(
        "\nЭто указывает на проблему внутри MCP:"
      );

      console.log(
        "  1. parser $metadata;"
      );

      console.log(
        "  2. URL, который использует MCP;"
      );

      console.log(
        "  3. credentials процесса MCP;"
      );

      console.log(
        "  4. фильтрацию EntitySet;"
      );
    } else if (
      mcpEntities &&
      Number(mcpEntities.total) > 0
    ) {
      console.log(
        "✅ MCP list_entities получает сущности."
      );

      console.log(
        "Проблема list_entities не подтверждается."
      );
    } else {
      console.log(
        "⚠️ MCP вернул результат, который не удалось автоматически разобрать."
      );
    }

    /*
    ==========================================================
      IMPORTANT COMPARISON
    ==========================================================
    */

    console.log(
      "\n============================================================"
    );

    console.log(
      "        DIRECT 1C vs MCP"
    );

    console.log(
      "============================================================"
    );

    console.log(
      "Direct 1C EntitySets:",
      entities.length
    );

    console.log(
      "MCP list_entities:"
    );

    if (mcpEntities) {
      console.log(
        JSON.stringify(
          mcpEntities,
          null,
          2
        )
      );
    } else {
      console.log(
        "❌ MCP result не распознан как JSON"
      );
    }

    /*
    ==========================================================
      FIRST REAL ENTITY
    ==========================================================
    */

    if (entities.length > 0) {
      console.log(
        "\nПервая реальная EntitySet из 1С:"
      );

      console.log(
        entities[0].name
      );

      console.log(
        "\nТеперь мы точно знаем:"
      );

      console.log(
        "не нужно угадывать Catalog_Контрагенты."
      );

      console.log(
        "odata_query можно тестировать на имени,"
        + " которое реально присутствует в $metadata."
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


/* =========================================================
   RUN
========================================================= */

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