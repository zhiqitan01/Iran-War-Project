/**
 * price-charts.js — 物价页共享图表与数据模型（无副作用）
 *
 * 命名空间 window.PriceCharts，供数据版 price.js 与故事版 price-story.js 共用，
 * 避免两份数据/两套图表逻辑。所有渲染函数接收显式的容器元素，方便多处挂载。
 *
 * 经济学框架：
 * 1. Event study：以 2026 年 2 月为基期，比较战争前后价格曲线（幅度）。
 * 2. 反应速度时间轴：谁先动谁后动（节奏 / 滞后）。
 * 3. Pass-through / Cost share：上游冲击如何流向终端账单（结构 / 路径）。
 */

window.PriceCharts = (function () {
  const colors = {
    accent: '#2aa198',
    amber: '#e8a838',
    red: '#d64030',
    blue: '#6aa6ff',
    purple: '#b887ff',
    green: '#77c46b',
  };
  const { accent, amber, red, blue, purple, green } = colors;

  function createPriceModel() {
    return {
      baselineMonth: '2026-02',
      baselineIdx: 1,
      warStartIdx: 2,
      provisionalIdx: 5,
      months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      events: [
        { month: 'Feb', label: '战前基线' },
        { month: 'Mar', label: '开战/首个交易日' },
        { month: 'Apr', label: '化肥重新定价' },
        { month: 'Jun', label: '风险溢价回落' },
      ],
      series: [
        {
          id: 'brent',
          name: 'Brent 原油',
          unit: '$/bbl',
          color: red,
          source: 'World Bank Pink Sheet',
          values: [66.8, 71.1, 103.7, 120.4, 107.5, 85.4],
          note: '月均价；用于展示能源冲击的第一波反应。',
        },
        {
          id: 'ttf',
          name: '欧洲天然气',
          unit: '$/mmBtu',
          color: blue,
          source: 'World Bank Pink Sheet',
          values: [11.76, 11.24, 17.91, 15.41, 16.17, 15.0],
          note: '欧洲天然气基准；气价同时影响电力和化肥。',
        },
        {
          id: 'japanLNG',
          name: '日本 LNG',
          unit: '$/mmBtu',
          color: purple,
          source: 'World Bank Pink Sheet',
          values: [11.49, 11.32, 11.42, 15.65, 15.77, 15.2],
          note: '亚洲 LNG 进口成本代理，适合解释日韩能源账单。',
        },
        {
          id: 'urea',
          name: '尿素',
          unit: '$/mt',
          color: accent,
          source: 'World Bank Pink Sheet',
          values: [415.4, 472.0, 725.6, 856.9, 770.5, 602.6],
          note: '氮肥价格；农业投入端先于食品端反应。',
        },
        {
          id: 'dap',
          name: 'DAP',
          unit: '$/mt',
          color: amber,
          source: 'World Bank Pink Sheet',
          values: [619.2, 626.5, 658.3, 725.3, 769.5, 720.0],
          note: '磷肥价格；反映化肥冲击并非只集中在尿素。',
        },
        {
          id: 'fao',
          name: 'FAO 食品指数',
          unit: 'index',
          color: green,
          source: 'FAO Food Price Index',
          values: [126.8, 127.2, 130.3, 130.7, 130.9, 130.0],
          note: '国际食品商品价格，不等于居民超市小票。',
        },
        {
          id: 'gasCpi',
          name: '美国汽油 CPI',
          unit: 'index',
          color: '#ff7d57',
          source: 'BLS/FRED',
          values: [274.547, 276.754, 335.5, 353.74, 378.66, 371.0],
          note: '消费者端汽油价格，适合展示油价到加油站的直接传导。',
        },
      ],
      lagRows: [
        {
          price: '原油/期货',
          first: '当天到数日',
          lag: '0-1 周',
          channel: '金融市场和现货合约即时重估',
          evidence: 'Brent 2 月到 4 月从 71.1 到 120.4 美元/桶',
          receipt: '汽油、柴油、能源股',
          confidence: '高',
        },
        {
          price: '天然气/LNG',
          first: '当天到数周',
          lag: '1-8 周',
          channel: '进口合同、现货 LNG、发电燃料成本',
          evidence: '欧洲气价 3 月月均较 2 月约 +59%',
          receipt: '电费、工业成本、化肥',
          confidence: '中高',
        },
        {
          price: '战争险/运费',
          first: '数日到数周',
          lag: '1-3 月',
          channel: '保险、绕行、船燃和合约运费',
          evidence: '战争险由约 0.25% 升至 1%-1.5%',
          receipt: '进口品、快递、制造业中间品',
          confidence: '中',
        },
        {
          price: '化肥',
          first: '2-8 周',
          lag: '3-18 月',
          channel: '天然气/氨/尿素成本进入下一季种植',
          evidence: '尿素 4 月较 2 月约 +82%',
          receipt: '农户成本、政府补贴、食品价格',
          confidence: '中高',
        },
        {
          price: '食品/普通 CPI',
          first: '数月后',
          lag: '4-18 月',
          channel: '库存、播种季、批发、零售和消费篮子权重',
          evidence: 'World Bank 非洲研究显示商品价格传导可延续到 18 个月',
          receipt: '超市小票、餐桌价格',
          confidence: '中',
        },
      ],
      formulas: {
        oilCostShare: 0.57,
        usBaseGas: 2.983,
        usBaseOil: 72,
        chinaBaseTank: 384.5,
        chinaPassThrough: 0.17,
        indiaBaseFertilizerBill: 2150,
        indiaFiscalShock: 350000000000,
        breadOld: 42000,
        breadNew: 81000,
      },
    };
  }

  const eventGroups = [
    { title: '上游能源', tag: 'energy', ids: ['brent', 'ttf', 'japanLNG'], color: red },
    { title: '农业投入', tag: 'input', ids: ['urea', 'dap'], color: accent },
    { title: '下游消费端', tag: 'downstream', ids: ['fao', 'gasCpi'], color: green },
  ];

  function injectStyles() {
    if (document.getElementById('price-charts-styles')) return;
    const style = document.createElement('style');
    style.id = 'price-charts-styles';
    style.textContent = `
      .price-page {
        --price-accent: ${accent};
        --price-amber: ${amber};
        --price-risk: ${red};
        --price-blue: ${blue};
      }
      .price-hero {
        position: relative;
        overflow: hidden;
        background:
          radial-gradient(circle at 82% 24%, rgba(214,64,48,0.18), transparent 30%),
          radial-gradient(circle at 16% 72%, rgba(42,161,152,0.16), transparent 26%),
          linear-gradient(120deg, rgba(42,161,152,0.10), transparent 48%),
          var(--bg);
      }
      .price-hero::after {
        content: '';
        position: absolute;
        inset: 0;
        pointer-events: none;
        background:
          linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px),
          linear-gradient(0deg, rgba(255,255,255,0.025) 1px, transparent 1px);
        background-size: 78px 78px;
        mask-image: linear-gradient(to bottom, rgba(0,0,0,0.85), transparent 82%);
      }
      .price-hero .subpage-hero-inner { position: relative; z-index: 1; }
      .price-kicker {
        margin-top: 0.5rem;
        font-family: var(--font-mono);
        font-size: 0.72rem;
        letter-spacing: 0.16em;
        color: ${accent};
        text-transform: uppercase;
      }
      .price-hero-claim {
        display: grid;
        gap: 0.35rem;
        max-width: 760px;
        margin-top: 1.6rem;
        padding: 1rem 1.1rem;
        border-left: 2px solid ${accent};
        background: rgba(36,36,50,0.62);
      }
      .price-hero-claim span,
      .price-sources span,
      .source-chip,
      .mini-label {
        font-family: var(--font-mono);
        font-size: 0.62rem;
        letter-spacing: 0.14em;
        color: var(--text-muted);
        text-transform: uppercase;
      }
      .price-hero-claim strong {
        font-family: var(--font-display);
        font-size: 1.12rem;
        line-height: 1.55;
        color: #fff;
      }
      .price-guide {
        display: grid;
        grid-template-columns: minmax(300px, 0.42fr) minmax(520px, 1fr);
        gap: 1.4rem;
        align-items: stretch;
      }
      .price-guide-copy {
        display: grid;
        align-content: center;
        gap: 0.75rem;
        padding: 1.4rem;
        border-left: 2px solid ${accent};
        background: linear-gradient(135deg, rgba(42,161,152,0.10), transparent 48%), var(--bg-card);
      }
      .price-guide-copy h2 {
        font-family: var(--font-display);
        font-size: clamp(1.55rem, 2.8vw, 2.35rem);
        line-height: 1.18;
        color: #fff;
      }
      .price-guide-copy p {
        color: var(--text-muted);
        font-size: 0.92rem;
        line-height: 1.8;
      }
      .price-guide-steps {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 1px;
        background: var(--border);
        border: 1px solid var(--border);
      }
      .price-guide-steps div {
        min-height: 210px;
        display: grid;
        align-content: start;
        gap: 0.6rem;
        padding: 1.2rem;
        background: linear-gradient(145deg, rgba(255,255,255,0.035), transparent 42%), var(--bg-card);
      }
      .price-guide-steps span {
        font-family: var(--font-mono);
        font-size: 0.64rem;
        letter-spacing: 0.14em;
        color: ${accent};
      }
      .price-guide-steps strong {
        font-family: var(--font-display);
        font-size: 1.2rem;
        color: #fff;
      }
      .price-guide-steps p {
        color: var(--text-muted);
        font-size: 0.82rem;
        line-height: 1.7;
      }
      .chart-card,
      .price-panel {
        width: 100%;
        display: grid;
        gap: 1rem;
      }
      .baseline-board {
        display: grid;
        grid-template-columns: 1.1fr 0.9fr;
        gap: 1rem;
      }
      .route-map,
      .science-card,
      .baseline-card,
      .method-note,
      .receipt-card {
        border: 1px solid rgba(255,255,255,0.10);
        background: linear-gradient(145deg, rgba(255,255,255,0.04), transparent 48%), var(--bg-card);
      }
      .route-map {
        position: relative;
        min-height: 430px;
        overflow: hidden;
        border-color: rgba(42,161,152,0.24);
        background:
          radial-gradient(circle at 27% 46%, rgba(42,161,152,0.20), transparent 10%),
          radial-gradient(circle at 64% 52%, rgba(214,64,48,0.18), transparent 12%),
          radial-gradient(circle at 80% 38%, rgba(232,168,56,0.14), transparent 10%),
          linear-gradient(145deg, rgba(255,255,255,0.04), transparent 48%),
          var(--bg-card);
      }
      .route-map::before {
        content: '';
        position: absolute;
        inset: 18px;
        border: 1px dashed rgba(255,255,255,0.08);
      }
      .route-node {
        position: absolute;
        display: grid;
        gap: 0.2rem;
        width: 168px;
        padding: 0.8rem;
        border: 1px solid rgba(255,255,255,0.12);
        background: rgba(21,22,32,0.82);
        box-shadow: 0 18px 40px rgba(0,0,0,0.22);
      }
      .route-node strong,
      .science-card h3,
      .receipt-card h3,
      .method-note strong {
        font-family: var(--font-display);
        color: #fff;
      }
      .route-node small,
      .baseline-card p,
      .science-card p,
      .receipt-card p,
      .method-note p,
      .lag-table td {
        color: var(--text-muted);
        line-height: 1.62;
      }
      .route-node b {
        font-family: var(--font-mono);
        color: var(--node-color, ${accent});
      }
      .route-node.iran { left: 12%; top: 34%; --node-color: ${red}; }
      .route-node.hormuz { left: 40%; top: 42%; --node-color: ${accent}; }
      .route-node.asia { right: 8%; top: 22%; --node-color: ${amber}; }
      .route-node.fertilizer { right: 11%; bottom: 14%; --node-color: ${blue}; }
      .route-line {
        position: absolute;
        height: 2px;
        transform-origin: left center;
        background: linear-gradient(90deg, rgba(42,161,152,0), var(--line-color), rgba(42,161,152,0));
      }
      .route-line.one { left: 29%; top: 46%; width: 20%; transform: rotate(8deg); --line-color: ${red}; }
      .route-line.two { left: 53%; top: 43%; width: 30%; transform: rotate(-18deg); --line-color: ${amber}; }
      .route-line.three { left: 54%; top: 57%; width: 27%; transform: rotate(18deg); --line-color: ${blue}; }
      .baseline-side {
        display: grid;
        gap: 0.8rem;
      }
      .baseline-card {
        min-height: 132px;
        display: grid;
        gap: 0.3rem;
        align-content: center;
        padding: 1rem;
      }
      .baseline-card b {
        font-family: var(--font-display);
        font-size: clamp(1.7rem, 3.5vw, 2.6rem);
        line-height: 1;
        color: var(--card-color, ${accent});
      }
      .baseline-card strong { color: #fff; }
      .baseline-card p,
      .science-card p,
      .receipt-card p,
      .method-note p {
        margin: 0;
        font-size: 0.8rem;
      }
      .event-study {
        display: grid;
        gap: 0.95rem;
      }
      .event-study-top {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 230px;
        gap: 1rem;
      }
      .curve-wrap {
        border: 1px solid rgba(255,255,255,0.10);
        background: rgba(255,255,255,0.025);
        padding: 0.8rem;
        overflow-x: auto;
      }
      .curve-svg {
        width: 100%;
        min-width: 680px;
        height: auto;
        display: block;
      }
      .curve-grid {
        stroke: rgba(255,255,255,0.08);
        stroke-width: 1;
      }
      .curve-axis {
        stroke: rgba(255,255,255,0.18);
        stroke-width: 1;
      }
      .curve-line {
        fill: none;
        stroke-width: 2.6;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      .curve-dot {
        stroke: var(--bg);
        stroke-width: 1.5;
      }
      .curve-label {
        font-family: var(--font-mono);
        font-size: 10px;
        fill: rgba(237,233,224,0.74);
      }
      .event-line {
        stroke: rgba(255,255,255,0.22);
        stroke-dasharray: 4 5;
      }
      .event-label {
        font-family: var(--font-mono);
        font-size: 9px;
        fill: rgba(237,233,224,0.56);
      }
      .block-intro {
        max-width: 78ch;
        margin-bottom: 1.1rem;
      }
      .block-intro p {
        color: var(--text-muted);
        font-size: 0.95rem;
        line-height: 1.85;
        margin: 0 0 0.7rem;
      }
      .reaction-block {
        border: 1px solid rgba(255,255,255,0.10);
        background: rgba(255,255,255,0.025);
        padding: 0.9rem 1rem 0.6rem;
      }
      .reaction-head .mini-label { color: ${amber}; }
      .reaction-head p {
        margin: 0.3rem 0 0.6rem;
        color: var(--text-muted);
        font-size: 0.82rem;
        line-height: 1.7;
      }
      .reaction-svg {
        width: 100%;
        min-width: 640px;
        height: auto;
        display: block;
      }
      .reaction-grid { stroke: rgba(255,255,255,0.06); stroke-width: 1; }
      .reaction-war { stroke: ${red}; stroke-width: 1.4; stroke-dasharray: 4 4; }
      .reaction-war-label { font-family: var(--font-mono); font-size: 9px; fill: ${red}; }
      .reaction-track { stroke: rgba(255,255,255,0.10); stroke-width: 1; }
      .reaction-bar { stroke-width: 3.4; stroke-linecap: round; opacity: 0.85; }
      .reaction-first { stroke: var(--bg); stroke-width: 1.5; }
      .reaction-name {
        font-family: var(--font-serif);
        font-size: 11px;
        fill: rgba(237,233,224,0.9);
      }
      .reaction-pct { font-family: var(--font-mono); font-size: 11px; }
      .small-multiples {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 0.8rem;
      }
      .mini-panel {
        border: 1px solid rgba(255,255,255,0.10);
        border-top: 2px solid var(--card-color, ${accent});
        background: rgba(255,255,255,0.025);
        padding: 0.7rem 0.7rem 0.5rem;
      }
      .mini-panel header { margin-bottom: 0.35rem; }
      .mini-legend {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-top: 0.3rem;
        font-size: 0.68rem;
        color: var(--text-muted);
      }
      .mini-legend span { display: inline-flex; align-items: center; gap: 0.3rem; }
      .mini-legend i { width: 9px; height: 9px; border-radius: 2px; display: inline-block; }
      .mini-svg { width: 100%; height: auto; display: block; }
      .mini-endlabel { font-family: var(--font-mono); font-size: 10px; text-anchor: end; }
      .base-100 { stroke: rgba(255,255,255,0.18); stroke-dasharray: 2 3; }
      .curve-dot.provisional { fill: var(--bg); stroke-width: 1.6; }
      .curve-legend,
      .method-grid,
      .control-grid,
      .receipt-grid,
      .country-grid,
      .chain-stack {
        display: grid;
        gap: 0.75rem;
      }
      .curve-legend {
        align-content: start;
      }
      .legend-item {
        display: grid;
        grid-template-columns: 12px 1fr auto;
        gap: 0.48rem;
        align-items: center;
        font-size: 0.74rem;
        color: var(--text-muted);
      }
      .legend-item i {
        width: 10px;
        height: 10px;
        background: var(--legend-color);
      }
      .legend-item strong {
        color: #fff;
        font-weight: 600;
      }
      .curve-insight {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 0.75rem;
      }
      .science-card {
        padding: 1rem;
        display: grid;
        gap: 0.55rem;
        border-left: 2px solid var(--card-color, ${accent});
      }
      .science-card b {
        font-family: var(--font-display);
        color: var(--card-color, ${accent});
        font-size: 1.35rem;
      }
      .lag-table-wrap {
        overflow-x: auto;
        border: 1px solid rgba(255,255,255,0.10);
      }
      .lag-table {
        width: 100%;
        min-width: 720px;
        border-collapse: collapse;
        background: rgba(255,255,255,0.025);
      }
      .lag-table th,
      .lag-table td {
        padding: 0.76rem 0.82rem;
        border-bottom: 1px solid rgba(255,255,255,0.08);
        text-align: left;
        vertical-align: top;
        font-size: 0.76rem;
      }
      .lag-table th {
        font-family: var(--font-mono);
        font-size: 0.62rem;
        letter-spacing: 0.12em;
        color: rgba(237,233,224,0.72);
        text-transform: uppercase;
      }
      .lag-table td:first-child {
        color: #fff;
        font-weight: 700;
      }
      .speed-pill,
      .country-chip,
      .receipt-deficit {
        width: fit-content;
        padding: 0.3rem 0.5rem;
        border: 1px solid rgba(255,255,255,0.12);
        color: #fff;
        font-family: var(--font-mono);
        font-size: 0.68rem;
        background: rgba(255,255,255,0.045);
      }
      .chain-card {
        display: grid;
        grid-template-columns: 0.9fr 1fr 0.8fr;
        gap: 0.8rem;
        align-items: stretch;
      }
      .chain-flow {
        display: flex;
        align-items: center;
        gap: 0.45rem;
        color: var(--text);
        font-family: var(--font-mono);
        font-size: 0.66rem;
        line-height: 1.45;
      }
      .chain-flow span {
        padding: 0.42rem 0.5rem;
        background: rgba(255,255,255,0.055);
        border: 1px solid rgba(255,255,255,0.08);
      }
      .chain-flow i {
        flex: 0 0 18px;
        height: 1px;
        background: var(--line-color, ${accent});
      }
      .chain-metric {
        display: grid;
        align-content: center;
        gap: 0.2rem;
        padding-left: 0.8rem;
        border-left: 1px solid rgba(255,255,255,0.12);
      }
      .chain-metric b {
        font-family: var(--font-display);
        color: var(--line-color, ${accent});
        font-size: 1.35rem;
      }
      .country-grid {
        grid-template-columns: repeat(5, minmax(160px, 1fr));
      }
      .country-card {
        min-height: 245px;
        align-content: start;
      }
      .interactive-model {
        display: grid;
        grid-template-columns: 310px minmax(0, 1fr);
        gap: 1rem;
      }
      .control-panel {
        padding: 1rem;
      }
      .control-grid {
        gap: 1rem;
      }
      .control-row {
        display: grid;
        gap: 0.45rem;
      }
      .control-row label {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        font-family: var(--font-mono);
        font-size: 0.68rem;
        color: var(--text-muted);
      }
      .control-row output {
        color: #fff;
      }
      .control-row input[type="range"] {
        width: 100%;
        accent-color: ${accent};
      }
      .control-help {
        color: var(--text-muted);
        line-height: 1.65;
        font-size: 0.76rem;
      }
      .receipt-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .receipt-card {
        display: grid;
        gap: 0.75rem;
        padding: 1rem;
        min-height: 225px;
        border-left: 2px solid var(--card-color, ${red});
      }
      .receipt-row {
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        gap: 0.55rem;
        align-items: end;
      }
      .receipt-old {
        color: var(--text-muted);
        font-family: var(--font-mono);
        text-decoration: line-through;
        font-size: 0.86rem;
      }
      .receipt-new {
        font-family: var(--font-display);
        color: var(--card-color, ${red});
        font-size: 1.72rem;
        line-height: 1;
      }
      .receipt-row i {
        width: 24px;
        height: 1px;
        margin-bottom: 0.45rem;
        background: rgba(255,255,255,0.22);
      }
      .receipt-deficit {
        color: #fff;
        background: var(--card-color, ${red});
        border: 0;
      }
      .shock-readout {
        display: flex;
        flex-wrap: wrap;
        gap: 0.6rem;
        margin-top: 0.75rem;
        padding-top: 0.7rem;
        border-top: 1px solid rgba(255,255,255,0.10);
        font-size: 0.76rem;
        color: var(--text-muted);
      }
      .shock-readout b {
        font-family: var(--font-mono);
        color: ${amber};
      }
      .receipt-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.5rem;
      }
      .receipt-tag {
        font-family: var(--font-mono);
        font-size: 0.6rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        padding: 0.16rem 0.42rem;
        border: 1px solid var(--card-color, ${red});
        color: var(--card-color, ${red});
        white-space: nowrap;
      }
      .receipt-tag.is-local {
        border-style: dashed;
        border-color: rgba(255,255,255,0.4);
        color: var(--text-muted);
      }
      .receipt-local {
        border-style: dashed;
      }
      .method-note {
        padding: 0.9rem 1rem;
        border-left: 2px solid var(--note-color, ${amber});
      }
      .method-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .price-sources {
        display: flex;
        flex-wrap: wrap;
        gap: 0.65rem;
        align-items: center;
        padding: 1rem 0 2rem;
      }
      .price-sources a {
        color: var(--text-muted);
        border: 1px solid var(--border);
        padding: 0.45rem 0.65rem;
        text-decoration: none;
        font-size: 0.78rem;
      }
      .price-sources a:hover {
        color: #fff;
        border-color: ${accent};
      }
      .receipt-layout {
        display: grid;
        grid-template-columns: minmax(260px, 0.32fr) 1fr;
        gap: 1rem;
        align-items: start;
      }
      .receipt-copy {
        padding: 1rem;
        border-left: 2px solid ${amber};
        background: rgba(232,168,56,0.055);
      }
      .receipt-copy p {
        color: var(--text-muted);
        line-height: 1.8;
        font-size: 0.86rem;
      }
      .source-note {
        margin-top: 0.85rem;
        color: var(--text-muted);
        font-size: 0.76rem;
        line-height: 1.65;
      }
      @media (max-width: 1100px) {
        .price-guide,
        .baseline-board,
        .event-study-top,
        .receipt-layout,
        .interactive-model {
          grid-template-columns: 1fr;
        }
        .country-grid,
        .receipt-grid,
        .curve-insight,
        .method-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .chain-card {
          grid-template-columns: 1fr;
        }
      }
      @media (max-width: 720px) {
        .price-guide-steps,
        .country-grid,
        .receipt-grid,
        .curve-insight,
        .small-multiples,
        .method-grid {
          grid-template-columns: 1fr;
        }
        .route-map {
          min-height: 620px;
        }
        .route-node {
          position: relative;
          left: auto !important;
          right: auto !important;
          top: auto !important;
          bottom: auto !important;
          width: auto;
          margin: 0.8rem;
        }
        .route-line {
          display: none;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function baselineHTML(model) {
    return `
      <div class="baseline-board">
        <div class="route-map" aria-label="战前价格系统路线图">
          <div class="route-line one"></div>
          <div class="route-line two"></div>
          <div class="route-line three"></div>
          <div class="route-node iran">
            <span class="mini-label">Iran oil</span>
            <strong>伊朗原油/凝析油</strong>
            <b>1.576 mb/d</b>
            <small>2025 年出口估计，其中约 99.4% 流向中国。</small>
          </div>
          <div class="route-node hormuz">
            <span class="mini-label">Strait</span>
            <strong>霍尔木兹海峡</strong>
            <b>20.9 mb/d</b>
            <small>2025 上半年油类流量；另有 11.4 Bcf/d LNG。</small>
          </div>
          <div class="route-node asia">
            <span class="mini-label">Asia exposure</span>
            <strong>亚洲进口国</strong>
            <b>89%</b>
            <small>霍尔木兹原油/凝析油主要去亚洲，中印日韩合计 74%。</small>
          </div>
          <div class="route-node fertilizer">
            <span class="mini-label">Fertilizer</span>
            <strong>海湾化肥通道</strong>
            <b>尿素 / 氨 / 硫</b>
            <small>这条线解释为什么战争不只影响油箱，也影响下一季农田。</small>
          </div>
        </div>
        <div class="baseline-side">
          ${[
            ['EIA SHIP Act', '99.4%', '伊朗油几乎流向中国', '这解释了为什么“中国炼厂/成品油/化工链”是直接暴露，而美国不是直接买伊朗油。', red],
            ['EIA chokepoints', '89%', '霍尔木兹原油/凝析油去亚洲', '中、印、日、韩是这条通道上的核心买方，亚洲不是背景，而是价格冲击主场。', amber],
            ['World Bank baseline', '$69', '2025 年 Brent 年均价', '后面讲 72 到 118 美元/桶的跳涨，要先让读者知道战前油价基线。', accent],
          ].map(([label, value, title, copy, color]) => `
            <article class="baseline-card" style="--card-color:${color}">
              <span class="mini-label">${label}</span>
              <b>${value}</b>
              <strong>${title}</strong>
              <p>${copy}</p>
            </article>
          `).join('')}
        </div>
      </div>
      ${methodNote('Leontief price model inspiration', '这张图不是完整投入产出矩阵，而是用投入产出价格模型的思想组织冲击入口：能源、LNG、化肥和航运先成为上游成本，再向下游价格扩散。', accent)}
    `;
  }

  function renderBaseline(container, model) {
    if (!container) return;
    container.classList.add('chart-card');
    container.innerHTML = baselineHTML(model);
  }

  function computeReaction(model, series) {
    const base = series.values[model.baselineIdx];
    let firstMoveIdx = null;
    for (let i = model.warStartIdx; i < series.values.length; i++) {
      if ((series.values[i] - base) / base >= 0.10) { firstMoveIdx = i; break; }
    }
    let peakIdx = model.baselineIdx;
    for (let i = 0; i < series.values.length; i++) {
      if (series.values[i] > series.values[peakIdx]) peakIdx = i;
    }
    const peakChg = (series.values[peakIdx] - base) / base;
    return { firstMoveIdx, peakIdx, peakChg };
  }

  function eventStudyHTML(model) {
    return `
      <div class="event-study">
        <div class="reaction-block">
          <div class="reaction-head">
            <span class="mini-label">反应速度时间轴 · 谁先动</span>
            <p>横轴是月份，每一行是一种价格。圆点＝相对 2 月首次涨过 +10% 的月份，菱形＝到目前为止的高点。行按“先动”排序：越靠上，反应越快。</p>
          </div>
          ${buildReactionTimeline(model)}
        </div>
        <div class="small-multiples">
          ${eventGroups.map(group => buildGroupPanel(model, group)).join('')}
        </div>
        <div class="curve-insight">
          ${[
            ['最快', '油/气 当月', 'Brent、天然气在开战当月就跳过 +10%，金融和现货市场即时重估。', red],
            ['居中', '化肥 1-2 月', '尿素、DAP 滞后 1-2 个月才见顶，成本要先进入下一季种植。', accent],
            ['最慢', '食品/CPI', 'FAO 食品和汽油 CPI 幅度更平、见顶更晚——当天油价解释不了当天超市小票。', green],
          ].map(([label, value, copy, color]) => scienceCard(label, value, copy, color)).join('')}
        </div>
        ${methodNote('方法：Event Study + 分组 small multiples', '以 2026 年 2 月 = 100 指数化后，按“上游能源 / 农业投入 / 下游消费端”分三屏比较，避免七条不同单位的线挤在一张图里。曲线比较的是反应速度而非严格因果系数。Brent、气价、尿素、DAP 来自 World Bank Pink Sheet；FAO 食品指数来自 FAO；美国汽油 CPI 来自 BLS/FRED。虚线圈标注的 6 月点为初步/估计值。', amber)}
      </div>
    `;
  }

  function renderEventStudy(container, model) {
    if (!container) return;
    container.classList.add('chart-card');
    container.innerHTML = eventStudyHTML(model);
  }

  function buildReactionTimeline(model) {
    const width = 840;
    const padL = 132, padR = 96, padT = 34, rowH = 34;
    const rows = model.series
      .map(s => ({ ...s, ...computeReaction(model, s) }))
      .sort((a, b) => (a.firstMoveIdx ?? 99) - (b.firstMoveIdx ?? 99) || a.peakIdx - b.peakIdx);
    const height = padT + rows.length * rowH + 16;
    const x = idx => padL + (idx / (model.months.length - 1)) * (width - padL - padR);
    const warX = x(model.warStartIdx);

    return `
      <svg class="reaction-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="价格反应速度时间轴">
        ${model.months.map((month, idx) => `
          <text class="curve-label" text-anchor="middle" x="${x(idx)}" y="${padT - 12}">${month}</text>
          <line class="reaction-grid" x1="${x(idx)}" y1="${padT}" x2="${x(idx)}" y2="${height - 12}"></line>
        `).join('')}
        <line class="reaction-war" x1="${warX}" y1="${padT - 4}" x2="${warX}" y2="${height - 6}"></line>
        <text class="reaction-war-label" text-anchor="middle" x="${warX}" y="${height - 1}">开战</text>
        ${rows.map((row, i) => {
          const cy = padT + i * rowH + rowH / 2;
          const startIdx = row.firstMoveIdx ?? row.peakIdx;
          const barStart = x(startIdx);
          const barEnd = x(row.peakIdx);
          const pct = `+${Math.round(row.peakChg * 100)}%`;
          const speedTxt = row.firstMoveIdx === null
            ? '无明显跳升'
            : `${model.months[row.firstMoveIdx]} 首破 +10%`;
          return `
            <text class="reaction-name" x="8" y="${cy + 4}">${row.name}</text>
            <line class="reaction-track" x1="${padL}" y1="${cy}" x2="${width - padR}" y2="${cy}"></line>
            ${row.firstMoveIdx !== null ? `
              <line class="reaction-bar" stroke="${row.color}" x1="${barStart}" y1="${cy}" x2="${barEnd}" y2="${cy}"></line>
              <circle class="reaction-first" fill="${row.color}" cx="${barStart}" cy="${cy}" r="5"></circle>
            ` : ''}
            <path class="reaction-peak" fill="${row.color}" d="M ${barEnd} ${cy - 6} L ${barEnd + 6} ${cy} L ${barEnd} ${cy + 6} L ${barEnd - 6} ${cy} Z"></path>
            <text class="reaction-pct" x="${width - padR + 8}" y="${cy + 4}" fill="${row.color}">${pct}</text>
            <title>${row.name}：${speedTxt}，高点 ${model.months[row.peakIdx]}（${pct}）</title>
          `;
        }).join('')}
      </svg>
    `;
  }

  function buildGroupPanel(model, group) {
    const seriesList = group.ids
      .map(id => model.series.find(s => s.id === id))
      .filter(Boolean)
      .map(s => ({ ...s, indexed: indexToBase(s.values, model.baselineIdx) }));
    const width = 300, height = 190;
    const pad = { top: 22, right: 14, bottom: 26, left: 34 };
    const allValues = seriesList.flatMap(s => s.indexed);
    const minValue = Math.floor(Math.min(...allValues, 95) / 10) * 10;
    const maxValue = Math.ceil(Math.max(...allValues, 130) / 10) * 10;
    const x = idx => pad.left + (idx / (model.months.length - 1)) * (width - pad.left - pad.right);
    const y = value => pad.top + ((maxValue - value) / (maxValue - minValue)) * (height - pad.top - pad.bottom);
    const warX = x(model.warStartIdx);

    return `
      <article class="mini-panel" style="--card-color:${group.color}">
        <header>
          <span class="mini-label">${group.title}</span>
          <div class="mini-legend">
            ${seriesList.map(s => `<span><i style="background:${s.color}"></i>${s.name}</span>`).join('')}
          </div>
        </header>
        <svg class="mini-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${group.title}价格指数">
          ${[minValue, maxValue].map(tick => `
            <line class="curve-grid" x1="${pad.left}" y1="${y(tick)}" x2="${width - pad.right}" y2="${y(tick)}"></line>
            <text class="curve-label" x="6" y="${y(tick) + 3}">${tick}</text>
          `).join('')}
          <line class="curve-grid base-100" x1="${pad.left}" y1="${y(100)}" x2="${width - pad.right}" y2="${y(100)}"></line>
          <line class="event-line" x1="${warX}" y1="${pad.top}" x2="${warX}" y2="${height - pad.bottom}"></line>
          ${model.months.map((month, idx) => `<text class="curve-label" text-anchor="middle" x="${x(idx)}" y="${height - 10}">${month}</text>`).join('')}
          ${seriesList.map(s => {
            const points = s.indexed.map((v, idx) => `${x(idx)},${y(v)}`).join(' ');
            const lastIdx = s.indexed.length - 1;
            return `
              <polyline class="curve-line" stroke="${s.color}" points="${points}"></polyline>
              ${s.indexed.map((v, idx) => idx === model.provisionalIdx
                ? `<circle class="curve-dot provisional" stroke="${s.color}" cx="${x(idx)}" cy="${y(v)}" r="3.6"></circle>`
                : `<circle class="curve-dot" fill="${s.color}" cx="${x(idx)}" cy="${y(v)}" r="3"></circle>`).join('')}
              <text class="mini-endlabel" x="${x(lastIdx) - 2}" y="${y(s.indexed[lastIdx]) - 6}" fill="${s.color}">${Math.round(s.indexed[lastIdx])}</text>
            `;
          }).join('')}
        </svg>
      </article>
    `;
  }

  function lagAndTransmissionHTML(model) {
    return `
      <div class="lag-table-wrap">
        <table class="lag-table">
          <thead>
            <tr>
              <th>价格层级</th>
              <th>最早反应</th>
              <th>典型滞后</th>
              <th>主要机制</th>
              <th>证据/口径</th>
              <th>终端账单</th>
            </tr>
          </thead>
          <tbody>
            ${model.lagRows.map(row => `
              <tr>
                <td>${row.price}<br><span class="speed-pill">${row.confidence}</span></td>
                <td>${row.first}</td>
                <td>${row.lag}</td>
                <td>${row.channel}</td>
                <td>${row.evidence}</td>
                <td>${row.receipt}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <div class="chain-stack">
        ${transmissionData().map(item => `
          <article class="science-card chain-card" style="--line-color:${item.color};--card-color:${item.color}">
            <div>
              <span class="mini-label">${item.label}</span>
              <h3>${item.title}</h3>
              <p>${item.copy}</p>
            </div>
            <div class="chain-flow" aria-label="${item.title}传导链">
              ${item.flow.map((step, idx) => `${idx ? '<i></i>' : ''}<span>${step}</span>`).join('')}
            </div>
            <div class="chain-metric">
              <span class="mini-label">${item.metricLabel}</span>
              <b>${item.metric}</b>
              <p>${item.metricCopy}</p>
            </div>
          </article>
        `).join('')}
      </div>
      ${methodNote('方法：Pass-through / Local Projection inspired', '表格不声称估计新的学术模型，而是借用价格传导和局部投影的表达方式：冲击发生后，不同价格在不同时间窗内出现响应。这样可以科学地区分“上游市场重估”和“终端消费者账单”。', blue)}
    `;
  }

  function renderLagAndTransmission(container, model) {
    if (!container) return;
    container.classList.add('chart-card');
    container.innerHTML = lagAndTransmissionHTML(model);
  }

  function globalMatrixHTML() {
    return `
      <div class="country-grid">
        ${countryData().map(item => `
          <article class="science-card country-card" style="--card-color:${item.color}">
            <span class="country-chip">${item.entry}</span>
            <h3>${item.country}</h3>
            <b>${item.metric}</b>
            <p>${item.copy}</p>
            <p><strong style="color:#fff;">政策过滤器：</strong>${item.filter}</p>
            <p><strong style="color:#fff;">生活翻译：</strong>${item.life}</p>
          </article>
        `).join('')}
      </div>
      ${methodNote('方法：全球暴露矩阵', '国家比较不按“谁涨得最多”排序，而按冲击入口、政策过滤器和最终账单分类。这样可以解释中国、美国、印度和伊朗为什么受到同一场战争影响，却表现为不同价格。', accent)}
    `;
  }

  function renderGlobalMatrix(container) {
    if (!container) return;
    container.classList.add('chart-card');
    container.innerHTML = globalMatrixHTML();
  }

  function interactiveReceiptsHTML() {
    return `
      <div class="interactive-model">
        <div class="science-card control-panel">
          <span class="mini-label">Interactive assumptions</span>
          <h3>调节上游冲击</h3>
          <div class="control-grid">
            ${rangeControl('oilPrice', 'Brent 油价', 72, 130, 118, '$/bbl')}
            ${rangeControl('commuteMiles', '美国月通勤距离', 300, 1000, 660, 'miles')}
            ${rangeControl('mpg', '车辆油耗', 15, 40, 25, 'mpg')}
            ${rangeControl('fertilizerShock', '化肥价格冲击', 0, 100, 80, '%')}
          </div>
          <p class="control-help">默认值来自当前数据搜集：Brent 从约 72 到 118 美元/桶，尿素 4 月较 2 月约 +80%。中国成品油使用较低传导率，模拟价格上限/政策缓冲。</p>
          <div class="shock-readout" data-role="shock-readout" aria-live="polite"></div>
        </div>
        <div class="receipt-grid" data-role="receipt-output"></div>
      </div>
      ${methodNote('方法：Cost Share + Pass-through', '美国油费公式：基础油价 × [1 + 原油成本占比 57% × 油价涨幅]。中国一箱油使用较低传导率 17%，反映国内成品油调价机制缓冲。印度农民端价格固定，冲击转为财政补贴压力。', red)}
    `;
  }

  function renderInteractiveReceipts(container, model) {
    if (!container) return;
    container.classList.add('chart-card');
    container.innerHTML = interactiveReceiptsHTML();
    const update = () => updateInteractiveReceipts(container, model);
    container.querySelectorAll('input[type="range"]').forEach(input => {
      input.addEventListener('input', update);
    });
    update();
  }

  function readReceiptInputs(scope) {
    const get = (id, fallback) => Number(scope.querySelector(`#${id}`)?.value ?? fallback);
    return {
      oilPrice: get('oilPrice', 118),
      commuteMiles: get('commuteMiles', 660),
      mpg: get('mpg', 25),
      fertilizerShock: get('fertilizerShock', 80),
    };
  }

  function computeReceipts(model, inputs) {
    const { oilPrice, commuteMiles, mpg, fertilizerShock } = inputs;
    const f = model.formulas;
    const oilShock = (oilPrice - f.usBaseOil) / f.usBaseOil;
    const usGasAfter = f.usBaseGas * (1 + f.oilCostShare * oilShock);
    const usOldBill = (commuteMiles / mpg) * f.usBaseGas;
    const usNewBill = (commuteMiles / mpg) * usGasAfter;
    const chinaNewTank = f.chinaBaseTank * (1 + f.chinaPassThrough * oilShock);
    const indiaFiscal = f.indiaFiscalShock * (fertilizerShock / 80);
    const shockPct = Math.round(oilShock * 100);

    const readoutHTML = `
      <span>你设定的油价冲击 <b>${oilShock >= 0 ? '+' : ''}${shockPct}%</b></span>
      <span>→ 美国汽油 <b>$${f.usBaseGas.toFixed(2)} → $${usGasAfter.toFixed(2)}/gal</b></span>
      <span>化肥冲击 <b>+${fertilizerShock}%</b></span>
    `;

    const cards = [
      {
        place: 'United States',
        tag: '上游传导',
        title: '通勤者月油费',
        before: `$${formatMoney(usOldBill)}`,
        after: `$${formatMoney(usNewBill)}`,
        delta: `+$${formatMoney(usNewBill - usOldBill)}/月`,
        note: `公式：${commuteMiles} mi ÷ ${mpg} mpg × $${usGasAfter.toFixed(2)}/gal。汽油价格 = $${f.usBaseGas.toFixed(2)} ×〔1 + 57% × ${shockPct}%〕。`,
        color: amber,
      },
      {
        place: 'China / Shandong',
        tag: '上游传导',
        title: '司机加满 50L 92 号汽油',
        before: `${formatMoney(f.chinaBaseTank)} 元`,
        after: `${formatMoney(chinaNewTank)} 元`,
        delta: `+${formatMoney(chinaNewTank - f.chinaBaseTank)} 元/箱`,
        note: `公式：${formatMoney(f.chinaBaseTank)} ×〔1 + 17% × ${shockPct}%〕。传导率低，反映国内成品油调价机制缓冲。`,
        color: red,
      },
      {
        place: 'India',
        tag: '上游传导',
        title: '水稻农民施肥账单',
        before: '约 2150 卢比',
        after: '约 2150 卢比（补贴锁定）',
        delta: `财政端 +${formatLargeInr(indiaFiscal)}`,
        note: '农民端尿素/DAP 价格被补贴压住；冲击转为政府补贴压力，而非农民柜台价翻倍。',
        color: accent,
      },
      {
        place: 'Iran / Tehran',
        tag: '本地冲击',
        local: true,
        title: '家庭买 30 张 lavash 面包',
        before: `${f.breadOld.toLocaleString()} toman`,
        after: `${f.breadNew.toLocaleString()} toman`,
        delta: '+93%',
        note: '真实价格案例（BBC Persian 报道）。不随上方滑块变化——它是本地食品/汇率综合冲击，不是全球油价传导。',
        color: red,
      },
    ];

    return { readoutHTML, cards, oilShock, usGasAfter };
  }

  function updateInteractiveReceipts(scope, model) {
    const output = scope.querySelector('[data-role="receipt-output"]');
    if (!output) return;
    const inputs = readReceiptInputs(scope);

    scope.querySelectorAll('.control-row input').forEach(input => {
      const out = input.closest('.control-row')?.querySelector('output');
      if (out) out.textContent = `${input.value}${input.dataset.unit}`;
    });

    const { readoutHTML, cards } = computeReceipts(model, inputs);
    const readout = scope.querySelector('[data-role="shock-readout"]');
    if (readout) readout.innerHTML = readoutHTML;
    output.innerHTML = cards.map(card => receiptCard(card)).join('');
  }

  function dataCautionsHTML() {
    return `
      <div class="method-grid">
        ${[
          ['真实价格', '德黑兰面包、AAA 汽油、BLS 汽油 CPI、World Bank 商品价可直接画曲线或小票，但要保留单位和时间。', accent],
          ['情景测算', '美国通勤油费、中国一箱油、印度财政补贴都依赖假设；页面必须显示公式或关键参数。', amber],
          ['机制指数', 'FAO 食品指数、OECD 运费传导、World Bank pass-through 研究适合解释机制，不能直接写成家庭小票。', blue],
          ['禁止混用', '伊朗管道气不是全球 LNG；印度进口尿素翻倍不等于农民端价格翻倍；美国汽油涨不是因为直接买伊朗油。', red],
        ].map(([title, copy, color]) => methodNote(title, copy, color)).join('')}
      </div>
    `;
  }

  function renderDataCautions(container) {
    if (!container) return;
    container.classList.add('chart-card');
    container.innerHTML = dataCautionsHTML();
  }

  function rangeControl(id, label, min, max, value, unit) {
    return `
      <div class="control-row">
        <label for="${id}"><span>${label}</span><output>${value}${unit}</output></label>
        <input id="${id}" type="range" min="${min}" max="${max}" value="${value}" data-unit="${unit}" />
      </div>
    `;
  }

  function receiptCard(item) {
    return `
      <article class="receipt-card${item.local ? ' receipt-local' : ''}" style="--card-color:${item.color}">
        <div class="receipt-top">
          <span class="mini-label">${item.place}</span>
          ${item.tag ? `<span class="receipt-tag${item.local ? ' is-local' : ''}">${item.tag}</span>` : ''}
        </div>
        <h3>${item.title}</h3>
        <div class="receipt-row">
          <span class="receipt-old">${item.before}</span>
          <i></i>
          <span class="receipt-new">${item.after}</span>
        </div>
        <span class="receipt-deficit">${item.delta}</span>
        <p>${item.note}</p>
      </article>
    `;
  }

  function scienceCard(label, value, copy, color) {
    return `
      <article class="science-card" style="--card-color:${color}">
        <span class="mini-label">${label}</span>
        <b>${value}</b>
        <p>${copy}</p>
      </article>
    `;
  }

  function methodNote(title, copy, color) {
    return `
      <aside class="method-note" style="--note-color:${color}">
        <strong>${title}</strong>
        <p>${copy}</p>
      </aside>
    `;
  }

  function indexToBase(values, baseIndex) {
    const base = values[baseIndex];
    return values.map(value => (value / base) * 100);
  }

  function formatMoney(value) {
    return value.toFixed(2).replace(/\.00$/, '');
  }

  function formatLargeInr(value) {
    if (value >= 1000000000000) return `${(value / 1000000000000).toFixed(2)} 万亿卢比`;
    return `${Math.round(value / 1000000000)} 十亿卢比`;
  }

  function transmissionData() {
    return [
      {
        label: 'mobility chain',
        title: '油价线：从一桶油到一次通勤',
        flow: ['Brent', '汽油/柴油', '出租车/物流', '通勤账单'],
        metricLabel: 'EIA cost share',
        metric: '57%',
        metricCopy: '美国普通汽油价格中，原油约占 57%。',
        copy: '这解释为什么美国即使不直接依赖伊朗油，也会通过全球油价池在加油站付钱。',
        color: red,
      },
      {
        label: 'fertilizer chain',
        title: '天然气线：气价会变成化肥',
        flow: ['天然气/LNG', '氨', '尿素', '农田成本'],
        metricLabel: 'World Bank',
        metric: '81%',
        metricCopy: '天然气约占尿素生产成本 81%。',
        copy: '天然气不是只影响电费，它也是氮肥的原料和能源。',
        color: accent,
      },
      {
        label: 'food lag',
        title: '化肥线：食品价格慢半拍',
        flow: ['化肥', '种植成本', '产量/批发', '食品价格'],
        metricLabel: 'World Bank study',
        metric: '4-18月',
        metricCopy: '化肥向消费价格传导有明显滞后。',
        copy: '这条链不能当天画到超市小票，要讲库存、播种季和零售缓冲。',
        color: amber,
      },
      {
        label: 'shipping chain',
        title: '航运线：看不见的保险进入货架',
        flow: ['战争险', '绕行/船燃', '进口成本', '货架价格'],
        metricLabel: 'ITF/OECD',
        metric: '+8500海里',
        metricCopy: '远东-欧洲绕好望角往返多约 8,500 海里。',
        copy: '运费到 CPI 是小但广的传导，适合做细线，不适合夸张成主冲击。',
        color: blue,
      },
    ];
  }

  function countryData() {
    return [
      {
        country: '中国',
        entry: '伊朗油 / 山东炼化',
        metric: '138 万桶/日',
        copy: '中国购买伊朗海运油约 138 万桶/日，占中国海运原油进口 13.4%。',
        filter: '国内成品油调价机制会缓冲国际油价。',
        life: '同样加满一箱油，山东司机约多付 42 元。',
        color: red,
      },
      {
        country: '美国',
        entry: '全球油价池',
        metric: '直接进口仅 2%',
        copy: '美国经霍尔木兹进口占消费很低，但汽油价格仍跟全球油价联动。',
        filter: '市场油价直接进入汽油和柴油，但食品/CPI 更慢。',
        life: '同样每月通勤 660 英里，油费可多付约 20 美元以上。',
        color: amber,
      },
      {
        country: '日本/韩国',
        entry: '进口能源 / 电力',
        metric: '进口依赖 87%+',
        copy: '日韩更敏感的是 LNG、发电成本和工业电价，而不是单一汽油票。',
        filter: '电价有燃料调整、补贴或管制滞后。',
        life: '家庭账单可能被补贴抵消，工业成本先承压。',
        color: blue,
      },
      {
        country: '印度/巴西/非洲',
        entry: '化肥 / 农业',
        metric: '尿素近翻倍',
        copy: '印度进口尿素报价从约 508-512 美元/吨升至 935-959 美元/吨。',
        filter: '印度用补贴压住农民端价格，巴西/非洲更依赖进口肥料。',
        life: '农民柜台价不一定涨，但财政或下一季粮食成本变厚。',
        color: accent,
      },
      {
        country: '伊朗本地',
        entry: '食品 / 汇率',
        metric: '面包近翻倍',
        copy: '战争、封锁和汇率冲击直接打到本地食品和面包价格。',
        filter: '官方价、市场价和汇率黑市并存。',
        life: '30 张 lavash 面包从 42,000 toman 到 81,000 toman。',
        color: red,
      },
    ];
  }

  return {
    colors,
    eventGroups,
    createPriceModel,
    injectStyles,
    indexToBase,
    computeReaction,
    // builders (HTML strings, no side effects)
    baselineHTML,
    eventStudyHTML,
    buildReactionTimeline,
    buildGroupPanel,
    lagAndTransmissionHTML,
    globalMatrixHTML,
    interactiveReceiptsHTML,
    dataCautionsHTML,
    scienceCard,
    methodNote,
    rangeControl,
    receiptCard,
    // interactive calc
    computeReceipts,
    updateInteractiveReceipts,
    readReceiptInputs,
    formatMoney,
    formatLargeInr,
    transmissionData,
    countryData,
    // container renderers (mount + wire)
    renderBaseline,
    renderEventStudy,
    renderLagAndTransmission,
    renderGlobalMatrix,
    renderInteractiveReceipts,
    renderDataCautions,
  };
})();
