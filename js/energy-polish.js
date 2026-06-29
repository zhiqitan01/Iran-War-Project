/**
 * energy-polish.js
 *
 * Progressive visual enhancements for the energy chapter.
 * Uses installed front-end libraries without replacing the working Leaflet story.
 */

document.addEventListener('DOMContentLoaded', () => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  initLenis(reduceMotion);
  initGsapNarrative(reduceMotion);
  initInvoiceStack();
  initPriceDistribution();
  initHeroField(reduceMotion);
});

function initLenis(reduceMotion) {
  if (reduceMotion || !window.Lenis) return;

  const lenis = new window.Lenis({
    duration: 1.05,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    wheelMultiplier: 0.78,
    touchMultiplier: 1.1,
  });

  window.__energyLenis = lenis;
  if (window.ScrollTrigger) lenis.on('scroll', window.ScrollTrigger.update);

  function raf(time) {
    lenis.raf(time);
    window.requestAnimationFrame(raf);
  }
  window.requestAnimationFrame(raf);
}

function initGsapNarrative(reduceMotion) {
  if (reduceMotion || !window.gsap) return;
  const { gsap } = window;
  if (window.ScrollTrigger) gsap.registerPlugin(window.ScrollTrigger);

  const progress = document.createElement('div');
  progress.className = 'energy-scroll-progress';
  progress.setAttribute('aria-hidden', 'true');
  document.body.appendChild(progress);

  if (window.ScrollTrigger) {
    gsap.to(progress, {
      scaleX: 1,
      ease: 'none',
      scrollTrigger: { start: 0, end: 'max', scrub: 0.25 },
    });
  }

  gsap.from('.energy-hero-inner > *', {
    y: 22,
    opacity: 0,
    duration: 0.75,
    ease: 'power3.out',
    stagger: 0.08,
  });

  const heroMetricItems = gsap.utils.toArray('.energy-hero-metrics div');
  if (heroMetricItems.length) {
    gsap.from(heroMetricItems, {
      y: 18,
      opacity: 0,
      duration: 0.65,
      ease: 'power3.out',
      stagger: 0.08,
      delay: 0.12,
    });
  }

  if (!window.ScrollTrigger) return;

  gsap.utils.toArray('.story-step').forEach((step) => {
    gsap.fromTo(step,
      { '--stepGlow': 0 },
      {
        '--stepGlow': 1,
        ease: 'none',
        scrollTrigger: {
          trigger: step,
          start: 'top 72%',
          end: 'bottom 38%',
          scrub: true,
        },
      }
    );
  });

  gsap.set('.master-map-shell', { clearProps: 'opacity,transform' });
}

function initInvoiceStack() {
  const d3 = window.d3;
  const target = document.getElementById('invoice-d3-stack');
  if (!d3 || !target) return;

  const data = [
    { label: '基础', value: 100, color: '#5d5961' },
    { label: '战争险', value: 38, color: '#d64030' },
    { label: '等待', value: 24, color: '#e8a838' },
    { label: '绕行', value: 31, color: '#2aa198' },
    { label: '合规', value: 17, color: '#c9c2b5' },
  ];
  const total = d3.sum(data, (d) => d.value);
  const width = 360;
  const height = 104;
  const margin = { top: 22, right: 18, bottom: 28, left: 18 };
  const x = d3.scaleLinear().domain([0, total]).range([margin.left, width - margin.right]);

  target.innerHTML = '';
  const svg = d3.select(target)
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('role', 'img')
    .attr('aria-label', '到岸运输成本指数由基础运费、战争险、等待、绕行和合规审查组成');

  svg.append('text')
    .attr('x', margin.left)
    .attr('y', 13)
    .attr('class', 'invoice-stack-title')
    .text('到岸运输成本构成');

  let cursor = 0;
  svg.selectAll('rect')
    .data(data)
    .join('rect')
    .attr('x', (d) => {
      const current = cursor;
      cursor += d.value;
      return x(current);
    })
    .attr('y', 34)
    .attr('width', (d) => Math.max(2, x(d.value) - x(0)))
    .attr('height', 22)
    .attr('fill', (d) => d.color)
    .attr('opacity', 0.92);

  cursor = 0;
  svg.selectAll('text.segment')
    .data(data)
    .join('text')
    .attr('class', 'segment')
    .attr('x', (d) => {
      const current = cursor;
      cursor += d.value;
      return x(current + d.value / 2);
    })
    .attr('y', 73)
    .attr('text-anchor', 'middle')
    .text((d) => d.label);

  svg.append('line')
    .attr('x1', x(100))
    .attr('x2', x(100))
    .attr('y1', 28)
    .attr('y2', 61)
    .attr('class', 'invoice-base-line');

  svg.append('text')
    .attr('x', x(100) + 5)
    .attr('y', 28)
    .attr('class', 'invoice-base-label')
    .text('基准 = 100');

  svg.append('text')
    .attr('x', width - margin.right)
    .attr('y', 93)
    .attr('text-anchor', 'end')
    .attr('class', 'invoice-total-label')
    .text(`总计 ${total}`);
}

function initPriceDistribution() {
  const d3 = window.d3;
  const target = document.getElementById('price-d3-strip');
  if (!d3 || !target) return;

  const countries = window.__energyFuelCountries || [];
  if (!countries.length) return;

  const width = 330;
  const height = 146;
  const margin = { top: 34, right: 10, bottom: 25, left: 10 };
  const months = ['1 月', '2 月', '3 月', '4 月', '5 月', '6 月'];

  function render(country) {
    if (!country || !Array.isArray(country.monthly)) return;
    const peak = d3.max(country.monthly);
    const peakIndex = country.monthly.indexOf(peak);
    const data = country.monthly.map((value, index) => ({
      month: months[index],
      value,
      index,
      isPeak: index === peakIndex,
      isCurrent: index === country.monthly.length - 1,
    }));
    const x = d3.scaleBand()
      .domain(months)
      .range([margin.left, width - margin.right])
      .padding(0.34);
    const y = d3.scaleLinear()
      .domain([0, peak * 1.22])
      .nice()
      .range([height - margin.bottom, margin.top]);
    const digits = peak >= 100 ? 1 : 2;

    target.innerHTML = '';
    const svg = d3.select(target)
      .append('svg')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('role', 'img')
      .attr('aria-label', `${country.country} 2026 年 1 月至 6 月汽油零售价`);

    svg.append('text')
      .attr('x', margin.left)
      .attr('y', 12)
      .attr('class', 'price-strip-title')
      .text(`月末零售价 · ${country.currency}/L`);

    svg.append('text')
      .attr('x', width - margin.right)
      .attr('y', 12)
      .attr('text-anchor', 'end')
      .attr('class', 'price-peak-note')
      .text(`高点 ${months[peakIndex]}  ${peak.toFixed(digits)}`);

    svg.append('line')
      .attr('x1', margin.left)
      .attr('x2', width - margin.right)
      .attr('y1', y(0))
      .attr('y2', y(0))
      .attr('class', 'price-zero-line');

    const bars = svg.selectAll('g.price-month')
      .data(data)
      .join('g')
      .attr('class', 'price-month');

    bars.append('rect')
      .attr('x', (d) => x(d.month))
      .attr('y', y(0))
      .attr('width', x.bandwidth())
      .attr('height', 0)
      .attr('class', (d) => `price-bar month${d.isPeak ? ' peak' : ''}${d.isCurrent ? ' current' : ''}`)
      .transition()
      .duration(420)
      .delay((d) => d.index * 32)
      .ease(d3.easeCubicOut)
      .attr('y', (d) => y(d.value))
      .attr('height', (d) => y(0) - y(d.value));

    bars.append('text')
      .attr('x', (d) => x(d.month) + x.bandwidth() / 2)
      .attr('y', (d) => Math.max(margin.top + 8, y(d.value) - 5))
      .attr('text-anchor', 'middle')
      .attr('class', (d) => `price-value-label${d.isPeak || d.isCurrent ? ' is-key' : ''}`)
      .text((d) => d.value.toFixed(digits));

    bars.append('text')
      .attr('x', (d) => x(d.month) + x.bandwidth() / 2)
      .attr('y', height - 7)
      .attr('text-anchor', 'middle')
      .attr('class', 'price-code-label')
      .text((d) => d.month);
  }

  render(countries.find((country) => country.id === 'usa') || countries[0]);
  window.addEventListener('energy:country-change', (event) => render(event.detail?.country));
}

function initHeroField(reduceMotion) {
  const holder = document.getElementById('energy-hero-field');
  if (reduceMotion || !holder || !window.p5) return;

  const sketch = (p) => {
    let particles = [];
    let w = 0;
    let h = 0;

    function reset() {
      w = holder.clientWidth || window.innerWidth;
      h = holder.clientHeight || Math.max(520, window.innerHeight * 0.72);
      p.resizeCanvas(w, h);
      particles = Array.from({ length: 54 }, (_, index) => {
        const angle = -0.75 + index * 0.035 + p.random(-0.18, 0.18);
        const speed = p.random(0.18, 0.8);
        return {
          angle,
          speed,
          radius: p.random(18, 180),
          phase: p.random(0, 1000),
          tone: p.random() > 0.48 ? 'oil' : 'gas',
        };
      });
    }

    p.setup = () => {
      p.createCanvas(holder.clientWidth || window.innerWidth, holder.clientHeight || 620).parent(holder);
      p.pixelDensity(Math.min(2, window.devicePixelRatio || 1));
      reset();
    };

    p.windowResized = reset;

    p.draw = () => {
      p.clear();
      const originX = w * 0.55;
      const originY = h * 0.58;
      const t = p.millis() * 0.00018;

      p.noFill();
      for (let ring = 0; ring < 5; ring += 1) {
        const r = ((t * 480 + ring * 92) % 520) + 34;
        const alpha = p.map(r, 34, 554, 56, 0);
        p.stroke(232, 168, 56, alpha);
        p.strokeWeight(1);
        p.ellipse(originX, originY, r * 1.45, r * 0.64);
      }

      particles.forEach((particle, index) => {
        const drift = particle.radius + ((p.millis() * particle.speed * 0.045 + particle.phase) % 420);
        const curve = Math.sin(t * 9 + index) * 28;
        const x = originX + Math.cos(particle.angle) * drift;
        const y = originY + Math.sin(particle.angle) * drift * 0.56 + curve;
        const alpha = p.map(drift, 0, 560, 130, 0);
        if (particle.tone === 'oil') p.stroke(232, 168, 56, alpha);
        else p.stroke(42, 161, 152, alpha);
        p.strokeWeight(particle.tone === 'oil' ? 1.4 : 1);
        p.line(originX, originY, x, y);
        p.noStroke();
        if (particle.tone === 'oil') p.fill(232, 168, 56, alpha + 20);
        else p.fill(42, 161, 152, alpha + 20);
        p.circle(x, y, particle.tone === 'oil' ? 3.2 : 2.4);
      });
    };
  };

  window.__energyHeroField = new window.p5(sketch);
}
