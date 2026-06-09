/**
 * energy.js — 能源影响页面逻辑
 *
 * ================================================================
 * 本文件由【能源影响】负责组员填写。
 *
 * 可用的 DOM 挂载点（在 energy.html 中已预留）：
 *   #map-strait       → 霍尔木兹海峡 Leaflet 地图容器
 *   #chart-oil-price  → 油价走势图容器
 *   #chart-shipping   → 航运风险图表容器
 *
 * Leaflet 已在 energy.html 中引入，可直接使用 L.map()。
 * ================================================================
 */

document.addEventListener('DOMContentLoaded', () => {

  // ── 1. 霍尔木兹海峡地图 ──────────────────────────────────────
  // Leaflet 已加载，直接初始化
  const straitContainer = document.getElementById('map-strait');
  if (straitContainer) {
    // 清除占位文字
    straitContainer.innerHTML = '';
    straitContainer.style.height = '420px';

    const straitMap = L.map('map-strait', {
      center: [26.5, 56.3],
      zoom: 7,
      zoomControl: true,
      scrollWheelZoom: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(straitMap);

    // TODO: 在此添加航线、封锁线、港口标注等图层
    // 示例：画霍尔木兹航线
    // L.polyline([[26.2, 56.8], [24.0, 58.5]], {
    //   color: '#e8a838', weight: 2, dashArray: '6 4'
    // }).addTo(straitMap).bindPopup('主要石油航线');
  }


  // ── 2. 油价走势图 ──────────────────────────────────────────
  // 示例结构（使用 Chart.js，需在 HTML 中引入）
  //
  // const oilCtx = document.getElementById('chart-oil-price');
  // if (oilCtx) {
  //   oilCtx.innerHTML = '<canvas id="canvas-oil"></canvas>';
  //   new Chart(document.getElementById('canvas-oil'), {
  //     type: 'line',
  //     data: {
  //       labels: [/* 日期序列 */],
  //       datasets: [{
  //         label: 'Brent原油 (USD/桶)',
  //         data: [/* 价格数据 */],
  //         borderColor: '#e8a838',
  //         backgroundColor: 'rgba(232,168,56,0.08)',
  //         fill: true,
  //         tension: 0.3,
  //       }]
  //     },
  //     options: {
  //       plugins: { legend: { labels: { color: '#e8e4dc' } } },
  //       scales: {
  //         x: { ticks: { color: '#8a8480' }, grid: { color: 'rgba(255,255,255,0.06)' } },
  //         y: { ticks: { color: '#8a8480' }, grid: { color: 'rgba(255,255,255,0.06)' } },
  //       }
  //     }
  //   });
  // }


  // ── 3. 能源供应链重构图表 ─────────────────────────────────────
  // 推荐：用 Chart.js 柱状图对比各国能源来源转移，或 ECharts 桑基图
  // const supplyContainer = document.getElementById('chart-energy-supply');
  // ...


  // ── 4. 其他交互（自由添加） ──────────────────────────────────

});
