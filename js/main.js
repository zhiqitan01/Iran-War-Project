/**
 * main.js — 首页逻辑 v3
 * 1. Hero map + ripples
 * 2. Background sticky map (联动时间线)
 * 3. Accordion
 * 4. Timeline item entrance + map flyTo
 * 5. Count-up animation
 * 6. Impact cards entrance
 * 7. Epilogue entrance
 * 8. Right-side progress nav
 */

// ─────────────────────────────────────
// 1. HERO MAP
// ─────────────────────────────────────
const STRAIT = [26.5, 56.3];

const heroMap = L.map('map', {
  center: STRAIT,
  zoom: 5,
  zoomControl: false,
  scrollWheelZoom: false,
  dragging: false,
  doubleClickZoom: false,
  attributionControl: false,
});

L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  subdomains: 'abcd', maxZoom: 19,
}).addTo(heroMap);

[
  { lat: 26.5,  lng: 56.3,  label: '霍尔木兹海峡', color: '#d64030' },
  { lat: 35.69, lng: 51.39, label: '德黑兰',        color: '#e8a838' },
  { lat: 33.33, lng: 44.37, label: '巴格达',        color: '#e8a838' },
  { lat: 33.89, lng: 35.50, label: '贝鲁特',        color: '#9a9490' },
].forEach(({ lat, lng, label, color }) => {
  const icon = L.divIcon({
    className: '',
    html: `<div style="position:relative;">
      <div style="width:8px;height:8px;border-radius:50%;background:${color};box-shadow:0 0 8px ${color}88;"></div>
      <span style="position:absolute;left:12px;top:-5px;font:600 10px 'Space Mono',monospace;color:${color};white-space:nowrap;text-shadow:0 1px 6px rgba(0,0,0,0.9);">${label}</span>
    </div>`,
    iconSize: [8, 8], iconAnchor: [4, 4],
  });
  L.marker([lat, lng], { icon }).addTo(heroMap);
});

// ─────────────────────────────────────
// 2. RIPPLE SVG
// ─────────────────────────────────────
function drawRipples() {
  const svg = document.getElementById('ripple-svg');
  if (!svg) return;
  const { x: cx, y: cy } = heroMap.latLngToContainerPoint(STRAIT);
  svg.innerHTML = '';

  [
    [51.5, 0], [40.7, -74], [35.7, 139.7],
    [28.6, 77.2], [22.3, 114.2], [-23.5, -46.6],
  ].forEach(([la, ln], i) => {
    const { x, y } = heroMap.latLngToContainerPoint([la, ln]);
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    Object.entries({ x1:cx, y1:cy, x2:x, y2:y,
      stroke:'rgba(214,64,48,0.28)', 'stroke-width':'1',
      'stroke-dasharray':'5 4' }).forEach(([k,v]) => line.setAttribute(k,v));
    line.style.animation = `dashFlow 2.8s linear ${i*0.35}s infinite`;
    svg.appendChild(line);
  });

  [70, 150, 240, 340].forEach((r, i) => {
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    Object.entries({ cx, cy, r, fill:'none',
      stroke:'rgba(214,64,48,0.20)', 'stroke-width':'1' }).forEach(([k,v]) => c.setAttribute(k,v));
    c.style.cssText = `animation:ripplePulse 3.2s ease-out ${i*0.65}s infinite;transform-origin:${cx}px ${cy}px;`;
    svg.appendChild(c);
  });

  if (!document.getElementById('ripple-kf')) {
    const s = document.createElement('style');
    s.id = 'ripple-kf';
    s.textContent = `
      @keyframes ripplePulse{0%{opacity:.7;transform:scale(.5)}100%{opacity:0;transform:scale(1.4)}}
      @keyframes dashFlow{from{stroke-dashoffset:0}to{stroke-dashoffset:-100}}
    `;
    document.head.appendChild(s);
  }
}

heroMap.whenReady(() => setTimeout(drawRipples, 200));
window.addEventListener('resize', () => { heroMap.invalidateSize(); drawRipples(); });

// ─────────────────────────────────────
// 3. BACKGROUND STICKY MAP
// ─────────────────────────────────────
const bgMapEl = document.getElementById('bg-map');
let bgMap = null;
let bgMarker = null;

if (bgMapEl) {
  bgMap = L.map('bg-map', {
    center: [32, 50],
    zoom: 4,
    zoomControl: false,
    scrollWheelZoom: false,
    dragging: false,
    doubleClickZoom: false,
    attributionControl: false,
  });

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    subdomains: 'abcd', maxZoom: 19,
  }).addTo(bgMap);

  // Static context markers
  [
    { lat: 26.5,  lng: 56.3,  label: '霍尔木兹', color: '#d64030' },
    { lat: 35.69, lng: 51.39, label: '德黑兰',   color: '#e8a838' },
    { lat: 33.33, lng: 44.37, label: '巴格达',   color: '#9a9490' },
    { lat: 33.89, lng: 35.50, label: '贝鲁特',   color: '#9a9490' },
  ].forEach(({ lat, lng, label, color }) => {
    const icon = L.divIcon({
      className: '',
      html: `<div style="position:relative;">
        <div style="width:6px;height:6px;border-radius:50%;background:${color};opacity:0.7;"></div>
        <span style="position:absolute;left:10px;top:-4px;font:500 9px 'Space Mono',monospace;color:${color};white-space:nowrap;text-shadow:0 1px 4px rgba(0,0,0,1);opacity:0.8;">${label}</span>
      </div>`,
      iconSize: [6, 6], iconAnchor: [3, 3],
    });
    L.marker([lat, lng], { icon }).addTo(bgMap);
  });
}

// ─────────────────────────────────────
// 4. TIMELINE — entrance + scroll-driven marker
// ─────────────────────────────────────
const btItems = document.querySelectorAll('.bt-item');

// 入场动画
const btEntranceObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const idx = Array.from(btItems).indexOf(entry.target);
      setTimeout(() => entry.target.classList.add('visible'), idx * 70);
      btEntranceObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.2 });

btItems.forEach(el => btEntranceObserver.observe(el));

// 注入 bgPing 动画
if (!document.getElementById('bg-ping-kf')) {
  const s = document.createElement('style');
  s.id = 'bg-ping-kf';
  s.textContent = `@keyframes bgPing{
    0%  { box-shadow: 0 0 0 0   rgba(214,64,48,0.8); }
    70% { box-shadow: 0 0 0 40px rgba(214,64,48,0);  }
    100%{ box-shadow: 0 0 0 0   rgba(214,64,48,0);   }
  }`;
  document.head.appendChild(s);
}

function updateBgMarker(item) {
  if (!bgMap) return;
  const lat = parseFloat(item.dataset.lat);
  const lng  = parseFloat(item.dataset.lng);
  const title = item.querySelector('.bt-title')?.textContent || '';
  if (isNaN(lat)) return;

  // 移除旧标记
  if (bgMarker) bgMap.removeLayer(bgMarker);

  // 新标记：更大、带白色描边
  const icon = L.divIcon({
    className: '',
    html: `<div style="
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #d64030;
      border: 2.5px solid #fff;
      box-shadow: 0 0 0 0 rgba(214,64,48,0.8);
      animation: bgPing 1.6s ease-out infinite;
    "></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
  bgMarker = L.marker([lat, lng], { icon }).addTo(bgMap);

  // 更新底部标签
  const labelEl = document.getElementById('bg-map-label');
  if (labelEl) labelEl.textContent = title;
}

// 滚动驱动：节点进入视口中央才切换标记，地图视角不动
const btScrollObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    btItems.forEach(i => i.classList.remove('active'));
    entry.target.classList.add('active');
    updateBgMarker(entry.target);
  });
}, {
  root: null,
  rootMargin: '-38% 0px -38% 0px',
  threshold: 0,
});

btItems.forEach(el => btScrollObserver.observe(el));

// ─────────────────────────────────────
// 5. ACCORDION
// ─────────────────────────────────────
document.querySelectorAll('.acc-trigger').forEach(trigger => {
  trigger.addEventListener('click', () => {
    const item = trigger.closest('.acc-item');
    const isOpen = item.classList.contains('open');
    // Close all
    document.querySelectorAll('.acc-item').forEach(i => i.classList.remove('open'));
    // Toggle clicked
    if (!isOpen) item.classList.add('open');
  });
});

// ─────────────────────────────────────
// 6. COUNT-UP ANIMATION
// ─────────────────────────────────────
function countUp(el) {
  const target    = parseFloat(el.dataset.target);
  const prefix    = el.dataset.prefix    || '';
  const suffix    = el.dataset.suffix    || '';
  const decimals  = parseInt(el.dataset.decimals || '0');
  const duration  = 1800;
  const startTime = performance.now();

  const ease = t => 1 - Math.pow(1 - t, 4);

  function tick(now) {
    const p = Math.min((now - startTime) / duration, 1);
    const v = ease(p) * target;
    const display = decimals > 0 ? v.toFixed(decimals) : Math.floor(v).toLocaleString();
    el.textContent = prefix + display + suffix;
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

const countObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting && !entry.target.dataset.counted) {
      entry.target.dataset.counted = '1';
      countUp(entry.target);
      countObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.5 });

document.querySelectorAll('.stat-num[data-target], .cs-num[data-target], .hum-num[data-target]')
  .forEach(el => countObserver.observe(el));

// ─────────────────────────────────────
// 7. IMPACT CARDS ENTRANCE
// ─────────────────────────────────────
const cardObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const delay = Array.from(document.querySelectorAll('.impact-card')).indexOf(entry.target) * 130;
      setTimeout(() => entry.target.classList.add('visible'), delay);
      cardObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.impact-card').forEach(el => cardObserver.observe(el));

// ─────────────────────────────────────
// 8. EPILOGUE ENTRANCE
// ─────────────────────────────────────
const epiObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      epiObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.epi-grid, .epi-closing').forEach(el => epiObserver.observe(el));

// ─────────────────────────────────────
// 9. RIGHT-SIDE PROGRESS NAV
// ─────────────────────────────────────
const pnItems = document.querySelectorAll('.pn-item');
const sections = ['hero', 'background', 'timeline-section', 'impacts-section', 'epilogue']
  .map(id => document.getElementById(id))
  .filter(Boolean);

function updateProgressNav() {
  const scrollY = window.scrollY + window.innerHeight * 0.35;
  let activeIdx = 0;
  sections.forEach((sec, i) => {
    if (sec.offsetTop <= scrollY) activeIdx = i;
  });
  pnItems.forEach((item, i) => {
    item.classList.toggle('active', i === activeIdx);
  });
}

window.addEventListener('scroll', updateProgressNav, { passive: true });
updateProgressNav();

// Smooth scroll on click
pnItems.forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    const target = document.getElementById(item.dataset.section);
    if (target) target.scrollIntoView({ behavior: 'smooth' });
  });
});
