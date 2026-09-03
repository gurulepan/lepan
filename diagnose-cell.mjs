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

async function callTool(client, name, args = {}) {
  console.log(`\n🔧 Вызов: ${name}`);
  console.log(`   Аргументы:`, JSON.stringify(args, null, 2));
  
  try {
    const result = await client.callTool({
      name,
      arguments: args,
    });
    
    if (result?.isError) {
      console.error(`   ❌ Ошибка:`, result?.content?.[0]?.text || result);
      return null;
    }
    
    if (result?.content?.[0]?.type === "text") {
      try {
        const parsed = JSON.parse(result.content[0].text);
        return parsed;
      } catch {
        return result.content[0].text;
      }
    }
    
    return result;
  } catch (error) {
    console.error(`   ❌ Ошибка вызова:`, error.message);
    return null;
  }
}

async function main() {
  separator("🔍 ПОИСК ТОВАРОВ В ЯЧЕЙКЕ 1-1-2-1");
  
  console.log("\n📡 Подключение к MCP...");
  const client = new Client(
    { name: "check-cell", version: "1.0.0" },
    { capabilities: {} }
  );
  
  const transport = new StreamableHTTPClientTransport(new URL(MCP_URL));
  
  try {
    await client.connect(transport);
    console.log("✅ Подключено");
  } catch (error) {
    console.error("❌ Не удалось подключиться:", error.message);
    process.exit(1);
  }
  
  // ============================================================
  // ШАГ 1 — Находим ячейку 1-1-2-1
  // ============================================================
  separator("ШАГ 1 — ПОИСК ЯЧЕЙКИ 1-1-2-1");
  
  const cellResult = await callTool(client, "get_report", {
    report_url: "/odata/standard.odata/Catalog_СкладскиеЯчейки?$filter=Code eq '1-1-2-1'&$select=Ref_Key,Code,Description,Линия,Стеллаж,Позиция,Ярус"
  });
  
  let cellRefKey = null;
  
  if (cellResult && cellResult.value && Array.isArray(cellResult.value) && cellResult.value.length > 0) {
    const cell = cellResult.value[0];
    cellRefKey = cell.Ref_Key;
    console.log(`\n✅ Ячейка найдена:`);
    console.log(`   Ref_Key: ${cellRefKey}`);
    console.log(`   Code: ${cell.Code}`);
    console.log(`   Description: ${cell.Description}`);
    console.log(`   Линия: ${cell.Линия || 'N/A'}`);
    console.log(`   Стеллаж: ${cell.Стеллаж || 'N/A'}`);
    console.log(`   Позиция: ${cell.Позиция || 'N/A'}`);
    console.log(`   Ярус: ${cell.Ярус || 'N/A'}`);
  } else {
    console.log(`\n❌ Ячейка 1-1-2-1 не найдена`);
    await client.close();
    process.exit(1);
  }
  
  // ============================================================
  // ШАГ 2 — Проверяем регистр ТоварыВЯчейках (без select)
  // ============================================================
  separator("ШАГ 2 — ПРОВЕРКА РЕГИСТРА «ТОВАРЫ В ЯЧЕЙКАХ»");
  
  console.log("\n🔍 Ищем записи по ячейке...");
  
  const registerResult = await callTool(client, "get_report", {
    report_url: `/odata/standard.odata/AccumulationRegister_ТоварыВЯчейках?$filter=Ячейка eq '${cellRefKey}'&$top=20`
  });
  
  if (registerResult && registerResult.value && Array.isArray(registerResult.value) && registerResult.value.length > 0) {
    console.log(`\n✅ Найдено ${registerResult.value.length} записей:`);
    registerResult.value.forEach((record, i) => {
      console.log(`\n   Запись #${i + 1}:`);
      Object.entries(record).forEach(([key, value]) => {
        if (key !== "__metadata" && value !== null && value !== undefined) {
          console.log(`     ${key}: ${JSON.stringify(value)}`);
        }
      });
    });
  } else {
    console.log(`\n❌ В регистре «ТоварыВЯчейках» записей НЕТ`);
    console.log(`   Результат:`, registerResult);
  }
  
  // ============================================================
  // ШАГ 3 — Проверяем регистр ТоварыНаСкладах (без select)
  // ============================================================
  separator("ШАГ 3 — ПРОВЕРКА РЕГИСТРА «ТОВАРЫ НА СКЛАДАХ»");
  
  console.log("\n🔍 Получаем все остатки на складах...");
  
  const stockResult = await callTool(client, "get_report", {
    report_url: "/odata/standard.odata/AccumulationRegister_ТоварыНаСкладах?$top=50"
  });
  
  if (stockResult && stockResult.value && Array.isArray(stockResult.value) && stockResult.value.length > 0) {
    console.log(`\n✅ Найдено ${stockResult.value.length} записей в регистре «ТоварыНаСкладах»:`);
    
    // Показываем первые 10 записей
    stockResult.value.slice(0, 10).forEach((record, i) => {
      console.log(`\n   Запись #${i + 1}:`);
      Object.entries(record).forEach(([key, value]) => {
        if (key !== "__metadata" && value !== null && value !== undefined) {
          console.log(`     ${key}: ${JSON.stringify(value)}`);
        }
      });
    });
    
    // Собираем уникальные GUID товаров
    const productGuids = [...new Set(stockResult.value.map(r => r.Номенклатура_Key).filter(Boolean))];
    console.log(`\n🔍 Найдено ${productGuids.length} уникальных товаров в остатках`);
    
    // Для первых 5 GUID получаем названия
    console.log(`\n📋 Расшифровка номенклатуры:`);
    for (const guid of productGuids.slice(0, 5)) {
      console.log(`\n   Поиск товара с Ref_Key: ${guid}`);
      
      const productResult = await callTool(client, "get_report", {
        report_url: `/odata/standard.odata/Catalog_Номенклатура?$filter=Ref_Key eq guid'${guid}'&$select=Ref_Key,Code,Description`
      });
      
      if (productResult && productResult.value && Array.isArray(productResult.value) && productResult.value.length > 0) {
        const product = productResult.value[0];
        console.log(`   ✅ Найден: Code=${product.Code || 'N/A'}, Description=${product.Description || 'N/A'}`);
        
        // Находим общее количество этого товара
        const totalQuantity = stockResult.value
          .filter(r => r.Номенклатура_Key === guid)
          .reduce((sum, r) => sum + (r.ВНаличии || 0), 0);
        console.log(`   📦 Общее количество на всех складах: ${totalQuantity}`);
      } else {
        console.log(`   ❌ Товар не найден`);
      }
    }
  } else {
    console.log(`\n❌ В регистре «ТоварыНаСкладах» записей НЕТ`);
    console.log(`   Результат:`, stockResult);
  }
  
  // ============================================================
  // ШАГ 4 — Поиск товара по части названия (без contains)
  // ============================================================
  separator("ШАГ 4 — ПОИСК ТОВАРА ПО ТОЧНОМУ НАЗВАНИЮ");
  
  // Получаем все товары и ищем вручную
  console.log("\n🔍 Получаем все товары для поиска...");
  
  const allProducts = await callTool(client, "get_report", {
    report_url: "/odata/standard.odata/Catalog_Номенклатура?$top=100&$select=Ref_Key,Code,Description"
  });
  
  if (allProducts && allProducts.value && Array.isArray(allProducts.value) && allProducts.value.length > 0) {
    console.log(`\n✅ Найдено ${allProducts.value.length} товаров`);
    
    // Ищем товары с "винт" в названии (регистронезависимо)
    const searchTerm = "Винт".toLowerCase();
    const found = allProducts.value.filter(item => 
      item.Description && item.Description.toLowerCase().includes(searchTerm)
    );
    
    if (found.length > 0) {
      console.log(`\n🔍 Найдено ${found.length} товаров с "Винт" в названии:`);
      found.forEach((item, i) => {
        console.log(`   #${i + 1}: Code=${item.Code || 'N/A'}, Description=${item.Description || 'N/A'}, Ref_Key=${item.Ref_Key}`);
      });
    } else {
      console.log(`\n❌ Товары с "Винт" не найдены среди ${allProducts.value.length} товаров`);
      
      // Показываем первые 10 товаров для примера
      console.log(`\n📋 Примеры товаров в системе:`);
      allProducts.value.slice(0, 10).forEach((item, i) => {
        console.log(`   #${i + 1}: Code=${item.Code || 'N/A'}, Description=${item.Description || 'N/A'}`);
      });
    }
  } else {
    console.log(`\n❌ Не удалось получить список товаров`);
  }
  
  await client.close();
  console.log("\n✅ Диагностика завершена");
}

main().catch((error) => {
  console.error("\n❌ Ошибка:", error);
  process.exit(1);
});