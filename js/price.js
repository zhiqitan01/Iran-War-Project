/**
 * price.js — 物价影响页面（科学数据版）
 *
 * 薄调用层：所有数据模型与图表构建都在 js/price-charts.js（window.PriceCharts），
 * 供数据版与故事版 price-story.js 共用。
 */

document.addEventListener('DOMContentLoaded', () => {
  if (!window.PriceCharts) return;
  const PC = window.PriceCharts;
  const model = PC.createPriceModel();

  PC.injectStyles();
  PC.renderBaseline(document.getElementById('chart-chain'), model);
  PC.renderEventStudy(document.getElementById('chart-pass-through'), model);
  PC.renderLagAndTransmission(document.getElementById('chart-global-context'), model);
  PC.renderGlobalMatrix(document.getElementById('chart-food-price'), model);
  PC.renderInteractiveReceipts(document.getElementById('chart-fertilizer'), model);
  PC.renderDataCautions(document.getElementById('chart-household-receipt'), model);
});
