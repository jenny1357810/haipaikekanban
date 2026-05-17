const CATEGORIES = ["米粉", "经典果泥", "宝石果泥", "辅食油", "面条"];

const TARGETS = {
  "米粉": { inventory: 15000, avgDiscount: 0.5 },
  "经典果泥": { inventory: 6000, avgDiscount: 0.5 },
  "宝石果泥": { inventory: 2000, avgDiscount: 0.5 },
  "辅食油": { inventory: 500, avgDiscount: 0.5 },
  "面条": { inventory: 500, avgDiscount: 0.5 },
};

const INVENTORY_AXIS_MULTIPLIER = 1.6;
const DISCOUNT_AXIS_MIN = 0.3;
const DISCOUNT_AXIS_MAX = 0.8;
const VALID_DISCOUNT_MIN = 0.2;
const VALID_DISCOUNT_MAX = 1;

const sampleRows = [
  row("2026-04-19", "米粉", "小皮高铁原味有机大米粉160g*48", 1780, 0.571, 64000, "Y", "N", 0, "海拍客"),
  row("2026-04-22", "米粉", "小皮高铁原味有机大米粉160g*48", 1710, 0.549, 69000, "Y", "N", 0, "海拍客"),
  row("2026-04-26", "米粉", "小皮高铁原味有机大米粉160g*48", 1657, 0.532, 65040, "Y", "N", 0, "海拍客"),
  row("2026-04-19", "经典果泥", "小皮经典果泥西梅苹果100g*12", 174, 0.539, 4200, "Y", "N", 0, "宝妈优选铺"),
  row("2026-04-22", "经典果泥", "小皮经典果泥西梅苹果100g*12", 166, 0.514, 5200, "Y", "N", 0, "宝妈优选铺"),
  row("2026-04-26", "经典果泥", "小皮经典果泥西梅苹果100g*12", 169.9, 0.526, 6072, "Y", "N", 0, "海拍客"),
  row("2026-04-19", "宝石果泥", "小皮红宝石果泥85g*12", 125, 0.551, 3900, "Y", "N", 0, "母婴专营店"),
  row("2026-04-22", "宝石果泥", "小皮红宝石果泥85g*12", 121, 0.533, 4600, "Y", "N", 0, "母婴专营店"),
  row("2026-04-26", "宝石果泥", "小皮黄宝石果泥85g*12", 119.4, 0.526, 4860, "Y", "N", 0, "母婴专营店"),
  row("2026-04-19", "辅食油", "小皮核桃油100ml*12", 318, 0.335, 2200, "Y", "N", 0, "海拍客"),
  row("2026-04-22", "辅食油", "小皮亚麻籽油100ml*12", 306.6, 0.323, 2500, "Y", "N", 0, "海拍客"),
  row("2026-04-26", "辅食油", "小皮巴旦木油100ml*12", 485.5, 0.512, 1704, "Y", "N", 0, "海拍客"),
  row("2026-04-19", "面条", "小皮多彩蔬菜面175g*8", 168, 0.447, 0, "N", "Y", 2080, "海拍客"),
  row("2026-04-22", "面条", "小皮多彩蔬菜面175g*8", 161.6, 0.43, 0, "N", "Y", 2240, "海拍客"),
  row("2026-04-26", "面条", "小皮多彩蔬菜面175g*8", 159.9, 0.425, 0, "N", "Y", 2416, "海拍客"),
];

const state = {
  raw: getInitialRows().map(normalizeRecord).filter((item) => CATEGORIES.includes(item.category)),
  filtered: [],
  sourceLabel: window.HIPAC_DATA ? "海拍客已处理数据" : "示例数据",
  filters: { date: "全部", category: "全部" },
};

const els = {
  sourceLabel: document.querySelector("#source-label"),
  recordLabel: document.querySelector("#record-label"),
  importStatus: document.querySelector("#import-status"),
  fileUpload: document.querySelector("#file-upload"),
  dateFilter: document.querySelector("#date-filter"),
  categoryFilter: document.querySelector("#category-filter"),
  resetFilters: document.querySelector("#reset-filters"),
  weeklyTitle: document.querySelector("#weekly-title"),
  freshTrendGrid: document.querySelector("#fresh-trend-grid"),
  weeklyCompare: document.querySelector("#weekly-compare"),
  nearExpiryWatch: document.querySelector("#near-expiry-watch"),
};

init();

function row(date, category, title, price, discount, freshInventory, isFresh, isNearExpiry, nearInventory, shop) {
  return {
    "监测日期": date,
    "品牌": "小皮",
    "大品类": category,
    "标题": title,
    "到手折扣价": price,
    "到手价折扣率": discount,
    "推测库存": freshInventory,
    "是否新鲜货": isFresh,
    "是否临期": isNearExpiry,
    "临期推测库存": nearInventory,
    "店铺名称": shop,
    "在架状态": "在架",
    "链接": "https://detail.hipac.cn/item.html",
  };
}

function getInitialRows() {
  return Array.isArray(window.HIPAC_DATA) && window.HIPAC_DATA.length ? window.HIPAC_DATA : sampleRows;
}

function init() {
  bindEvents();
  populateFilters();
  render();
}

function bindEvents() {
  els.fileUpload.addEventListener("change", handleUpload);
  els.dateFilter.addEventListener("change", (event) => {
    state.filters.date = event.target.value;
    render();
  });
  els.categoryFilter.addEventListener("change", (event) => {
    state.filters.category = event.target.value;
    render();
  });
  els.resetFilters.addEventListener("click", () => {
    state.filters = { date: "全部", category: "全部" };
    populateFilters();
    render();
  });
  els.chartTooltip = createChartTooltip();
  els.freshTrendGrid.addEventListener("pointermove", handleChartTooltip);
  els.freshTrendGrid.addEventListener("pointerleave", hideChartTooltip);
}

async function handleUpload(event) {
  const [file] = event.target.files || [];
  if (!file) return;

  try {
    const rows = await parseUpload(file);
    const normalizedRows = rows.map(normalizeRecord);
    state.raw = normalizedRows.filter((item) => CATEGORIES.includes(item.category));
    state.sourceLabel = rows.sourceLabel || file.name;
    state.filters = { date: "全部", category: "全部" };
    populateFilters();
    render();
    const ignoredCount = normalizedRows.length - state.raw.length;
    els.importStatus.textContent = `导入成功：识别 ${state.raw.length} 条${ignoredCount ? `，未纳入 ${ignoredCount} 条` : ""}`;
  } catch (error) {
    els.importStatus.textContent = `导入失败：${error.message}`;
    window.alert(`导入失败：${error.message}`);
  } finally {
    els.fileUpload.value = "";
  }
}

async function parseUpload(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith(".json")) return JSON.parse(await file.text());
  if (name.endsWith(".csv")) return parseCsv(await file.text());
  if ((name.endsWith(".xlsx") || name.endsWith(".xls")) && !window.XLSX) {
    throw new Error("Excel 导入组件未加载。请确认电脑可以联网，或后续使用离线打包版本。");
  }
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const workbook = window.XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
    const sheetName = workbook.SheetNames.find((item) => item.trim() === "数据源") || workbook.SheetNames[0];
    const rows = window.XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "", raw: false });
    rows.sourceLabel = `${file.name} · ${sheetName}`;
    return rows;
  }
  throw new Error("暂不支持该文件格式");
}

function parseCsv(text) {
  const rows = text.trim().split(/\r?\n/).map((line) => line.split(",").map((cell) => cell.replace(/^"|"$/g, "").trim()));
  const [headers, ...body] = rows;
  return body.map((line) => Object.fromEntries(headers.map((header, index) => [header, line[index] || ""])));
}

function normalizeRecord(item, index = 0) {
  const category = mapCategory(item["大品类"] || item.category || "");
  const isFresh = toFlag(item["是否新鲜货"] ?? item.isFresh);
  const isNearExpiry = toFlag(item["是否临期"] ?? item.isNearExpiry);
  const discount = normalizeDiscount(item["到手价折扣率"] ?? item.discount);
  const unitCount = toNumber(item["件数"] ?? item.unitCount, 0);
  const stockCount = toNumber(item["库存"] ?? item.stockCount, 0);
  const inferredInventory = stockCount * unitCount;
  const freshInventory = toNumber(item["推测库存"] ?? item.freshInventory, inferredInventory || 0);
  const nearInventory = toNumber(item["临期推测库存"] ?? item.nearInventory, isNearExpiry ? freshInventory : 0);
  return {
    id: index + 1,
    date: sanitizeDate(item["监测日期"] || item.date),
    brand: String(item["品牌"] || item.brand || ""),
    category,
    title: String(item["标题"] || item.title || ""),
    shop: String(item["店铺名称"] || item.shop || ""),
    price: toNumber(item["到手折扣价"] ?? item.price, 0),
    discount,
    freshInventory: isFresh ? freshInventory : 0,
    nearInventory: isNearExpiry ? nearInventory : 0,
    isFresh,
    isNearExpiry,
    status: String(item["在架状态"] || item.status || ""),
    link: String(item["链接"] || item.link || ""),
  };
}

function populateFilters() {
  fillSelect(els.dateFilter, ["全部", ...uniqueValues(state.raw, "date")], state.filters.date);
  fillSelect(els.categoryFilter, ["全部", ...CATEGORIES], state.filters.category);
}

function fillSelect(select, values, active) {
  select.innerHTML = values.map((value) => `<option value="${value}">${value}</option>`).join("");
  select.value = values.includes(active) ? active : values[0];
}

function render() {
  state.filtered = getFiltered();
  els.sourceLabel.textContent = state.sourceLabel;
  els.recordLabel.textContent = `${state.filtered.length} 条记录`;
  if (window.HIPAC_DATA && state.raw.length) {
    els.importStatus.textContent = `已加载真实数据：${state.raw.length} 条`;
  }
  if (!state.raw.length) {
    els.importStatus.textContent = "没有识别到可用于看板的数据";
  }
  renderWeeklyCompare();
  renderFreshTrends();
  renderNearExpiry();
}

function getFiltered() {
  return state.raw.filter((item) => {
    return (
      (state.filters.date === "全部" || item.date === state.filters.date) &&
      (state.filters.category === "全部" || item.category === state.filters.category)
    );
  });
}

function renderFreshTrends() {
  const analysisData = getAnalysisData();
  els.freshTrendGrid.innerHTML = CATEGORIES.map((category) => {
    const data = analysisData.filter((item) => item.category === category && item.isFresh);
    const series = buildCategorySeries(data);
    const latest = series[series.length - 1];
    const target = TARGETS[category];
    const inventoryAlert = latest && latest.inventory > target.inventory;
    const avgDiscountAlert = latest && latest.discountCount && latest.avgDiscount < target.avgDiscount;
    const hasAlert = inventoryAlert || avgDiscountAlert;

    return `
      <article class="trend-card ${hasAlert ? "alert" : ""}">
        <div class="card-head">
          <div>
            <h3>${category}</h3>
            <span>${latest ? latest.date : "暂无数据"}</span>
          </div>
          <div class="alert-stack">
            ${inventoryAlert ? "<b>库存超预期</b>" : ""}
            ${avgDiscountAlert ? "<b>平均折扣低于标准</b>" : ""}
          </div>
        </div>
        <div class="metric-pair metric-triplet compact-metrics">
          <div><span>库存</span><strong>${latest ? formatCompact(latest.inventory) : "-"}</strong><small>目标 ${formatCompact(target.inventory)}</small></div>
          <div><span>平均折扣率</span><strong>${latest && latest.discountCount ? formatPercent(latest.avgDiscount) : "-"}</strong><small>标准 ${formatPercent(target.avgDiscount)}</small></div>
          <div><span>最低折扣率</span><strong>${latest && latest.discountCount ? formatPercent(latest.minDiscount) : "-"}</strong><small>仅列示</small></div>
        </div>
        ${renderCombinedTrendChart(series, target)}
      </article>
    `;
  }).join("");
}

function renderWeeklyCompare() {
  const analysisData = getAnalysisData();
  const latestDate = getFocusDate(analysisData);
  const previousDate = getPreviousSamePeriodDate(latestDate);
  const latestRows = analysisData.filter((item) => item.date === latestDate && item.isFresh);
  const previousRows = analysisData.filter((item) => item.date === previousDate && item.isFresh);
  els.weeklyTitle.textContent = `${latestDate} 对比上周同期${previousDate ? `（${previousDate}）` : ""}`;

  const rows = CATEGORIES.map((category) => {
    const now = summarizeFresh(latestRows.filter((item) => item.category === category));
    const previous = summarizeFresh(previousRows.filter((item) => item.category === category));
    return { category, now, previous };
  });

  els.weeklyCompare.innerHTML = `
    <table class="compare-table">
      <thead>
        <tr>
          <th>品类</th>
          <th>最新库存</th>
          <th>较上周同期库存</th>
          <th>最新平均折扣率</th>
          <th>较上周同期折扣率</th>
          <th>最新最低折扣率</th>
          <th>提示</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(({ category, now, previous }) => {
          const target = TARGETS[category];
          const inventoryDiff = now.inventory - previous.inventory;
          const discountDiff = now.discountCount && previous.discountCount ? now.avgDiscount - previous.avgDiscount : 0;
          const alerts = [
            now.inventory > target.inventory ? "库存超预期" : "",
            now.discountCount && now.avgDiscount < target.avgDiscount ? "平均折扣低于标准" : "",
          ].filter(Boolean);
          return `
            <tr>
              <td>${category}</td>
              <td>${formatCompact(now.inventory)}</td>
              <td class="${toneClass(inventoryDiff, true)}">${formatSigned(inventoryDiff, "number")}</td>
              <td>${now.discountCount ? formatPercent(now.avgDiscount) : "-"}</td>
              <td class="${toneClass(discountDiff, false)}">${now.discountCount && previous.discountCount ? formatSigned(discountDiff, "percent") : "-"}</td>
              <td>${now.discountCount ? formatPercent(now.minDiscount) : "-"}</td>
              <td>${alerts.length ? alerts.map((text) => `<span class="tag danger">${text}</span>`).join("") : '<span class="tag ok">正常</span>'}</td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>
  `;
}

function renderNearExpiry() {
  const analysisData = getAnalysisData();
  const latestDate = getFocusDate(analysisData);
  const latestNear = analysisData.filter((item) => item.date === latestDate && item.isNearExpiry);
  const groups = CATEGORIES.map((category) => ({
    category,
    inventory: sum(latestNear.filter((item) => item.category === category).map((item) => item.nearInventory)),
    avgDiscount: average(validDiscounts(latestNear.filter((item) => item.category === category).map((item) => item.discount))),
  }));

  els.nearExpiryWatch.innerHTML = groups.map((item) => `
    <article class="watch-card ${item.inventory > 0 ? "has-risk" : ""}">
      <h3>${item.category}</h3>
      <div><span>库存</span><strong>${formatCompact(item.inventory)}</strong></div>
      <div><span>折扣率</span><strong>${item.avgDiscount ? formatPercent(item.avgDiscount) : "-"}</strong></div>
    </article>
  `).join("");
}

function buildCategorySeries(data) {
  return Object.entries(groupBy(data, "date")).sort((a, b) => a[0].localeCompare(b[0])).map(([date, rows]) => {
    const discounts = validDiscounts(rows.map((item) => item.discount));
    return {
      date,
      inventory: sum(rows.map((item) => item.freshInventory)),
      avgDiscount: average(discounts),
      minDiscount: minValue(discounts),
      discountCount: discounts.length,
    };
  });
}

function renderCombinedTrendChart(series, target) {
  if (!series.length) return '<section class="combo-chart"><p class="empty-state">暂无数据</p></section>';
  const paths = buildCombinedPaths(series, target);

  return `
    <section class="combo-chart">
      <div class="combo-legend">
        <span><i class="bar-key"></i>库存</span>
        <span><i class="inventory-target-key"></i>库存基准</span>
        <span><i class="avg-key"></i>平均折扣率</span>
        <span><i class="min-key"></i>最低折扣率</span>
        <span><i class="discount-target-key"></i>折扣基准</span>
      </div>
      <svg viewBox="0 0 560 220" role="img" aria-label="库存和折扣率趋势组合图">
        <line x1="${paths.left}" x2="${paths.right}" y1="${paths.bottom}" y2="${paths.bottom}" class="axis-line"></line>
        <line x1="${paths.left}" x2="${paths.left}" y1="${paths.top}" y2="${paths.bottom}" class="inventory-axis"></line>
        <line x1="${paths.right}" x2="${paths.right}" y1="${paths.top}" y2="${paths.bottom}" class="discount-axis"></line>
        ${paths.inventoryTicks.map((tick) => `
          <g>
            <line x1="${paths.left}" x2="${paths.right}" y1="${tick.y}" y2="${tick.y}" class="grid-line"></line>
            <text x="${paths.left - 8}" y="${tick.y + 4}" class="axis-label left-axis" text-anchor="end">${formatCompact(tick.value)}</text>
          </g>
        `).join("")}
        ${paths.discountTicks.map((tick) => `
          <text x="${paths.right + 8}" y="${tick.y + 4}" class="axis-label right-axis">${formatPercent(tick.value)}</text>
        `).join("")}
        ${paths.bars.map((bar) => `
          <rect x="${bar.x}" y="${bar.y}" width="${bar.width}" height="${bar.height}" rx="4" class="${bar.overTarget ? "combo-bar over" : "combo-bar"}" data-tooltip="${escapeAttr(bar.tooltip)}"></rect>
        `).join("")}
        <line x1="${paths.left}" x2="${paths.right}" y1="${paths.inventoryTargetY}" y2="${paths.inventoryTargetY}" class="inventory-target-line"></line>
        <line x1="${paths.left}" x2="${paths.right}" y1="${paths.discountTargetY}" y2="${paths.discountTargetY}" class="discount-target-line"></line>
        <path d="${paths.avgLine}" class="avg-discount-line"></path>
        <path d="${paths.minLine}" class="min-discount-line"></path>
        ${paths.points.map((point) => `
          <g class="chart-point-group">
            <circle cx="${point.x}" cy="${point.avgY}" r="4" class="avg-point"></circle>
            <circle cx="${point.x}" cy="${point.minY}" r="4" class="min-point"></circle>
            <circle cx="${point.x}" cy="${point.avgY}" r="12" class="hit-point" data-tooltip="${escapeAttr(point.tooltip)}"></circle>
            <circle cx="${point.x}" cy="${point.minY}" r="12" class="hit-point" data-tooltip="${escapeAttr(point.tooltip)}"></circle>
          </g>
        `).join("")}
      </svg>
      <div class="combo-axis">
        <span>${series[0].date}</span>
        <span>悬停数据点查看日期</span>
        <span>${series[series.length - 1].date}</span>
      </div>
    </section>
  `;
}

function buildCombinedPaths(series, target) {
  const left = 58;
  const right = 500;
  const top = 22;
  const bottom = 172;
  const chartWidth = right - left;
  const chartHeight = bottom - top;
  const maxInventory = getInventoryAxisMax(target.inventory);
  const xFor = (index) => series.length === 1 ? left + chartWidth / 2 : left + (chartWidth * index) / (series.length - 1);
  const inventoryY = (value) => bottom - (clamp(value, 0, maxInventory) / maxInventory) * chartHeight;
  const discountY = (value) => {
    const boundedValue = clamp(value || DISCOUNT_AXIS_MIN, DISCOUNT_AXIS_MIN, DISCOUNT_AXIS_MAX);
    return bottom - ((boundedValue - DISCOUNT_AXIS_MIN) / (DISCOUNT_AXIS_MAX - DISCOUNT_AXIS_MIN)) * chartHeight;
  };
  const barWidth = Math.min(34, chartWidth / Math.max(series.length * 2.5, 1));
  const inventoryTicks = uniqueNumberTicks([0, target.inventory, maxInventory]).map((value) => ({ value, y: inventoryY(value) }));
  const discountTicks = [DISCOUNT_AXIS_MIN, target.avgDiscount, DISCOUNT_AXIS_MAX].map((value) => ({ value, y: discountY(value) }));

  const bars = series.map((item, index) => {
    const x = xFor(index) - barWidth / 2;
    const y = inventoryY(item.inventory);
    return {
      date: item.date,
      x,
      y,
      width: barWidth,
      height: Math.max(bottom - y, 2),
      overTarget: item.inventory > target.inventory,
      tooltip: `${item.date}\n库存 ${formatCompact(item.inventory)}${item.inventory > maxInventory ? "（超出坐标上限）" : ""}\n平均折扣率 ${item.discountCount ? formatPercent(item.avgDiscount) : "-"}\n最低折扣率 ${item.discountCount ? formatPercent(item.minDiscount) : "-"}`,
    };
  });
  const points = series.filter((item) => item.discountCount).map((item) => {
    const index = series.indexOf(item);
    return {
      x: xFor(index),
      avgY: discountY(item.avgDiscount),
      minY: discountY(item.minDiscount),
      tooltip: `${item.date}\n库存 ${formatCompact(item.inventory)}${item.inventory > maxInventory ? "（超出坐标上限）" : ""}\n平均折扣率 ${formatPercent(item.avgDiscount)}\n最低折扣率 ${formatPercent(item.minDiscount)}`,
    };
  });
  const makeLine = (key) => series
    .filter((item) => item.discountCount)
    .map((item, index, validSeries) => {
      const originalIndex = series.indexOf(item);
      return `${index ? "L" : "M"} ${xFor(originalIndex)} ${discountY(item[key])}`;
    })
    .join(" ");

  return {
    left,
    right,
    top,
    bottom,
    bars,
    points,
    inventoryTicks,
    discountTicks,
    inventoryTargetY: inventoryY(target.inventory),
    discountTargetY: discountY(target.avgDiscount),
    avgLine: makeLine("avgDiscount"),
    minLine: makeLine("minDiscount"),
  };
}

function uniqueNumberTicks(values) {
  return [...new Set(values.map((value) => Math.round(value)))].sort((a, b) => a - b);
}

function getInventoryAxisMax(targetInventory) {
  const rawMax = targetInventory * INVENTORY_AXIS_MULTIPLIER;
  const step = rawMax >= 10000 ? 5000 : rawMax >= 1000 ? 500 : 100;
  return Math.ceil(rawMax / step) * step;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function createChartTooltip() {
  const tooltip = document.createElement("div");
  tooltip.className = "chart-tooltip";
  document.body.appendChild(tooltip);
  return tooltip;
}

function handleChartTooltip(event) {
  const target = event.target.closest?.("[data-tooltip]");
  if (!target) {
    hideChartTooltip();
    return;
  }
  els.chartTooltip.textContent = target.dataset.tooltip;
  els.chartTooltip.style.left = `${Math.min(event.clientX + 14, window.innerWidth - 180)}px`;
  els.chartTooltip.style.top = `${event.clientY + 14}px`;
  els.chartTooltip.classList.add("show");
}

function hideChartTooltip() {
  els.chartTooltip?.classList.remove("show");
}

function escapeAttr(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function summarizeFresh(rows) {
  const discounts = validDiscounts(rows.map((item) => item.discount));
  return {
    count: rows.length,
    discountCount: discounts.length,
    inventory: sum(rows.map((item) => item.freshInventory)),
    avgDiscount: average(discounts),
    minDiscount: minValue(discounts),
  };
}

function getPreviousSamePeriodDate(latestDate) {
  if (!latestDate || latestDate === "-") return "";
  const latest = new Date(`${latestDate}T00:00:00`);
  if (Number.isNaN(latest.getTime())) return "";
  latest.setDate(latest.getDate() - 7);
  return formatDateParts(latest.getFullYear(), latest.getMonth() + 1, latest.getDate());
}

function getLatestDate(data) {
  return uniqueValues(data, "date").sort((a, b) => a.localeCompare(b)).at(-1) || "-";
}

function getFocusDate(data) {
  return state.filters.date === "全部" ? getLatestDate(data) : state.filters.date;
}

function getAnalysisData() {
  return state.raw.filter((item) => {
    return state.filters.category === "全部" || item.category === state.filters.category;
  });
}

function mapCategory(value) {
  const text = String(value || "");
  if (text.includes("宝石")) return "宝石果泥";
  if (text.includes("果泥") || text.includes("辅食泥")) return "经典果泥";
  if (text.includes("米粉")) return "米粉";
  if (text.includes("面")) return "面条";
  if (text.includes("油")) return "辅食油";
  return text;
}

function groupBy(data, key) {
  return data.reduce((acc, item) => {
    const value = item[key] || "未分组";
    if (!acc[value]) acc[value] = [];
    acc[value].push(item);
    return acc;
  }, {});
}

function uniqueValues(data, key) {
  return [...new Set(data.map((item) => item[key]).filter(Boolean))];
}

function sum(values) {
  return values.reduce((total, value) => total + (Number(value) || 0), 0);
}

function average(values) {
  const valid = values.filter((value) => Number.isFinite(Number(value)));
  return valid.length ? sum(valid) / valid.length : 0;
}

function minValue(values) {
  const valid = values.map(Number).filter((value) => Number.isFinite(value) && value > 0);
  return valid.length ? Math.min(...valid) : 0;
}

function sanitizeDate(value) {
  if (!value) return "-";
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === "number") {
    const origin = new Date(Date.UTC(1899, 11, 30));
    return new Date(origin.getTime() + value * 86400000).toISOString().slice(0, 10);
  }
  const text = String(value).trim();
  const directMatch = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (directMatch) return formatDateParts(directMatch[1], directMatch[2], directMatch[3]);
  const slashMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashMatch) {
    const year = Number(slashMatch[3]) < 100 ? `20${slashMatch[3]}` : slashMatch[3];
    return formatDateParts(year, slashMatch[1], slashMatch[2]);
  }
  return text.slice(0, 10);
}

function formatDateParts(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function toNumber(value, fallback = 0) {
  if (value === "" || value === undefined || value === null) return fallback;
  const number = Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(number) ? number : fallback;
}

function normalizeDiscount(value) {
  const discount = toNumber(value, NaN);
  return discount >= VALID_DISCOUNT_MIN && discount <= VALID_DISCOUNT_MAX ? discount : null;
}

function validDiscounts(values) {
  return values.filter((value) => Number.isFinite(Number(value)));
}

function toFlag(value) {
  const text = String(value ?? "").trim().toUpperCase();
  return text === "Y" || text === "是" || text === "TRUE" || text === "1";
}

function toneClass(value, higherIsRisk = false) {
  if (!value) return "";
  return value > 0 === higherIsRisk ? "danger-text" : "safe-text";
}

function formatSigned(value, mode) {
  const prefix = value > 0 ? "+" : "";
  const amount = mode === "percent" ? formatPercent(value) : formatCompact(value);
  return `${prefix}${amount}`;
}

function formatCompact(value) {
  return new Intl.NumberFormat("zh-CN", { notation: "compact", maximumFractionDigits: 1 }).format(value || 0);
}

function formatPercent(value) {
  return `${((value || 0) * 100).toFixed(1)}%`;
}

function formatMetric(value, mode) {
  return mode === "percent" ? formatPercent(value) : formatCompact(value);
}
