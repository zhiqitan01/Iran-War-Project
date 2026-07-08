/**
 * price-story.js — 物价页动画故事版编排器
 *
 * 故事是引导层，科学图表是重点：
 *  Act0 第一人称天数计时器（代入） → Act1-4 四人翻卡（结果→原因）→ Act5 收敛回海峡。
 * 图表复用 window.PriceCharts（js/price-charts.js），本文件只做：挂载 + 滚动编排 + 桑基。
 */

document.addEventListener('DOMContentLoaded', () => {
  const PC = window.PriceCharts;
  if (!PC) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

  PC.injectStyles();
  const model = PC.createPriceModel();
  const C = PC.colors;

  mountCharts(model, reduce);
  initIllustrations();
  const lenis = initLenis(reduce, hasGsap);
  initHook(reduce, hasGsap);
  initFlipCards();
  initReveals(reduce, hasGsap);
  initProgress(hasGsap);
  if (hasGsap) ScrollTrigger.refresh();

  /* ---------- 挂载各幕图表 ---------- */
  function mountCharts(model, reduce) {
    const pick = sel => document.querySelector(`[data-chart="${sel}"]`);
    const downstream = PC.eventGroups.find(g => g.tag === 'downstream');

    // Act1 美国：下游价格曲线 + 成本占比 + 交互账单
    const usCurve = pick('us-curve');
    if (usCurve) {
      usCurve.innerHTML = `
        <div class="small-multiples" style="grid-template-columns:1fr">
          ${PC.buildGroupPanel(model, downstream)}
        </div>
        <div class="curve-insight" style="grid-template-columns:1fr">
          ${PC.scienceCard('EIA cost share', '57%', '原油约占美国普通汽油价的 57%。全球油价一涨，加油站几乎当天跟涨——这就是美国"不买伊朗油也买单"的机制。', C.amber)}
        </div>`;
    }
    const usReceipts = pick('us-receipts');
    if (usReceipts) PC.renderInteractiveReceipts(usReceipts, model);

    // Act2 中国：反应速度时间轴
    const cnReaction = pick('cn-reaction');
    if (cnReaction) {
      cnReaction.innerHTML = `
        <div class="reaction-block">
          <div class="reaction-head">
            <span class="mini-label">反应速度时间轴 · 谁先动</span>
            <p>圆点＝相对 2 月首次涨过 +10% 的月份，菱形＝到目前为止的高点。行按"先动"排序：越靠上，反应越快。</p>
          </div>
          ${PC.buildReactionTimeline(model)}
        </div>`;
    }

    // Act3 印度：传导桑基（气→尿素→补贴）
    const inSankey = pick('in-sankey');
    if (inSankey) buildSankey(inSankey, indiaSankeyData(), '天然气→氨→尿素的成本，大部分没有落到农民柜台价，而是流向政府补贴与下一季食品。', reduce);

    // Act4 伊朗：本地冲击卡
    const irLocal = pick('ir-local');
    if (irLocal) {
      irLocal.innerHTML = `
        <div class="receipt-grid" style="grid-template-columns:1fr;max-width:440px">
          ${PC.receiptCard({
            place: 'Iran / Tehran',
            tag: '本地冲击',
            local: true,
            title: '家庭买 30 张 lavash 面包',
            before: `${model.formulas.breadOld.toLocaleString()} toman`,
            after: `${model.formulas.breadNew.toLocaleString()} toman`,
            delta: '+93%',
            note: '真实价格案例（BBC Persian 报道）。本地食品 / 汇率综合冲击，不走全球油价传导，因此单独成类。',
            color: C.red,
          })}
        </div>`;
    }

    // Act5 收敛：主桑基 + 源头基线 + 数据原则
    const master = pick('master-sankey');
    if (master) buildSankey(master, masterSankeyData(), '顺着钱往回走：四张账单（除德黑兰本地冲击外）都汇聚到霍尔木兹这一个入口。线越宽，传导越强。', reduce);

    const baseline = pick('baseline');
    if (baseline) PC.renderBaseline(baseline, model);

    const cautions = pick('cautions');
    if (cautions) PC.renderDataCautions(cautions);
  }

  /* ---------- 桑基图 ---------- */
  function buildSankey(container, data, caption, reduce) {
    const width = 760;
    const height = data.height || 360;

    if (!(window.d3 && d3.sankey)) {
      // 兜底：d3 未加载时用简单链路文字
      container.innerHTML = `
        <div class="sankey-wrap"><p style="color:var(--text-muted);font-size:0.85rem;line-height:1.7">
          ${data.links.map(l => `${l.source} → ${l.target}`).join('； ')}
        </p></div>
        ${caption ? `<p class="sankey-caption">${caption}</p>` : ''}`;
      return;
    }

    container.innerHTML = `
      <div class="sankey-wrap"><svg class="sankey-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="价格传导桑基流向图"></svg></div>
      ${caption ? `<p class="sankey-caption">${caption}</p>` : ''}`;

    const colorByName = new Map(data.nodes.map(n => [n.name, n.color]));
    const svg = d3.select(container).select('svg');

    const sankey = d3.sankey()
      .nodeId(d => d.name)
      .nodeAlign(d3.sankeyJustify)
      .nodeWidth(13)
      .nodePadding(15)
      .extent([[6, 12], [width - 6, height - 16]]);

    const graph = sankey({
      nodes: data.nodes.map(d => ({ ...d })),
      links: data.links.map(d => ({ ...d })),
    });

    svg.append('g')
      .selectAll('path')
      .data(graph.links)
      .join('path')
      .attr('class', reduce ? 'sankey-link' : 'sankey-link flow')
      .attr('d', d3.sankeyLinkHorizontal())
      .attr('stroke', d => colorByName.get(d.source.name) || C.accent)
      .attr('stroke-width', d => Math.max(1.4, d.width))
      .append('title')
      .text(d => `${d.source.name} → ${d.target.name}`);

    const node = svg.append('g')
      .selectAll('g')
      .data(graph.nodes)
      .join('g')
      .attr('class', 'sankey-node');

    node.append('rect')
      .attr('x', d => d.x0)
      .attr('y', d => d.y0)
      .attr('height', d => Math.max(2, d.y1 - d.y0))
      .attr('width', d => d.x1 - d.x0)
      .attr('fill', d => d.color || C.accent)
      .append('title')
      .text(d => d.name);

    node.append('text')
      .attr('x', d => (d.x0 < width / 2 ? d.x1 + 7 : d.x0 - 7))
      .attr('y', d => (d.y0 + d.y1) / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', d => (d.x0 < width / 2 ? 'start' : 'end'))
      .text(d => d.name);
  }

  function indiaSankeyData() {
    return {
      height: 320,
      nodes: [
        { name: '天然气', color: C.blue },
        { name: '氨', color: C.blue },
        { name: '尿素', color: C.accent },
        { name: 'DAP', color: C.amber },
        { name: '政府补贴', color: C.red },
        { name: '农民柜台价', color: C.green },
        { name: '下一季食品', color: C.amber },
      ],
      links: [
        { source: '天然气', target: '氨', value: 80 },
        { source: '天然气', target: 'DAP', value: 22 },
        { source: '氨', target: '尿素', value: 74 },
        { source: '尿素', target: '政府补贴', value: 52 },
        { source: '尿素', target: '农民柜台价', value: 14 },
        { source: '尿素', target: '下一季食品', value: 8 },
        { source: 'DAP', target: '政府补贴', value: 16 },
        { source: 'DAP', target: '农民柜台价', value: 6 },
      ],
    };
  }

  function masterSankeyData() {
    return {
      height: 420,
      nodes: [
        { name: '霍尔木兹海峡', color: C.accent },
        { name: '原油', color: C.red },
        { name: '天然气', color: C.blue },
        { name: '化肥原料', color: C.accent },
        { name: '战争险', color: C.amber },
        { name: '汽油', color: C.red },
        { name: '电力/LNG', color: C.blue },
        { name: '尿素', color: C.accent },
        { name: '运费', color: C.amber },
        { name: '美国油费', color: C.amber },
        { name: '中国油箱', color: C.red },
        { name: '印度补贴', color: C.accent },
        { name: '日韩电费', color: C.blue },
      ],
      links: [
        { source: '霍尔木兹海峡', target: '原油', value: 100 },
        { source: '霍尔木兹海峡', target: '天然气', value: 60 },
        { source: '霍尔木兹海峡', target: '化肥原料', value: 38 },
        { source: '霍尔木兹海峡', target: '战争险', value: 24 },
        { source: '原油', target: '汽油', value: 92 },
        { source: '天然气', target: '电力/LNG', value: 42 },
        { source: '天然气', target: '尿素', value: 34 },
        { source: '化肥原料', target: '尿素', value: 30 },
        { source: '战争险', target: '运费', value: 24 },
        { source: '汽油', target: '美国油费', value: 50 },
        { source: '汽油', target: '中国油箱', value: 38 },
        { source: '电力/LNG', target: '日韩电费', value: 42 },
        { source: '尿素', target: '印度补贴', value: 58 },
        { source: '运费', target: '美国油费', value: 8 },
        { source: '运费', target: '印度补贴', value: 9 },
        { source: '运费', target: '日韩电费', value: 7 },
      ],
    };
  }

  /* ---------- 插画占位：图片存在则填充，缺失则保留占位 ---------- */
  function initIllustrations() {
    document.querySelectorAll('[data-illus]').forEach((el) => {
      const key = el.dataset.illus;
      if (!key) return;
      const src = `../assets/illustrations/illus-${key}.png`;
      const img = new Image();
      img.onload = () => {
        el.style.backgroundImage = `url("${src}")`;
        el.classList.add('has-img');
      };
      img.src = src;
    });
  }

  /* ---------- Act0：第一人称天数计时器 ---------- */
  function initHook(reduce, hasGsap) {
    const hook = document.getElementById('hook');
    const inner = document.getElementById('hook-inner');
    const dayNum = document.getElementById('day-num');
    const events = Array.from(document.querySelectorAll('.hook-event'));
    const riddle = document.getElementById('hook-riddle');
    if (!hook || !inner || !dayNum) return;

    if (reduce || !hasGsap) {
      dayNum.textContent = '30';
      events.forEach(e => { e.style.opacity = '1'; });
      if (riddle) riddle.style.opacity = '1';
      return;
    }

    gsap.set(events, { opacity: 0, y: 28 });
    gsap.set(riddle, { opacity: 0, y: 20 });

    const counter = { v: 0 };
    const setDay = () => { dayNum.textContent = Math.round(counter.v); };

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: hook,
        start: 'top top',
        end: '+=2800',
        scrub: 0.6,
        pin: inner,
        anticipatePin: 1,
      },
    });

    events.forEach((el) => {
      const day = Number(el.dataset.day) || 0;
      tl.to(counter, { v: day, duration: 0.7, ease: 'none', onUpdate: setDay });
      tl.to(el, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }, '<0.1');
    });
    tl.to(counter, { v: 30, duration: 0.5, ease: 'none', onUpdate: setDay });
    tl.to(riddle, { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out' }, '>0.1');
  }

  /* ---------- 翻卡：点击揭示答案与图表 ---------- */
  function initFlipCards() {
    document.querySelectorAll('.flip-card').forEach((card) => {
      const act = card.closest('.act');
      const toggle = () => {
        const flipped = card.classList.toggle('is-flipped');
        card.setAttribute('aria-expanded', flipped ? 'true' : 'false');
        if (act) act.classList.add('is-open'); // 一旦揭示，图表保持可见
      };
      card.addEventListener('click', toggle);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
      });
    });
  }

  /* ---------- 幕入场动画 ---------- */
  function initReveals(reduce, hasGsap) {
    if (reduce || !hasGsap) return;
    document.querySelectorAll('.act-head, .converge-block, .converge-head').forEach((el) => {
      gsap.from(el, {
        opacity: 0,
        y: 34,
        duration: 0.7,
        ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 82%' },
      });
    });
  }

  /* ---------- 顶部进度条 ---------- */
  function initProgress(hasGsap) {
    const bar = document.getElementById('story-progress');
    if (!bar) return;
    if (hasGsap) {
      ScrollTrigger.create({
        start: 0,
        end: 'max',
        onUpdate: (self) => { bar.style.width = `${(self.progress * 100).toFixed(2)}%`; },
      });
    } else {
      const onScroll = () => {
        const h = document.documentElement;
        const p = h.scrollTop / (h.scrollHeight - h.clientHeight || 1);
        bar.style.width = `${(p * 100).toFixed(2)}%`;
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }
  }

  /* ---------- Lenis 平滑滚动（与 ScrollTrigger 同步） ---------- */
  function initLenis(reduce, hasGsap) {
    if (reduce || !window.Lenis || !hasGsap) return null;
    const lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    lenis.on('scroll', () => ScrollTrigger.update());
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    return lenis;
  }
});
