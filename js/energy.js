/**
 * energy.js - single-map energy narrative
 *
 * One Leaflet map acts as the stage. Scrolling changes camera, layers, ship
 * behavior, event bubbles, invoice overlay, and global price markers.
 */

document.addEventListener('DOMContentLoaded', () => {
  const SCENE_TAKEOVER_DELAY = 1080;
  const SCENE_TAKEOVER_FADE = 180;
  const isFileProtocol = window.location.protocol === 'file:';

  const colors = {
    oil: '#e8a838',
    gas: '#2aa198',
    risk: '#d64030',
    text: '#ede9e0',
    muted: '#9a9490',
  };

  const baselineTraffic = {
    period: '2026 年 2 月初',
    dailyShips: 138,
    lowTransitShips: 8,
    criticalTransitShips: 3,
    source: 'JMIC / The Guardian / MarketWatch / WSJ',
    note: '公开报道给出的限制前日均通行量；地图船形用于表达密度，不代表逐艘 2 月历史坐标。',
  };

  const scenes = {
    'flow-before': {
      kicker: '01 / 2026 年 2 月初',
      title: '限制前，海峡仍维持高频通行',
      body: '2 月初，霍尔木兹海峡附近每日约 138 艘油气船通过。',
      metricLabel: '通行基线',
      metric: '约 138 艘/日',
      scaleLabel: '观察期',
      scale: '2 月初',
      center: [17.8, 73.5],
      zoom: 3,
      shipMode: 'flow',
      layerMode: 'strait',
    },
    blockade: {
      kicker: '02 / 2026 年 2 月 28 日',
      title: '通行限制后，船流降至个位数',
      body: '2 月 28 日后，过峡船舶明显减少。部分船只在海峡两端低速等待，航线、保险与装卸安排随之重估。',
      metricLabel: '低速/等待船舶',
      metric: '3—8 艘/日',
      scaleLabel: 'AIS 航速阈值',
      scale: '≤ 0.5 节',
      center: [26.35, 56.0],
      zoom: 7,
      shipMode: 'blocked',
      layerMode: 'blockade',
    },
    policy: {
      kicker: '03 / 2025 年 2 月',
      title: '船未开动，合同与保险已先调整',
      body: '2025 年 2 月，美国重启对伊朗“极限施压”。制裁、船籍审查和影子船队列名持续加码，船东、保险商和买家开始重新核验船籍、货主与目的港。',
      metricLabel: '海湾战争险',
      metric: '0.1% → ~1%',
      scaleLabel: '风险来源',
      scale: '制裁 / 审查',
      center: [26.6, 51.8],
      zoom: 5,
      shipMode: 'blocked',
      layerMode: 'events',
    },
    'open-close': {
      kicker: '04 / 2026 年 3 月',
      title: '反复开放与关闭推高等待成本',
      body: '3 月以后，护航、临时放行与再次收紧交替出现。即使船只不改道，等待、改港和审查也会按天进入运输成本。',
      metricLabel: '通行状态',
      metric: '反复开关',
      scaleLabel: '新增代价',
      scale: '等待 / 改港',
      center: [25.5, 58.2],
      zoom: 5,
      shipMode: 'staggered',
      layerMode: 'uncertain',
    },
    'world-routes': {
      kicker: '05 / 2026 年 3 月下旬',
      title: '一个窄口影响七条能源航线',
      body: '到 3 月下旬，通行已从正常水道变成少数船只试探通行。排队和保费进入运价后，影响沿原油、LNG 和成品油航线离开海湾。',
      metricLabel: '主要航线',
      metric: '7 条',
      scaleLabel: '影响范围',
      scale: '全球市场',
      center: [19, 38],
      zoom: 2,
      shipMode: 'world',
      layerMode: 'world',
    },
    voyage: {
      kicker: '06 / 2026 年 3 月 14 日',
      title: '其中一艘油轮，目的地是山东',
      body: '真实船位记录里，YUAN GUI YANG 在 3 月 14 日出现在海湾内，报港字段指向 CN SDG。镜头从全球收回到这一艘船，接上通往山东的后续航线。',
      metricLabel: '目的地代码',
      metric: 'CN SDG',
      scaleLabel: '航程',
      scale: '海湾 → 山东',
      center: [15.5, 89],
      zoom: 3,
      shipMode: 'focus',
      layerMode: 'voyage',
    },
    invoice: {
      kicker: '07 / 2026 年 3 月以后',
      title: '等待、改港与审查进入航程账单',
      body: 'S&P Global 报道称，海湾航程战争险可从低费率区间升至接近 1%，高点更高。以正常航程为 100，案例账单中的成本指数升至 210。',
      metricLabel: '成本指数',
      metric: '210',
      scaleLabel: '正常航程',
      scale: '基准 100',
      center: [25.2, 104],
      zoom: 3,
      shipMode: 'focus-arrived',
      layerMode: 'invoice',
    },
    'global-prices': {
      kicker: '08 / 2026 年 6 月 22 日',
      title: '海峡重开后，零售价格分化',
      body: '到 6 月 22 日，美国汽油价在 5 月见顶后回落，南非仍在上涨，沙特保持不变；同一场运输冲击，被各地税费、补贴和汇率改写。',
      metricLabel: '比较样本',
      metric: '13 国',
      scaleLabel: '观察区间',
      scale: '1—6 月',
      center: [18, 22],
      zoom: 2,
      shipMode: 'hidden',
      layerMode: 'prices',
    },
  };

  const eventBubbles = [
    {
      id: 'policy',
      point: [29.35, 49.55],
      anchor: [30.4, 52.0],
      label: '2025.02',
      title: '美国重启“极限施压”',
      body: '2025 年 2 月，白宫恢复针对伊朗石油出口及相关交易的最大压力政策。',
      detail: '船东、银行和保险商随后加强对货主、受益人、船籍和目的港的核验，审查时间进入租船与付款周期。',
      source: 'White House NSPM-2',
      impact: '合规审查',
    },
    {
      id: 'sanction',
      point: [27.85, 52.25],
      anchor: [28.8, 55.0],
      label: '2025-2026',
      title: '影子船队列名继续扩大',
      body: '美国财政部持续制裁参与伊朗能源运输的船舶、买家与中间商。',
      detail: '列名会触发拒保、付款延迟、港口服务受限和交易对手退出。制裁风险与海上安全风险同时进入报价。',
      source: 'U.S. Treasury',
      impact: '制裁列名',
    },
    {
      id: 'insurance',
      point: [25.0, 56.55],
      anchor: [23.9, 59.2],
      label: '战争险',
      title: '战争险从低费率区间跃升',
      body: 'S&P Global 称，海湾航程战争险可从约 0.1%-0.15% 升至接近 1%，高点约 2.5%。',
      detail: '战争险按船体价值计费，费率上升会迅速放大单航次支出；等待天数与改港安排还会继续增加成本。',
      source: 'S&P Global',
      impact: '战争险',
    },
  ];

  const fuelCountries = [
    { id: 'usa', abbr: 'US', country: '美国', continent: 'north-america', lat: 39.83, lng: -98.58, current: 1.13, currentVsBase: 32.9, peakVsBase: 49.4, currency: 'USD', currencyLabel: '美元', monthly: [0.85, 0.92, 1.14, 1.21, 1.27, 1.13] },
    { id: 'canada', abbr: 'CA', country: '加拿大', continent: 'north-america', lat: 56.13, lng: -106.35, current: 1.31, currentVsBase: 21.4, peakVsBase: 37.0, currency: 'CAD', currencyLabel: '加元', monthly: [1.54, 1.65, 1.97, 2.02, 2.11, 1.87] },
    { id: 'mexico', abbr: 'MX', country: '墨西哥', continent: 'north-america', lat: 23.63, lng: -102.55, current: 1.61, currentVsBase: 10.0, peakVsBase: 10.0, currency: 'MXN', currencyLabel: '墨西哥比索', monthly: [25.70, 25.59, 27.79, 28.15, 28.23, 28.26] },
    { id: 'germany', abbr: 'DE', country: '德国', continent: 'europe', lat: 51.17, lng: 10.45, current: 2.05, currentVsBase: 3.4, peakVsBase: 20.7, currency: 'EUR', currencyLabel: '欧元', monthly: [1.74, 1.84, 2.10, 2.07, 1.96, 1.80] },
    { id: 'uk', abbr: 'UK', country: '英国', continent: 'europe', lat: 54.7, lng: -3.3, current: 2.02, currentVsBase: 15.0, peakVsBase: 19.5, currency: 'GBP', currencyLabel: '英镑', monthly: [1.33, 1.33, 1.49, 1.58, 1.59, 1.53] },
    { id: 'china', abbr: 'CN', country: '中国', continent: 'asia', lat: 35.86, lng: 104.2, current: 1.26, currentVsBase: 17.0, peakVsBase: 29.2, currency: 'CNY', currencyLabel: '元', monthly: [7.29, 7.59, 9.20, 9.32, 9.42, 8.53] },
    { id: 'india', abbr: 'IN', country: '印度', continent: 'asia', lat: 20.59, lng: 78.96, current: 1.15, currentVsBase: 7.4, peakVsBase: 7.4, currency: 'INR', currencyLabel: '印度卢比', monthly: [101.26, 101.26, 101.20, 101.26, 108.71, 108.71] },
    { id: 'japan', abbr: 'JP', country: '日本', continent: 'asia', lat: 36.2, lng: 138.25, current: 1.05, currentVsBase: 9.0, peakVsBase: 14.7, currency: 'JPY', currencyLabel: '日元', monthly: [155.72, 156.25, 178.60, 168.99, 169.20, 169.70] },
    { id: 'saudi', abbr: 'SA', country: '沙特', continent: 'asia', lat: 23.89, lng: 45.08, current: 0.62, currentVsBase: 0.0, peakVsBase: 0.0, currency: 'SAR', currencyLabel: '沙特里亚尔', monthly: [2.33, 2.33, 2.33, 2.33, 2.33, 2.33] },
    { id: 'egypt', abbr: 'EG', country: '埃及', continent: 'africa', lat: 26.82, lng: 30.8, current: 0.48, currentVsBase: 13.6, peakVsBase: 13.6, currency: 'EGP', currencyLabel: '埃及镑', monthly: [21.13, 21.47, 24.00, 24.00, 24.00, 24.00] },
    { id: 'south-africa', abbr: 'ZA', country: '南非', continent: 'africa', lat: -30.56, lng: 22.94, current: 1.67, currentVsBase: 37.4, peakVsBase: 37.4, currency: 'ZAR', currencyLabel: '南非兰特', monthly: [20.11, 19.87, 19.89, 24.11, 26.20, 27.63] },
    { id: 'brazil', abbr: 'BR', country: '巴西', continent: 'south-america', lat: -14.24, lng: -51.93, current: 1.29, currentVsBase: 4.6, peakVsBase: 7.1, currency: 'BRL', currencyLabel: '巴西雷亚尔', monthly: [6.33, 6.30, 6.78, 6.76, 6.62, 6.62] },
    { id: 'australia', abbr: 'AU', country: '澳大利亚', continent: 'oceania', lat: -25.27, lng: 133.78, current: 1.16, currentVsBase: 4.4, peakVsBase: 43.8, currency: 'AUD', currencyLabel: '澳元', monthly: [1.60, 1.60, 2.30, 1.92, 1.84, 1.67] },
  ];

  window.__energyFuelCountries = fuelCountries;

  const fuelRegions = {
    global: {
      center: [18, 22],
      zoom: 2,
    },
    'north-america': {
      center: [43, -98],
      zoom: 3,
    },
    europe: {
      center: [51, 7],
      zoom: 4,
    },
    asia: {
      center: [28, 86],
      zoom: 3,
    },
    africa: {
      center: [-4, 24],
      zoom: 3,
    },
    'south-america': {
      center: [-15, -57],
      zoom: 3,
    },
    oceania: {
      center: [-25, 134],
      zoom: 4,
    },
  };

  const routes = {
    gulfOil: [
      [26.65, 50.17],
      [26.45, 52.7],
      [26.45, 56.2],
      [23.7, 61.5],
      [19.0, 72.8],
    ],
    iraqIndia: [
      [30.52, 47.82],
      [28.6, 50.2],
      [26.45, 56.2],
      [22.8, 62.0],
      [13.0, 80.2],
    ],
    qatarLng: [
      [25.93, 51.53],
      [26.35, 56.2],
      [20.2, 65.1],
      [6.9, 79.8],
      [35.2, 129.0],
    ],
    indiaWest: [
      [26.45, 56.2],
      [22.8, 62.4],
      [18.9, 72.8],
    ],
    china: [
      [26.45, 56.2],
      [20.2, 65.2],
      [6.8, 79.8],
      [1.3, 103.8],
      [22.3, 114.2],
    ],
    japanKorea: [
      [26.45, 56.2],
      [18.2, 66.4],
      [6.5, 79.5],
      [13.0, 100.5],
      [35.2, 129.0],
    ],
    west: [
      [26.45, 56.2],
      [18, 51],
      [12, 44],
      [20, 32],
      [35, 14],
      [51, 2],
    ],
    americas: [
      [26.45, 56.2],
      [12, 44],
      [-6, 39],
      [-28, 18],
      [-20, -20],
      [29, -94],
    ],
    africa: [
      [26.45, 56.2],
      [12, 44],
      [-5, 39],
      [-30, 23],
    ],
    oceania: [
      [26.45, 56.2],
      [6, 78],
      [-8, 106],
      [-25, 134],
    ],
  };

  const state = {
    map: null,
    currentScene: 'flow-before',
    shipMarkers: [],
    shipPositions: {},
    flowTracks: [],
    flowAnimationFrame: null,
    flowStartedAt: 0,
    focusAnimationFrame: null,
    focusStartedAt: 0,
    routeLayers: [],
    eventMarkers: [],
    eventLeader: null,
    eventLeaderAnchor: null,
    selectedEventId: null,
    fuelMarkers: [],
    riskLayers: [],
    focusShip: null,
    selectedRegion: 'global',
    selectedCountryId: 'usa',
    ais: null,
    focusTrackLayer: null,
    focusTrackGlow: null,
    focusDestinationLayer: null,
    focusDestinationGlow: null,
    scrollTicking: false,
    seaRoutes: null,
    sceneRevealTimer: null,
    sceneTakeoverTimer: null,
    sceneSequence: 0,
  };

  Promise.all([loadAisStory(), loadSeaRoutes()]).then(([aisData, seaRoutes]) => {
    state.ais = aisData;
    state.seaRoutes = seaRoutes;
    initMasterMap();
    initStoryControls();
    initRevealObserver();
  });

  async function loadAisStory() {
    try {
      const response = await fetch('../assets/data/hormuz_ais_story.json', { cache: 'no-store' });
      if (!response.ok) throw new Error(`AIS data request failed: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.warn(error);
      return null;
    }
  }

  async function loadSeaRoutes() {
    try {
      const response = await fetch('../assets/data/sea_routes.geojson', { cache: 'no-store' });
      if (!response.ok) throw new Error(`Sea routes request failed: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.warn(error);
      return null;
    }
  }

  function initMasterMap() {
    const container = document.getElementById('energy-master-map');
    if (!container) return;
    if (isFileProtocol) {
      container.innerHTML = '<span>地图数据需要通过本地服务器读取：请打开 http://127.0.0.1:8001/pages/energy.html</span>';
      initStaticFallback();
      return;
    }
    if (!window.L) {
      container.innerHTML = '<span>地图脚本未加载，请检查网络或使用本地服务器重新打开页面。</span>';
      initStaticFallback();
      return;
    }

    container.innerHTML = '';
    state.map = L.map('energy-master-map', {
      center: scenes['flow-before'].center,
      zoom: scenes['flow-before'].zoom,
      zoomSnap: 0.25,
      zoomDelta: 0.25,
      zoomControl: false,
      scrollWheelZoom: false,
      attributionControl: false,
      worldCopyJump: true,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19,
      updateWhenZooming: false,
      updateWhenIdle: true,
      keepBuffer: 2,
    }).addTo(state.map);
    L.control.zoom({ position: 'bottomright' }).addTo(state.map);
    state.map.on('move zoom resize', () => {
      if (state.selectedEventId) positionEventScreenLeader();
      positionInvoiceTransition();
    });

    state.flowTracks = normalizeTracks(state.ais?.flowTracks || []);
    createBaseRoutes();
    createRiskLayers();
    createShips();
    createEventBubbles();
    createFocusShip();
    createFuelMarkers();

    setMasterScene('flow-before', false);
    setTimeout(() => state.map.invalidateSize(), 250);
  }

  function initStaticFallback() {
    updateSceneText(scenes['flow-before']);
    updateTakeoverCard(scenes['flow-before']);
    updateEvidenceBadge('flow-before');
    document.querySelectorAll('.master-map-shell, .story-step').forEach((element) => {
      element.classList.add('is-visible');
    });
  }

  function createBaseRoutes() {
    const features = (state.seaRoutes && state.seaRoutes.features) || [];
    state.routeLayers = features
      .filter((feature) => feature.properties.mode !== 'focus')
      .map((feature) => {
        const coords = feature.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
        const color = feature.properties.role === 'gas' ? colors.gas : colors.oil;
        return {
          mode: feature.properties.mode,
          role: feature.properties.role,
          layer: drawRoute(coords, color, feature.properties.weight, feature.properties.label, feature.properties.dashArray),
        };
      });

    const localRouteCount = features.length ? 0 : 6;
    for (let index = 0; index < localRouteCount; index += 1) {
      const role = index % 2 === 0 ? 'oil' : 'gas';
      state.routeLayers.push({
        mode: 'strait-local',
        role,
        layer: drawRoute(
          baselineRouteFor(index),
          role === 'gas' ? colors.gas : colors.oil,
          index < 2 ? 3.6 : 2.2,
          '霍尔木兹海峡近景航道',
          index < 2 ? '' : '5 9'
        ),
      });
    }
  }

  function drawRoute(coords, color, weight, label, dashArray = '') {
    return L.polyline(coords, {
      color,
      weight,
      opacity: 0,
      dashArray,
      lineCap: 'round',
      lineJoin: 'round',
      smoothFactor: 1.1,
    }).addTo(state.map).bindTooltip(label, {
      className: 'master-map-tooltip',
      opacity: 0.94,
    });
  }

  function createRiskLayers() {
    const riskCircle = L.circle([26.55, 56.25], {
      radius: 165000,
      color: colors.risk,
      fillColor: colors.risk,
      fillOpacity: 0,
      opacity: 0,
      weight: 1.5,
      dashArray: '5 8',
    }).addTo(state.map);

    const gate = L.polyline([[26.08, 55.66], [26.72, 56.72]], {
      color: colors.risk,
      weight: 0,
      opacity: 0,
      lineCap: 'round',
    }).addTo(state.map).bindTooltip('封锁线', {
      className: 'master-map-tooltip',
      opacity: 0.94,
    });

    const hormuz = L.circleMarker([26.55, 56.25], {
      radius: 8,
      color: colors.risk,
      fillColor: colors.risk,
      fillOpacity: 0.9,
      weight: 2,
    }).addTo(state.map).bindTooltip('霍尔木兹海峡', {
      className: 'master-map-tooltip',
      opacity: 0.94,
    });

    state.riskLayers = [
      { id: 'circle', layer: riskCircle },
      { id: 'gate', layer: gate },
      { id: 'hormuz', layer: hormuz },
    ];
  }

  function createShips() {
    const movingShips = normalizeShips(state.ais?.movingShips || []);
    const waitingShips = normalizeShips(state.ais?.waitingShips || []);
    const transitShips = normalizeShips(state.ais?.transitEvents || []);
    state.flowTracks = normalizeTracks(state.ais?.flowTracks || []);
    const visibleMoving = movingShips.length ? movingShips : transitShips;
    const visibleWaiting = waitingShips.length ? waitingShips : visibleMoving;
    const count = Math.max(baselineTraffic.dailyShips, state.flowTracks.length || 0, visibleMoving.length, visibleWaiting.length, 1);

    state.shipPositions.flow = visibleMoving;
    state.shipPositions.blocked = visibleWaiting;
    state.shipPositions.staggered = interleaveShips(visibleWaiting, visibleMoving).slice(0, count);
    state.shipPositions.world = visibleMoving;

    for (let index = 0; index < count; index += 1) {
      const track = state.flowTracks[index] || null;
      const flowShip = visibleMoving[index] || null;
      const waitingShip = visibleWaiting[index] || null;
      const ship = track
        ? shipFromTrack(track, (index % 7) / 7)
        : flowShip || waitingShip || { lat: 26.55, lng: 56.25, name: '船位暂不可用', shipType: 'unknown' };
      const marker = L.marker([ship.lat, ship.lng], {
        icon: L.divIcon({
          className: 'master-ship-marker',
          html: shipGlyphHtml(ship, index),
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        }),
      }).addTo(state.map).bindTooltip(shipTooltip(ship, '航行中'), {
        className: 'ship-ais-tooltip',
        opacity: 0.95,
      });
      marker._shipStoryIndex = index;
      marker._flowTrack = track;
      marker._flowShip = flowShip;
      marker._waitingShip = waitingShip;
      marker._staggeredShip = state.shipPositions.staggered[index] || null;
      setMarkerBearing(marker, resolveShipBearing(ship, track ? routeBearingAt(track.coords, (index % 7) / 7) : 0));
      state.shipMarkers.push(marker);
    }

    updateEvidenceBadge();
  }

  function normalizeShips(ships) {
    return (ships || [])
      .filter((ship) => Number.isFinite(ship.lat) && Number.isFinite(ship.lng))
      .map((ship) => ({
        ...ship,
        name: ship.name || `MMSI ${ship.mmsi || 'unknown'}`,
        shipType: ship.shipType || 'unknown',
        speed: Number.isFinite(ship.speed) ? ship.speed : null,
        timestamp: ship.timestamp || '',
      }));
  }

  function normalizeTracks(tracks) {
    return (tracks || [])
      .map((track) => {
        const points = (track.points || [])
          .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));
        return {
          ...track,
          name: track.name || `MMSI ${track.mmsi || 'unknown'}`,
          shipType: track.shipType || 'unknown',
          destination: track.destination || '',
          points,
          coords: points.map((point) => [point.lat, point.lng]),
        };
      })
      .filter((track) => track.coords.length > 1);
  }

  function shipFromTrack(track, progress = 0) {
    const points = track.points || [];
    const index = Math.min(points.length - 1, Math.max(0, Math.round(progress * (points.length - 1))));
    const point = points[index] || {};
    const [lat, lng] = pointAlong(track.coords, progress);
    return {
      mmsi: track.mmsi,
      name: track.name,
      lat,
      lng,
      speed: Number.isFinite(point.speed) ? point.speed : null,
      course: routeBearingAt(track.coords, progress, point.course),
      timestamp: point.timestamp || '',
      destination: track.destination,
      shipType: track.shipType,
      length: track.length,
      width: track.width,
      flag: track.flag,
    };
  }

  function interleaveShips(primary, secondary) {
    const output = [];
    const max = Math.max(primary.length, secondary.length);
    for (let index = 0; index < max; index += 1) {
      if (primary[index]) output.push(primary[index]);
      if (secondary[index]) output.push(secondary[index]);
    }
    return output;
  }

  function shipTooltip(ship, label) {
    const speed = Number.isFinite(ship.speed) ? `${ship.speed.toFixed(1)} 节` : '航速暂无';
    const time = ship.timestamp ? `${ship.timestamp.slice(0, 16).replace('T', ' ')} UTC` : '时间暂无';
    const destination = ship.destination || ship.gate || '目的地暂无';
    return `<strong>${ship.name}</strong><span>${label} · MMSI ${ship.mmsi || '暂无'} · ${shipTypeLabel(ship.shipType)}</span><span>${speed} · ${time}</span><span>${destination}</span>`;
  }

  function baselineShipAt(index, progress) {
    const route = baselineRouteFor(index);
    const [lat, lng] = pointAlong(route, progress);
    const track = baselineTrackFor(index);
    const sampled = track ? shipFromTrack(track, progress) : null;
    const type = index % 5 === 0 ? 'cargo' : 'tanker';
    return {
      name: sampled?.name || '2 月通行基线',
      mmsi: sampled?.mmsi || null,
      lat,
      lng,
      speed: Number.isFinite(sampled?.speed) ? sampled.speed : 9.8 + pseudo(index * 19 + 7) * 4.2,
      course: routeBearingAt(route, progress),
      timestamp: sampled?.timestamp || '2026-02-03T12:00:00Z',
      destination: sampled?.destination || '霍尔木兹主航道',
      shipType: sampled?.shipType || type,
    };
  }

  function baselineRouteFor(index) {
    const ids = baselineSeaRouteIds();
    const route = seaRouteFeature(ids[index % ids.length]);
    if (route) return route;
    return offsetRoute(throughStraitRouteFor(index), index);
  }

  function baselineSeaRouteIds() {
    return ['gulfOil', 'iraqIndia', 'qatarLng', 'china', 'japanKorea', 'west', 'africa', 'oceania'];
  }

  function throughStraitRouteFor(index) {
    const eastbound = index % 3 !== 1;
    const lanes = [
      [[26.70, 52.20], [26.54, 53.25], [26.40, 54.25], [26.36, 55.10], [26.42, 55.82], [26.43, 56.18], [26.31, 56.54], [26.06, 57.12], [25.76, 57.96], [25.46, 59.00], [25.20, 60.25]],
      [[26.50, 52.10], [26.38, 53.15], [26.27, 54.16], [26.25, 55.02], [26.32, 55.76], [26.34, 56.12], [26.22, 56.48], [25.96, 57.06], [25.64, 57.88], [25.34, 58.92], [25.08, 60.10]],
      [[26.32, 52.00], [26.24, 53.06], [26.16, 54.08], [26.16, 54.96], [26.24, 55.70], [26.28, 56.06], [26.16, 56.42], [25.88, 56.98], [25.54, 57.78], [25.24, 58.76], [24.98, 59.92]],
    ];
    const lane = lanes[index % lanes.length];
    return eastbound ? lane : [...lane].reverse();
  }

  function baselineTrackFor(index) {
    const tracks = state.flowTracks || [];
    if (!tracks.length) return null;
    return tracks[index % tracks.length] || null;
  }

  function offsetRoute(coords, index) {
    if (!coords || coords.length < 2) return coords || [];
    const lane = (index % 7) - 3;
    const offset = lane * 0.0007 + (pseudo(index * 41 + 3) - 0.5) * 0.0006;
    return coords.map((point, pointIndex) => {
      const prev = coords[Math.max(0, pointIndex - 1)];
      const next = coords[Math.min(coords.length - 1, pointIndex + 1)];
      const bearing = bearingBetween(prev, next) * Math.PI / 180;
      const latOffset = Math.cos(bearing) * offset;
      const lngOffset = -Math.sin(bearing) * offset;
      return [point[0] + latOffset, point[1] + lngOffset];
    });
  }

  function baselineTooltip(ship) {
    return `<strong>2026 年 2 月初通行基线</strong><span>通常约 ${baselineTraffic.dailyShips} 艘/日 · ${shipTypeLabel(ship.shipType)}</span><span>图标按通行量铺陈；2 月逐船坐标未公开</span><span>${ship.destination}</span>`;
  }

  function shipTypeLabel(type) {
    const labels = {
      tanker: '油轮',
      cargo: '货船',
      passenger: '客船',
      service: '作业船',
      'small craft': '小型船',
      other: '其他船舶',
      unknown: '船型暂无',
    };
    return labels[type] || labels.unknown;
  }

  function shipGlyphHtml(ship, index = 0, focus = false) {
    const kind = ['tanker', 'cargo', 'passenger', 'service', 'small craft'].includes(ship.shipType)
      ? ship.shipType
      : 'cargo';
    const kindClass = kind.replace(/\s+/g, '-');
    const detail = kind === 'tanker'
      ? '<rect class="ship-tank" x="9" y="11" width="4.2" height="8" rx="1"/><rect class="ship-tank" x="14.8" y="11" width="4.2" height="8" rx="1"/>'
      : kind === 'cargo'
        ? '<rect class="ship-container" x="8.5" y="11" width="4.8" height="4" rx=".5"/><rect class="ship-container" x="14.7" y="11" width="4.8" height="4" rx=".5"/><rect class="ship-container" x="11.6" y="16" width="4.8" height="4" rx=".5"/>'
        : '<path class="ship-deck-detail" d="M9.5 12.5h9v6h-9z"/>';
    return `<span class="ship-glyph ship-glyph--${kindClass}${focus ? ' ship-glyph--focus' : ''}" style="--ship-bearing:${resolveShipBearing(ship, 0)}deg;--ship-delay:${(index % 18) * 0.13}s">
      <svg viewBox="0 0 28 32" aria-hidden="true" focusable="false">
        <path class="ship-wake" d="M14 29 L8 32 M14 29 L20 32"/>
        <path class="ship-hull" d="M14 1.5 C18.8 4.5 21.5 9.2 21.5 16.5 L19.5 27.5 H8.5 L6.5 16.5 C6.5 9.2 9.2 4.5 14 1.5 Z"/>
        <path class="ship-deck" d="M14 4.8 C17 7.2 18.5 10.6 18.5 16.4 L17.4 23.8 H10.6 L9.5 16.4 C9.5 10.6 11 7.2 14 4.8 Z"/>
        ${detail}
        <rect class="ship-bridge" x="9.2" y="21.2" width="9.6" height="3.2" rx=".8"/>
        <path class="ship-centerline" d="M14 5.5v4"/>
      </svg>
    </span>`;
  }

  function setMarkerBearing(marker, bearing) {
    const glyph = marker?.getElement()?.querySelector('.ship-glyph');
    if (glyph && Number.isFinite(bearing)) glyph.style.setProperty('--ship-bearing', `${bearing}deg`);
  }

  function resolveShipBearing(ship, fallback = 0) {
    const heading = Number(ship?.heading);
    if (Number.isFinite(heading) && heading >= 0 && heading < 360) return heading;
    const course = Number(ship?.course);
    if (Number.isFinite(course) && course >= 0 && course < 360) return course;
    return Number.isFinite(fallback) ? fallback : 0;
  }

  function updateEvidenceBadge(sceneKey = state.currentScene) {
    const badge = document.getElementById('ais-source-badge');
    if (!badge) return;
    if (sceneKey === 'flow-before') {
      badge.innerHTML = `<span>通行基线 · ${baselineTraffic.period}</span><strong>通常约 ${baselineTraffic.dailyShips} 艘/日</strong>`;
      badge.title = baselineTraffic.note;
      return;
    }
    const source = state.ais?.source;
    if (!source) {
      badge.innerHTML = '<span>船位数据暂不可用</span><strong>无法读取船位数据</strong>';
      return;
    }
    const verifiedTracks = source.quality?.selectedTracks || state.flowTracks.length;
    badge.innerHTML = `<span>船位样本 · ${source.timeStart.slice(0, 10)} 至 ${source.timeEnd.slice(0, 10)}</span><strong>${verifiedTracks} 段航迹 / ${state.shipPositions.blocked.length} 个低速等待点</strong>`;
    badge.title = source.method || source.title || '';
  }

  function startFlowAnimation() {
    stopFlowAnimation();
    state.flowStartedAt = performance.now();
    const animate = (now) => {
      if (state.currentScene !== 'flow-before') return;
      state.shipMarkers.forEach((marker, index) => {
        const progress = flowProgressFor(index, now - state.flowStartedAt);
        const ship = baselineShipAt(index, progress);
        marker.setLatLng([ship.lat, ship.lng]);
        setMarkerBearing(marker, ship.course);
      });
      state.flowAnimationFrame = window.requestAnimationFrame(animate);
    };
    state.flowAnimationFrame = window.requestAnimationFrame(animate);
  }

  function flowProgressFor(index, elapsed) {
    const seed = pseudo(index * 97 + 11);
    const duration = 18000 + (index % 13) * 930 + seed * 3800;
    const phase = (index * 0.61803398875 + seed * 0.17) % 1;
    const raw = ((elapsed / duration) + phase) % 1;
    const surge = Math.sin((raw * 2.6 + seed) * Math.PI * 2) * 0.028;
    const smallCorrection = Math.sin((raw * 7.5 + seed * 3) * Math.PI * 2) * 0.009;
    const gateSlowdown = Math.exp(-Math.pow((raw - 0.52) / 0.16, 2)) * (0.035 + seed * 0.025);
    const progress = raw + surge + smallCorrection - gateSlowdown;
    return (progress % 1 + 1) % 1;
  }

  function stopFlowAnimation() {
    if (state.flowAnimationFrame) {
      window.cancelAnimationFrame(state.flowAnimationFrame);
      state.flowAnimationFrame = null;
    }
  }

  function startFocusVoyageAnimation() {
    stopFocusVoyageAnimation();
    if (!state.focusShip) return;
    const route = getFullFocusRoute();
    if (route.length < 2) return;
    state.focusStartedAt = performance.now();
    const animate = (now) => {
      if (state.currentScene !== 'voyage') return;
      const loop = ((now - state.focusStartedAt) / 18000) % 1;
      const progress = 0.1 + loop * 0.82;
      state.focusShip.setLatLng(pointAlong(route, progress));
      setMarkerBearing(state.focusShip, routeBearingAt(route, progress));
      positionInvoiceTransition();
      state.focusAnimationFrame = window.requestAnimationFrame(animate);
    };
    state.focusAnimationFrame = window.requestAnimationFrame(animate);
  }

  function stopFocusVoyageAnimation() {
    if (state.focusAnimationFrame) {
      window.cancelAnimationFrame(state.focusAnimationFrame);
      state.focusAnimationFrame = null;
    }
  }

  function makeShipPositions(count, mode) {
    const output = [];
    const lane = [
      [27.4, 51.2],
      [26.7, 53.5],
      [26.45, 56.2],
      [25.2, 58.8],
      [23.6, 61.5],
    ];
    for (let index = 0; index < count; index += 1) {
      const seed = (index + 3) * 71;
      if (mode === 'blocked') {
        const west = index % 2 === 0;
        const base = west ? [26.55, 54.38] : [25.55, 58.16];
        output.push([
          base[0] + (pseudo(seed) - 0.5) * 1.05,
          base[1] + (pseudo(seed + 11) - 0.5) * 0.9,
        ]);
        continue;
      }
      if (mode === 'staggered') {
        const base = index % 3 === 0 ? [26.4, 56.0] : index % 3 === 1 ? [25.55, 58.2] : [26.6, 54.4];
        output.push([
          base[0] + (pseudo(seed) - 0.5) * 1.25,
          base[1] + (pseudo(seed + 17) - 0.5) * 1.1,
        ]);
        continue;
      }
      if (mode === 'world') {
        const pickFrom = ['west', 'qatarLng', 'africa', 'oceania'];
        const fid = pickFrom[index % 4];
        const seaCoords = seaRouteFeature(fid);
        const route = seaCoords || routes[fid];
        output.push(pointAlong(route, pseudo(seed)));
        continue;
      }
      output.push(pointAlong(lane, index / (count - 1)));
    }
    return output;
  }

  function createEventBubbles() {
    state.eventMarkers = eventBubbles.map((event) => {
      const marker = L.marker(event.point, {
        icon: L.divIcon({
          className: 'event-pin-marker',
          html: `<button type="button" class="event-pin" aria-label="查看事件：${event.title}"><span>${event.label}</span><strong>${event.impact}</strong></button>`,
          iconSize: [92, 46],
          iconAnchor: [46, 23],
        }),
      }).addTo(state.map);
      marker.on('click', () => selectEvent(event.id, true));
      marker._eventId = event.id;
      return { event, marker };
    });

    const close = document.getElementById('event-detail-close');
    if (close) close.addEventListener('click', () => hideEventDetail());
  }

  function selectEvent(eventId, moveMap = false) {
    const event = eventBubbles.find((item) => item.id === eventId) || eventBubbles[0];
    if (!event || !state.map) return;
    state.selectedEventId = event.id;

    const panel = document.getElementById('event-detail-panel');
    const date = document.getElementById('event-detail-date');
    const title = document.getElementById('event-detail-title');
    const body = document.getElementById('event-detail-body');
    const detail = document.getElementById('event-detail-note');
    const source = document.getElementById('event-detail-source');
    if (panel) panel.classList.add('is-visible');
    if (date) date.textContent = event.label;
    if (title) title.textContent = event.title;
    if (body) body.textContent = event.body;
    if (detail) detail.textContent = event.detail;
    if (source) source.textContent = event.source;

    state.eventMarkers.forEach(({ marker }) => {
      const el = marker.getElement();
      if (el) el.classList.toggle('is-active', marker._eventId === event.id);
    });

    if (state.eventLeader) state.map.removeLayer(state.eventLeader);
    if (state.eventLeaderAnchor) state.map.removeLayer(state.eventLeaderAnchor);
    state.eventLeader = L.polyline([event.point, event.anchor], {
      color: colors.oil,
      weight: 1.4,
      opacity: 0.86,
      dashArray: '5 7',
      className: 'event-leader-line',
    }).addTo(state.map);
    state.eventLeaderAnchor = L.circleMarker(event.anchor, {
      radius: 3,
      color: colors.oil,
      fillColor: colors.oil,
      fillOpacity: 0.9,
      opacity: 0.9,
      weight: 1,
      className: 'event-leader-anchor',
    }).addTo(state.map);

    if (moveMap) {
      const center = [
        (event.point[0] + event.anchor[0]) / 2,
        (event.point[1] + event.anchor[1]) / 2,
      ];
      state.map.flyTo(center, Math.max(state.map.getZoom(), 5), { duration: 0.55, easeLinearity: 0.3 });
    }
    window.requestAnimationFrame(() => positionEventScreenLeader(event));
  }

  function hideEventDetail() {
    const panel = document.getElementById('event-detail-panel');
    if (panel) panel.classList.remove('is-visible');
    const screenLeader = document.getElementById('event-screen-leader');
    if (screenLeader) screenLeader.classList.remove('is-visible');
    state.eventMarkers.forEach(({ marker }) => {
      const el = marker.getElement();
      if (el) el.classList.remove('is-active');
    });
    if (state.eventLeader) {
      state.map.removeLayer(state.eventLeader);
      state.eventLeader = null;
    }
    if (state.eventLeaderAnchor) {
      state.map.removeLayer(state.eventLeaderAnchor);
      state.eventLeaderAnchor = null;
    }
  }

  function positionEventScreenLeader(event = null) {
    if (!state.map) return;
    const selected = event || eventBubbles.find((item) => item.id === state.selectedEventId);
    const panel = document.getElementById('event-detail-panel');
    const svg = document.getElementById('event-screen-leader');
    const line = document.getElementById('event-screen-leader-line');
    const dot = document.getElementById('event-screen-leader-dot');
    const shell = document.querySelector('.master-map-shell');
    if (!selected || !panel || !svg || !line || !dot || !shell || !panel.classList.contains('is-visible')) return;

    const shellRect = shell.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const point = state.map.latLngToContainerPoint(selected.point);
    const panelLeft = panelRect.left - shellRect.left;
    const panelRight = panelRect.right - shellRect.left;
    const panelTop = panelRect.top - shellRect.top;
    const panelBottom = panelRect.bottom - shellRect.top;
    const endX = Math.abs(point.x - panelLeft) <= Math.abs(point.x - panelRight) ? panelLeft : panelRight;
    const endY = Math.max(panelTop + 28, Math.min(panelBottom - 28, point.y));

    line.setAttribute('x1', point.x);
    line.setAttribute('y1', point.y);
    line.setAttribute('x2', endX);
    line.setAttribute('y2', endY);
    dot.setAttribute('cx', point.x);
    dot.setAttribute('cy', point.y);
    svg.classList.add('is-visible');
  }

  function createFocusShip() {
    const focus = state.ais?.focusVessel;
    const track = getFocusTrack();
    const destination = getDestinationRoute();
    const fullRoute = getFullFocusRoute();
    state.focusTrackGlow = L.polyline(track, {
      color: colors.oil,
      weight: 14,
      opacity: 0,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(state.map);
    state.focusTrackLayer = L.polyline(track, {
      color: colors.risk,
      weight: 4,
      opacity: 0,
      dashArray: '10 7',
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(state.map).bindTooltip(focus ? `${focus.name} · 实际航迹` : '实际航迹', {
      className: 'master-map-tooltip',
      opacity: 0.94,
    });
    state.focusDestinationGlow = L.polyline(destination, {
      color: colors.oil,
      weight: 12,
      opacity: 0,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(state.map);
    state.focusDestinationLayer = L.polyline(destination, {
      color: colors.oil,
      weight: 3.2,
      opacity: 0,
      dashArray: '9 10',
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(state.map).bindTooltip(focus ? `${focus.name} · 依据 CN SDG 推定的航线` : '依据目的地推定的中国航线', {
      className: 'master-map-tooltip',
      opacity: 0.94,
    });

    state.focusShip = L.marker(fullRoute[0], {
      icon: L.divIcon({
        className: 'focus-ship-marker',
        html: `<div class="focus-ship-ring">${shipGlyphHtml(focus || { shipType: 'tanker' }, 0, true)}</div>`,
        iconSize: [62, 62],
        iconAnchor: [31, 31],
      }),
    }).addTo(state.map).bindTooltip(focusShipTooltip(), {
      className: 'ship-ais-tooltip',
      opacity: 0.96,
    });
    state.focusShip.on('click', () => {
      if (state.currentScene === 'voyage' || state.currentScene === 'invoice') {
        setMasterScene('invoice', true);
      }
    });
    setMarkerBearing(state.focusShip, routeBearingAt(fullRoute, 0));

    updateInvoiceVessel();
  }

  function getFocusTrack() {
    const points = state.ais?.focusVessel?.points || [];
    const track = points
      .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng))
      .map((point) => [point.lat, point.lng]);
    if (track.length > 1) return track;
    const gulfOil = seaRouteFeature('gulfOil');
    if (gulfOil) return gulfOil;
    return routes.iraqIndia;
  }

  function getDestinationRoute() {
    const focusFeature = seaRouteFeature('focusDestination');
    if (focusFeature) return focusFeature;
    const points = state.ais?.focusVessel?.destinationRoute || [];
    const route = points
      .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng))
      .map((point) => [point.lat, point.lng]);
    return route.length > 1 ? route : routes.china;
  }

  function seaRouteFeature(id) {
    const features = (state.seaRoutes && state.seaRoutes.features) || [];
    const feature = features.find((item) => item.properties.id === id);
    if (!feature) return null;
    return feature.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
  }

  function getFullFocusRoute() {
    const track = getFocusTrack();
    const destination = getDestinationRoute();
    if (destination.length < 2) return track;
    return track.concat(destination.slice(1));
  }

  function focusShipTooltip() {
    const focus = state.ais?.focusVessel;
    if (!focus) return '<strong>焦点船舶</strong><span>船位记录暂不可用</span>';
    return `<strong>${focus.name}</strong><span>MMSI ${focus.mmsi} · ${shipTypeLabel(focus.shipType)} · 船旗 ${focus.flag || '暂无'}</span><span>${focus.length || '暂无'} 米 × ${focus.width || '暂无'} 米 · 目的地 ${focus.destination || '暂无'}</span>`;
  }

  function updateInvoiceVessel() {
    const focus = state.ais?.focusVessel;
    if (!focus) return;
    const name = document.getElementById('invoice-vessel-name');
    const basis = document.getElementById('invoice-ais-basis');
    const source = document.getElementById('invoice-source-line');
    if (name) name.textContent = `${focus.name} / MMSI ${focus.mmsi}`;
    if (basis) basis.textContent = '实际航迹 + 成本指数（基准 = 100）';
    if (source) {
      const first = focus.points?.[0]?.timestamp?.slice(0, 10) || '船位记录';
      const last = focus.points?.[focus.points.length - 1]?.timestamp?.slice(0, 10) || 'track';
      source.textContent = `实线为 ${focus.name} 在 ${first} 至 ${last} 的实际航迹；虚线依据目的地 ${focus.destination || '暂无'} 接入海运网络。`;
    }
  }

  function createFuelMarkers() {
    state.fuelMarkers = fuelCountries.map((country) => {
      const marker = L.marker([country.lat, country.lng], {
        icon: L.divIcon({
          className: 'fuel-country-marker',
          html: `<div class="fuel-marker ${trendClass(country.currentVsBase)}"><span>${country.abbr}</span><strong>${formatPercent(country.currentVsBase)}</strong></div>`,
          iconSize: [68, 68],
          iconAnchor: [34, 34],
        }),
      }).addTo(state.map);

      marker.bindTooltip(
        `<strong>${country.country}</strong><span>6 月 22 日 ${formatUsd(country.current)}/L · 较 1 月 ${formatPercent(country.currentVsBase)} · 年内高点 ${formatPercent(country.peakVsBase)}</span>`,
        { className: 'fuel-map-tooltip', opacity: 0.96 }
      );
      marker.on('click', () => {
        setFuelRegion(country.continent, country.id, true);
      });
      return { country, marker };
    });
  }

  function initStoryControls() {
    document.querySelectorAll('.story-step, .map-timeline-ribbon button').forEach((el) => {
      el.addEventListener('click', () => {
        const scene = el.dataset.scene || 'flow-before';
        setMasterScene(scene, true);
        if (el.matches('.map-timeline-ribbon button')) {
          const step = document.querySelector(`.story-step[data-scene="${scene}"]`);
          if (step) step.scrollIntoView({ block: 'center', behavior: 'auto' });
        }
      });
    });

    document.querySelectorAll('.region-tabs button').forEach((button) => {
      button.addEventListener('click', () => setFuelRegion(button.dataset.region || 'global', null, true));
    });

    const steps = document.querySelectorAll('.story-step');
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) activateSceneFromScroll();
    }, { rootMargin: '-28% 0px -48% 0px', threshold: [0.24, 0.45, 0.72] });

    steps.forEach((step) => observer.observe(step));
    window.addEventListener('scroll', () => {
      if (state.scrollTicking) return;
      state.scrollTicking = true;
      window.requestAnimationFrame(() => {
        activateSceneFromScroll();
        state.scrollTicking = false;
      });
    }, { passive: true });
    window.addEventListener('resize', () => window.requestAnimationFrame(positionInvoiceTransition));
    activateSceneFromScroll();
  }

  function activateSceneFromScroll() {
    const steps = Array.from(document.querySelectorAll('.story-step'));
    if (!steps.length) return;
    const board = document.querySelector('.story-board');
    if (board && window.scrollY < 24 && board.getBoundingClientRect().top > window.innerHeight * 0.18) {
      if (state.currentScene !== 'flow-before') setMasterScene('flow-before', true);
      return;
    }
    const activationLine = window.innerHeight * 0.52;
    let active = null;
    let closestDistance = Infinity;
    steps.forEach((step) => {
      const rect = step.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      const stepCenter = rect.top + rect.height / 2;
      const distance = Math.abs(stepCenter - activationLine);
      if (distance < closestDistance) {
        closestDistance = distance;
        active = step;
      }
    });
    if (active && active.dataset.scene && active.dataset.scene !== state.currentScene) {
      setMasterScene(active.dataset.scene, true);
    }
  }

  function setMasterScene(sceneKey, fly = true) {
    const key = scenes[sceneKey] ? sceneKey : 'flow-before';
    const scene = scenes[key];
    const shell = document.querySelector('.master-map-shell');
    const sequence = state.sceneSequence + 1;
    state.sceneSequence = sequence;
    state.currentScene = key;

    if (state.sceneRevealTimer) window.clearTimeout(state.sceneRevealTimer);
    if (state.sceneTakeoverTimer) window.clearTimeout(state.sceneTakeoverTimer);

    document.querySelectorAll('.story-step, .map-timeline-ribbon button').forEach((el) => {
      el.classList.toggle('is-active', (el.dataset.scene || '') === key);
    });

    updateSceneText(scene);
    updateTakeoverCard(scene);
    updateEvidenceBadge(key);
    setInvoiceVisible(key === 'invoice');
    setShipPromptVisible(key === 'voyage');
    setPricePanelVisible(key === 'global-prices');
    if (key !== 'global-prices') {
      state.fuelMarkers.forEach(({ marker }) => {
        const el = marker.getElement();
        if (el) el.classList.remove('is-visible', 'is-muted', 'is-context');
      });
    }
    if (shell) {
      shell.dataset.scene = key;
      shell.classList.toggle('is-taking-over', fly);
      const takeover = document.getElementById('chapter-takeover');
      if (takeover) takeover.setAttribute('aria-hidden', fly ? 'false' : 'true');
    }

    const applyEvidence = () => {
      if (sequence !== state.sceneSequence) return;
      applySceneEvidence(key, scene, fly);
      if (shell && fly) {
        state.sceneTakeoverTimer = window.setTimeout(() => {
          if (sequence !== state.sceneSequence) return;
          shell.classList.remove('is-taking-over');
          const takeover = document.getElementById('chapter-takeover');
          if (takeover) takeover.setAttribute('aria-hidden', 'true');
        }, SCENE_TAKEOVER_FADE);
      }
    };

    if (!fly) {
      applyEvidence();
      return;
    }

    state.sceneRevealTimer = window.setTimeout(applyEvidence, SCENE_TAKEOVER_DELAY);
  }

  function applySceneEvidence(key, scene, fly) {
    if (state.map) {
      const move = fly ? state.map.flyTo.bind(state.map) : state.map.setView.bind(state.map);
      move(scene.center, scene.zoom, fly ? { duration: 0.85, easeLinearity: 0.25 } : undefined);
    }

    setShipMode(scene.shipMode);
    setLayerMode(scene.layerMode);
    setInvoiceVisible(key === 'invoice');
    setShipPromptVisible(key === 'voyage');
    setPricePanelVisible(key === 'global-prices');
    if (key === 'global-prices') setFuelRegion(state.selectedRegion || 'global', state.selectedCountryId, true);
  }

  function updateSceneText(scene) {
    const kicker = document.getElementById('master-scene-kicker');
    const title = document.getElementById('master-scene-title');
    const body = document.getElementById('master-scene-body');
    const metricLabel = document.getElementById('master-metric-label-main');
    const metric = document.getElementById('master-metric-main');
    const scaleLabel = document.getElementById('master-metric-label-scale');
    const scale = document.getElementById('master-metric-scale');
    if (kicker) kicker.textContent = scene.kicker;
    if (title) title.textContent = scene.title;
    if (body) body.textContent = scene.body;
    if (metricLabel) metricLabel.textContent = scene.metricLabel;
    if (metric) metric.textContent = scene.metric;
    if (scaleLabel) scaleLabel.textContent = scene.scaleLabel;
    if (scale) scale.textContent = scene.scale;
  }

  function updateTakeoverCard(scene) {
    const kicker = document.getElementById('chapter-takeover-kicker');
    const title = document.getElementById('chapter-takeover-title');
    const body = document.getElementById('chapter-takeover-body');
    const metricLabel = document.getElementById('chapter-takeover-label-metric');
    const metric = document.getElementById('chapter-takeover-metric');
    const scaleLabel = document.getElementById('chapter-takeover-label-scale');
    const scale = document.getElementById('chapter-takeover-scale');
    if (kicker) kicker.textContent = scene.kicker;
    if (title) title.textContent = scene.title;
    if (body) body.textContent = scene.body;
    if (metricLabel) metricLabel.textContent = scene.metricLabel;
    if (metric) metric.textContent = scene.metric;
    if (scaleLabel) scaleLabel.textContent = scene.scaleLabel;
    if (scale) scale.textContent = scene.scale;
  }

  function setShipMode(mode) {
    stopFlowAnimation();
    stopFocusVoyageAnimation();
    const visible = mode !== 'hidden';
    const focusOnly = mode === 'focus' || mode === 'focus-arrived';
    state.shipMarkers.forEach((marker, index) => {
      const ship = mode === 'blocked'
        ? marker._waitingShip
        : mode === 'staggered'
          ? marker._staggeredShip
          : marker._flowShip || (marker._flowTrack ? shipFromTrack(marker._flowTrack, 0) : null);
      const el = marker.getElement();
      const worldPos = mode === 'world' ? makeShipPositions(state.shipMarkers.length, 'world')[index] : null;
      if (mode === 'flow') {
        const startingShip = baselineShipAt(index, flowProgressFor(index, 0));
        marker.setLatLng([startingShip.lat, startingShip.lng]);
        setMarkerBearing(marker, startingShip.course);
        if (marker.getTooltip()) marker.setTooltipContent(baselineTooltip(startingShip));
      } else if (worldPos && index < 36) {
        marker.setLatLng(worldPos);
        setMarkerBearing(marker, resolveShipBearing(ship || marker._waitingShip, 0));
        if (marker.getTooltip()) marker.setTooltipContent(shipTooltip(ship || marker._waitingShip, '受影响航线 · 位置示意'));
      } else if (ship) {
        marker.setLatLng([ship.lat, ship.lng]);
        setMarkerBearing(marker, resolveShipBearing(ship, 0));
        if (marker.getTooltip()) marker.setTooltipContent(shipTooltip(ship, mode === 'blocked' || mode === 'staggered' ? '低速等待' : '航行中'));
      }
      if (el) {
        const hasScenePosition = mode === 'world'
          ? index < 36
          : mode === 'blocked'
            ? !!marker._waitingShip
            : mode === 'staggered'
              ? !!marker._staggeredShip
              : true;
        el.style.opacity = visible && hasScenePosition ? (focusOnly ? 0.06 : mode === 'world' ? 0.26 : 0.9) : 0;
        el.classList.toggle('is-flowing', mode === 'flow');
        el.classList.toggle('is-blocked', mode === 'blocked' || mode === 'staggered');
        el.classList.toggle('is-world', mode === 'world');
      }
    });
    if (mode === 'flow') startFlowAnimation();

    if (!state.focusShip) return;
    const focusEl = state.focusShip.getElement();
    const focusVisible = mode === 'focus' || mode === 'focus-arrived';
    const fullRoute = getFullFocusRoute();
    const pos = mode === 'focus-arrived' ? fullRoute[fullRoute.length - 1] : pointAlong(fullRoute, 0.28);
    state.focusShip.setLatLng(pos);
    setMarkerBearing(state.focusShip, routeBearingAt(fullRoute, mode === 'focus-arrived' ? 1 : 0.28));
    if (focusEl) {
      focusEl.classList.toggle('is-visible', focusVisible);
      focusEl.classList.toggle('is-clickable', mode === 'focus');
    }
    if (mode === 'focus') startFocusVoyageAnimation();
  }

  function setLayerMode(mode) {
    state.routeLayers.forEach(({ mode: routeMode, role, layer }) => {
      let opacity = 0;
      let weight = role === 'gas' ? 3 : 3.5;
      let color = role === 'gas' ? colors.gas : colors.oil;

      if (mode === 'strait') {
        if (routeMode === 'strait') {
          opacity = 0.68;
          weight = role === 'gas' ? 3.2 : 3.8;
        }
        if (routeMode === 'world') {
          opacity = 0.34;
          weight = role === 'gas' ? 2.2 : 2.6;
        }
        if (routeMode === 'strait-local') {
          opacity = 0.82;
          weight = role === 'gas' ? 3.4 : 4.2;
        }
      }
      if (mode === 'blockade' && routeMode === 'strait-local') {
        opacity = 0;
        color = colors.risk;
      }
      if ((mode === 'events' || mode === 'uncertain') && routeMode === 'strait-local') {
        opacity = 0.72;
        weight = 4.5;
        color = mode === 'uncertain' ? colors.risk : color;
      }
      if (mode === 'world' && routeMode === 'world') {
        opacity = 0.66;
        weight = 3.2;
      }
      if (mode === 'voyage' || mode === 'invoice') {
        opacity = routeMode === 'strait-local' ? 0.08 : 0;
        weight = 2;
      }
      if (mode === 'prices' && routeMode === 'world') opacity = 0.18;

      layer.setStyle({ opacity, weight, color });
    });

    state.riskLayers.forEach(({ id, layer }) => {
      const riskOn = mode === 'blockade' || mode === 'events' || mode === 'uncertain';
      if (id === 'circle') {
        layer.setStyle({ opacity: riskOn ? 0.8 : 0, fillOpacity: riskOn ? 0.14 : 0 });
      }
      if (id === 'gate') {
        layer.setStyle({ opacity: mode === 'blockade' || mode === 'uncertain' ? 0.95 : 0, weight: mode === 'blockade' ? 9 : 5 });
      }
    });

    const eventsVisible = mode === 'events' || mode === 'uncertain';
    state.eventMarkers.forEach(({ marker }) => {
      const el = marker.getElement();
      if (el) el.classList.toggle('is-visible', eventsVisible);
    });
    if (eventsVisible) {
      const defaultEvent = mode === 'uncertain' ? 'insurance' : (state.selectedEventId || 'policy');
      selectEvent(defaultEvent, false);
    } else {
      hideEventDetail();
      state.selectedEventId = null;
    }

    state.fuelMarkers.forEach(({ marker }) => {
      const el = marker.getElement();
      if (el) el.classList.toggle('is-visible', mode === 'prices');
    });

    if (state.focusTrackLayer && state.focusTrackGlow) {
      const focusOn = mode === 'voyage' || mode === 'invoice';
      state.focusTrackGlow.setStyle({ opacity: focusOn ? 0.28 : 0 });
      state.focusTrackLayer.setStyle({ opacity: focusOn ? 0.96 : 0, dashArray: mode === 'invoice' ? '' : '10 7' });
    }
    if (state.focusDestinationLayer && state.focusDestinationGlow) {
      const destinationOn = mode === 'voyage' || mode === 'invoice';
      state.focusDestinationGlow.setStyle({ opacity: destinationOn ? 0.18 : 0 });
      state.focusDestinationLayer.setStyle({ opacity: destinationOn ? 0.9 : 0, dashArray: mode === 'invoice' ? '2 7' : '9 10' });
    }
  }

  function setInvoiceVisible(visible) {
    const invoice = document.getElementById('floating-invoice');
    if (invoice) invoice.classList.toggle('is-visible', visible);
    const transition = document.getElementById('invoice-transition');
    if (transition) {
      transition.classList.toggle('is-visible', visible);
      if (visible) {
        window.requestAnimationFrame(positionInvoiceTransition);
        if (state.map) state.map.once('moveend', () => window.requestAnimationFrame(positionInvoiceTransition));
      }
    }
    const shell = document.querySelector('.master-map-shell');
    if (shell) shell.classList.toggle('is-invoice-scene', visible);
  }

  function setShipPromptVisible(visible) {
    const prompt = document.getElementById('ship-click-prompt');
    if (prompt) prompt.classList.toggle('is-visible', visible);
  }

  function positionInvoiceTransition() {
    if (!state.map || !state.focusShip) return;
    const transition = document.getElementById('invoice-transition');
    const invoice = document.getElementById('floating-invoice');
    if (!transition || !invoice) return;
    const shipPoint = state.map.latLngToContainerPoint(state.focusShip.getLatLng());
    const endX = invoice.offsetLeft + 26;
    const endY = invoice.offsetTop + Math.min(86, invoice.offsetHeight * 0.28);
    const dx = endX - shipPoint.x;
    const dy = endY - shipPoint.y;
    const distance = Math.max(64, Math.sqrt(dx * dx + dy * dy));
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    transition.style.left = `${shipPoint.x}px`;
    transition.style.top = `${shipPoint.y}px`;
    transition.style.width = `${distance}px`;
    transition.style.transform = `rotate(${angle}deg)`;
  }

  function setPricePanelVisible(visible) {
    const panel = document.getElementById('region-price-panel');
    if (panel) panel.classList.toggle('is-visible', visible);
  }

  function setFuelRegion(regionKey, selectedCountryId, moveMap = false) {
    const key = fuelRegions[regionKey] ? regionKey : 'global';
    const region = fuelRegions[key];
    state.selectedRegion = key;

    document.querySelectorAll('.region-tabs button').forEach((button) => {
      button.classList.toggle('is-active', (button.dataset.region || '') === key);
    });

    const countries = key === 'global'
      ? fuelCountries
      : fuelCountries.filter((country) => country.continent === key);
    const selectedCountry = countries.find((country) => country.id === selectedCountryId)
      || countries.find((country) => country.id === state.selectedCountryId)
      || countries[0]
      || fuelCountries[0];
    state.selectedCountryId = selectedCountry.id;

    const copy = describeFuelCountry(selectedCountry);
    const panelKicker = document.getElementById('price-panel-kicker');
    const panelTitle = document.getElementById('price-panel-title');
    const panelBody = document.getElementById('price-panel-body');
    if (panelKicker) panelKicker.textContent = `${selectedCountry.country} / 汽油零售价 / 2026 年`;
    if (panelTitle) panelTitle.textContent = copy.title;
    if (panelBody) panelBody.textContent = copy.body;

    const list = document.getElementById('region-price-list');
    if (list) {
      list.innerHTML = countries.map((country) => (
        `<button type="button" data-country="${country.id}" data-region="${country.continent}" class="${country.id === selectedCountry.id ? 'is-selected' : ''}">
          <span>${country.country}</span>
          <strong>${formatUsd(country.current)}/L</strong>
          <i class="${trendClass(country.currentVsBase)}">6 月 22 日 · 较 1 月 ${formatPercent(country.currentVsBase)} · 高点 ${formatPercent(country.peakVsBase)}</i>
        </button>`
      )).join('');
      list.querySelectorAll('button').forEach((button) => {
        button.addEventListener('click', () => setFuelRegion(button.dataset.region || 'global', button.dataset.country, true));
      });
    }

    state.fuelMarkers.forEach(({ country, marker }) => {
      const el = marker.getElement();
      const active = key === 'global' || country.continent === key;
      const selected = country.id === selectedCountry.id;
      if (el) {
        el.classList.toggle('is-muted', !active);
        el.classList.toggle('is-context', active && !selected);
        el.classList.toggle('is-selected', selected);
      }
      marker.setZIndexOffset(selected ? 800 : active ? 420 : 0);
    });

    window.dispatchEvent(new CustomEvent('energy:country-change', { detail: { country: selectedCountry } }));

    if (moveMap && state.map) {
      const target = selectedCountryId ? [selectedCountry.lat, selectedCountry.lng] : region.center;
      const zoom = selectedCountryId && key !== 'global' ? Math.max(region.zoom, 3) : region.zoom;
      state.map.flyTo(target, zoom, { duration: 0.75, easeLinearity: 0.25 });
    }
  }

  function describeFuelCountry(country) {
    const values = country.monthly;
    const start = values[0];
    const current = values[values.length - 1];
    const peak = Math.max(...values);
    const peakIndex = values.indexOf(peak);
    const peakMonth = `${peakIndex + 1} 月`;
    const startText = formatLocalPrice(start, country.currencyLabel);
    const currentText = formatLocalPrice(current, country.currencyLabel);
    const peakText = formatLocalPrice(peak, country.currencyLabel);

    if (Math.abs(peak - start) < 0.005) {
      return {
        title: `${country.country}汽油价格保持稳定`,
        body: `今年前六个月均为${currentText}，零售价没有随国际油价同步波动。`,
      };
    }

    if (Math.abs(current - peak) < 0.005) {
      return {
        title: `${country.country}汽油价格仍在年内高位`,
        body: `1 月末为${startText}；截至 6 月 22 日升至${currentText}，较年初上涨 ${country.currentVsBase.toFixed(1)}%。`,
      };
    }

    return {
      title: `${country.country}汽油价格冲高后回落`,
      body: `1 月末为${startText}，${peakMonth}升至${peakText}；截至 6 月 22 日回落至${currentText}。`,
    };
  }

  function initRevealObserver() {
    const targets = document.querySelectorAll('.master-map-shell, .story-step');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add('is-visible');
      });
    }, { threshold: 0.14 });
    targets.forEach((target) => observer.observe(target));
  }

  function pointAlong(points, t) {
    const clamped = Math.max(0, Math.min(1, t));
    const totalSegments = points.length - 1;
    const scaled = clamped * totalSegments;
    const index = Math.min(Math.floor(scaled), totalSegments - 1);
    const local = scaled - index;
    const start = points[index];
    const end = points[index + 1];
    return [
      start[0] + (end[0] - start[0]) * local,
      start[1] + (end[1] - start[1]) * local,
    ];
  }

  function routeBearingAt(points, t, fallback = 0) {
    if (!points || points.length < 2) return fallback;
    const before = pointAlong(points, Math.max(0, t - 0.0025));
    const after = pointAlong(points, Math.min(1, t + 0.0025));
    if (before[0] === after[0] && before[1] === after[1]) return fallback;
    return bearingBetween(before, after);
  }

  function bearingBetween(start, end) {
    const radians = Math.PI / 180;
    const phi1 = start[0] * radians;
    const phi2 = end[0] * radians;
    const deltaLng = (end[1] - start[1]) * radians;
    const y = Math.sin(deltaLng) * Math.cos(phi2);
    const x = Math.cos(phi1) * Math.sin(phi2)
      - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLng);
    return (Math.atan2(y, x) / radians + 360) % 360;
  }

  function pseudo(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  function trendClass(value) {
    if (value > 0.3) return 'trend-up';
    if (value < -0.3) return 'trend-down';
    return 'trend-flat';
  }

  function formatPercent(value) {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  }

  function formatUsd(value) {
    return `$${value.toFixed(2)}`;
  }

  function formatLocalPrice(value, currencyLabel) {
    const digits = value >= 100 ? 1 : 2;
    return `每升 ${value.toFixed(digits)} ${currencyLabel}`;
  }
});
