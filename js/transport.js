/**
 * transport.js — 交通影响页面逻辑
 *
 * ================================================================
 * 本文件由【交通影响】负责组员（林恺）填写。
 *
 * 可用的 DOM 挂载点（在 transport.html 中已预留）：
 *   #chart-strait-shipping → 霍尔木兹海峡航运中断图表/地图
 *   #chart-flight-routes   → 航空禁区与航线绕行示意图
 *   #chart-freight-cost    → 运费与保险成本走势图
 *
 * Leaflet 已在 transport.html 中引入，可直接使用 L.map()。
 *
 * 推荐数据来源：
 *   - Vessel Finder / MarineTraffic（船舶追踪）
 *   - Baltic Exchange（波罗的海运价指数）
 *   - Flightradar24 历史航线数据
 *   - IATA（国际航空运输协会）
 *   - Lloyd's of London（战争风险保险溢价）
 * ================================================================
 */

document.addEventListener('DOMContentLoaded', () => {

  // ── 1. 霍尔木兹海峡航运地图 ──────────────────────────────────
  // 示例：用 Leaflet 展示海峡位置与航线
  //
  // const straitContainer = document.getElementById('chart-strait-shipping');
  // if (straitContainer) {
  //   straitContainer.innerHTML = '';
  //   straitContainer.style.height = '400px';
  //
  //   const map = L.map('chart-strait-shipping', {
  //     center: [25.5, 57.0],
  //     zoom: 6,
  //     scrollWheelZoom: false,
  //   });
  //   L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  //     attribution: '&copy; CARTO', subdomains: 'abcd',
  //   }).addTo(map);
  //
  //   // 画主要石油航线
  //   L.polyline([[26.2, 56.8], [24.5, 58.8], [22.0, 60.0]], {
  //     color: '#d64030', weight: 2, dashArray: '6 4'
  //   }).addTo(map).bindPopup('主要石油出口航线（封锁前）');
  // }


  // ── 2. 航空禁区与绕行航线 ────────────────────────────────────
  // 示例：用 Leaflet 或 SVG 叠加层展示禁飞区范围与绕行路线
  //
  // const flightContainer = document.getElementById('chart-flight-routes');
  // if (flightContainer) {
  //   flightContainer.innerHTML = '';
  //   flightContainer.style.height = '400px';
  //
  //   const map = L.map('chart-flight-routes', {
  //     center: [35.0, 55.0], zoom: 4, scrollWheelZoom: false,
  //   });
  //   L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  //     attribution: '&copy; CARTO', subdomains: 'abcd',
  //   }).addTo(map);
  //
  //   // 禁飞区（伊朗领空）
  //   L.circle([32.0, 53.0], { radius: 800000,
  //     color: '#d64030', fillColor: '#d64030', fillOpacity: 0.12, weight: 1,
  //   }).addTo(map).bindPopup('伊朗领空禁区');
  //
  //   // 原始航线
  //   L.polyline([[51.5, 0], [41.0, 29.0], [25.2, 55.3], [1.3, 103.8]], {
  //     color: '#8a8480', weight: 1.5, dashArray: '4 3'
  //   }).addTo(map).bindPopup('原始航线（伦敦—新加坡）');
  //
  //   // 绕行航线
  //   L.polyline([[51.5, 0], [41.0, 29.0], [15.0, 42.0], [1.3, 103.8]], {
  //     color: '#e8a838', weight: 2,
  //   }).addTo(map).bindPopup('绕行航线（增加约3小时）');
  // }


  // ── 3. 运费与保险成本走势图 ──────────────────────────────────
  // 示例：用 Chart.js 折线图（需在 HTML 中引入 Chart.js CDN）
  //
  // const freightCtx = document.getElementById('chart-freight-cost');
  // if (freightCtx) {
  //   freightCtx.innerHTML = '<canvas id="canvas-freight"></canvas>';
  //   new Chart(document.getElementById('canvas-freight'), {
  //     type: 'line',
  //     data: {
  //       labels: [/* 时间序列，如 '2026-02', '2026-03', ... */],
  //       datasets: [
  //         {
  //           label: '波罗的海干散货指数（BDI）',
  //           data: [/* 数据 */],
  //           borderColor: '#d64030',
  //           backgroundColor: 'rgba(214,64,48,0.08)',
  //           fill: true, tension: 0.3,
  //         },
  //         {
  //           label: '战争风险保险溢价（%）',
  //           data: [/* 数据 */],
  //           borderColor: '#e8a838',
  //           tension: 0.3,
  //         }
  //       ]
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


  // ── 4. 其他交互（自由添加） ──────────────────────────────────

});
