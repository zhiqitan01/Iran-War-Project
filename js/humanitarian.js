/**
 * humanitarian.js — 人道影响页面逻辑
 *
 * ================================================================
 * 本文件由【人道影响】负责组员填写。
 *
 * 可用的 DOM 挂载点（在 humanitarian.html 中已预留）：
 *   #stat-grid-humanitarian  → 关键数据卡片区域
 *   #chart-casualties        → 伤亡图表容器
 *   #chart-infrastructure    → 基础设施破坏图表容器
 *
 * 推荐图表库（在 humanitarian.html 的 <head> 中取消注释对应 CDN）：
 *   - Chart.js:  https://cdn.jsdelivr.net/npm/chart.js
 *   - ECharts:   https://cdn.jsdelivr.net/npm/echarts/dist/echarts.min.js
 *   - D3.js:     https://cdn.jsdelivr.net/npm/d3
 * ================================================================
 */

document.addEventListener('DOMContentLoaded', () => {

  // ── 1. 关键数据卡片 ──────────────────────────────────────────
  // 在此填写真实数据，数组中每项对应一张统计卡片
  const stats = [
    { number: '--',   label: '平民死亡（估计）' },
    { number: '--',   label: '流离失所人口' },
    { number: '--所', label: '学校受损' },
    { number: '--所', label: '医疗设施受损' },
  ];

  const statGrid = document.getElementById('stat-grid-humanitarian');
  if (statGrid) {
    statGrid.innerHTML = stats.map(s => `
      <div class="stat-card">
        <span class="stat-number">${s.number}</span>
        <span class="stat-label">${s.label}</span>
      </div>
    `).join('');
  }


  // ── 2. 伤亡图表 ──────────────────────────────────────────────
  // 示例：用 Chart.js 绘制柱状图（需在 HTML 中引入 Chart.js CDN）
  //
  // const ctx = document.getElementById('chart-casualties');
  // if (ctx) {
  //   ctx.innerHTML = '<canvas id="canvas-casualties"></canvas>';
  //   new Chart(document.getElementById('canvas-casualties'), {
  //     type: 'bar',
  //     data: {
  //       labels: ['2025-Q1', '2025-Q2', /* ... */],
  //       datasets: [{
  //         label: '平民伤亡',
  //         data: [/* 数字 */],
  //         backgroundColor: '#c0392b',
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


  // ── 3. 基础设施破坏图表 ──────────────────────────────────────
  // 在此添加你的图表逻辑
  // const infraContainer = document.getElementById('chart-infrastructure');
  // ...


  // ── 4. 其他交互 / 地图 / 动画（自由添加） ───────────────────

});
