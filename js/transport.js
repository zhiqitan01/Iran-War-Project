document.addEventListener("DOMContentLoaded", () => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const lerp = (a, b, t) => a + (b - a) * t;

  function observeOnce(element, callback, threshold = 0.3) {
    if (!element) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            callback(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold }
    );
    observer.observe(element);
  }

  function createDivIcon(className, html, size = [28, 28], anchor = [14, 14]) {
    return L.divIcon({
      className,
      html,
      iconSize: size,
      iconAnchor: anchor,
    });
  }

  function addCartoLayer(map) {
    return L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      {
        attribution: "&copy; CARTO",
        subdomains: "abcd",
        maxZoom: 19,
      }
    ).addTo(map);
  }

  function interpolatePolyline(coords, progress) {
    if (!coords.length) return null;
    if (coords.length === 1) return coords[0];
    const lengths = [];
    let total = 0;
    for (let i = 0; i < coords.length - 1; i += 1) {
      const [lat1, lng1] = coords[i];
      const [lat2, lng2] = coords[i + 1];
      const dx = lat2 - lat1;
      const dy = lng2 - lng1;
      const segment = Math.hypot(dx, dy);
      lengths.push(segment);
      total += segment;
    }
    const target = total * clamp(progress, 0, 1);
    let walked = 0;
    for (let i = 0; i < lengths.length; i += 1) {
      const segment = lengths[i];
      if (walked + segment >= target) {
        const local = segment === 0 ? 0 : (target - walked) / segment;
        return [
          lerp(coords[i][0], coords[i + 1][0], local),
          lerp(coords[i][1], coords[i + 1][1], local),
        ];
      }
      walked += segment;
    }
    return coords[coords.length - 1];
  }

  function buildBounds(routes) {
    const points = routes.flatMap((route) => route);
    return L.latLngBounds(points.map(([lat, lng]) => [lat, lng]));
  }

  function formatDays(value) {
    return `${value.toFixed(1)} 天`;
  }

  function formatPercent(value) {
    return `${Math.round(value)}%`;
  }

  function formatShipCount(value) {
    return `${Math.round(value)} 艘`;
  }

  function animateCount(el, nextValue, formatter = (value) => String(value), duration = 420) {
    if (!el) return;
    const startValue = Number(el.dataset.value || nextValue || 0);
    const start = performance.now();
    const endValue = Number(nextValue || 0);

    function step(now) {
      const progress = clamp((now - start) / duration, 0, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (endValue - startValue) * eased;
      el.textContent = formatter(current);
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.dataset.value = String(endValue);
        el.textContent = formatter(endValue);
      }
    }

    requestAnimationFrame(step);
  }

  function initStraitFunnel() {
    const visual = $("#strait-funnel-visual");
    observeOnce(
      visual,
      (node) => {
        node.classList.add("is-live");
        const arrowIds = [
          { id: "funnelArrowMoveIn", delay: 900 },
          { id: "funnelArrowMoveStrait", delay: 2600 },
          { id: "funnelArrowMoveEurope", delay: 3600 },
          { id: "funnelArrowMoveAsia", delay: 3920 },
        ];
        arrowIds.forEach(({ id, delay }) => {
          const motion = node.querySelector(`#${id}`);
          if (!motion || typeof motion.beginElement !== "function") return;
          setTimeout(() => motion.beginElement(), delay);
        });
      },
      0.35
    );
  }

  function initStraitMap() {
    const container = $("#strait-map");
    const slider = $("#strait-timeline-slider");
    const statusLine = $("#strait-status-line");
    const typeToolbar = $("#strait-type-toolbar");
    if (!container || !slider || !statusLine || !typeToolbar || typeof L === "undefined") return;

    const routeTypeMeta = {
      all: { name: "全部船型", color: "#ffffff", highlightWeight: 4.2 },
      oil: {
        name: "油轮",
        color: "#ff715e",
        highlightWeight: 4.5,
        waits: [0.8, 3.8, 1.5, 0.4],
      },
      lng: {
        name: "LNG 船",
        color: "#e8a838",
        highlightWeight: 4.2,
        waits: [0.5, 2.1, 1.0, 0.3],
      },
      container: {
        name: "集装箱船",
        color: "#7f90a8",
        highlightWeight: 4.0,
        waits: [0.3, 1.7, 0.6, 0.2],
      },
    };

    const straitBaselineRoute = [
      [26.42, 56.24],
      [25.34, 57.56],
      [24.18, 59.06],
      [23.24, 60.48],
    ];

    const straitScenarios = {
      all: {
        post: [
          [26.06, 56.98],
          [25.22, 58.04],
          [24.24, 58.9],
          [23.6, 59.66],
          [22.94, 60.36],
        ],
      },
      oil: {
        post: [
          [26.14, 57.12],
          [25.36, 58.38],
          [24.42, 59.28],
          [23.78, 60.02],
          [23.12, 60.72],
        ],
      },
      lng: {
        post: [
          [26.08, 57.02],
          [25.26, 58.12],
          [24.32, 58.98],
          [23.66, 59.74],
          [22.98, 60.42],
        ],
      },
      container: {
        post: [
          [26.02, 56.9],
          [25.24, 57.88],
          [24.28, 58.76],
          [23.58, 59.54],
          [22.9, 60.24],
        ],
      },
    };

    const timelinePoints = [
      {
        label: "2月28日",
        date: "2月28日",
        throughput: 92,
        waitAvg: 0.8,
        blocked: 8,
        anchored: 2,
        narrative: "海峡进入战时戒备，船东开始压低航速观望。",
      },
      {
        label: "3月2日",
        date: "3月2日",
        throughput: 35,
        waitAvg: 3.4,
        blocked: 22,
        anchored: 8,
        narrative: "检查排队和分批放行开始主导通行节奏。",
      },
      {
        label: "4月8日",
        date: "4月8日",
        throughput: 61,
        waitAvg: 1.9,
        blocked: 12,
        anchored: 4,
        narrative: "停火后通行恢复，但船期仍未回到战前水平。",
      },
      {
        label: "7月现状",
        date: "7月现状",
        throughput: 78,
        waitAvg: 1.1,
        blocked: 6,
        anchored: 2,
        narrative: "主通道恢复，但保险与调度仍维持战时溢价。",
      },
    ];

    const TEMP_CLEARANCE_POINT = [24.92, 58.22];
    const ANCHOR_CLUSTER_SEEDS = [
      [23.76, 59.06],
      [23.62, 59.18],
      [23.48, 59.04],
      [23.34, 58.92],
      [23.2, 59.0],
      [23.54, 58.86],
      [23.4, 59.2],
      [23.12, 58.84],
    ];
    const VIEW_ANCHOR_POINTS = [
      [26.25, 56.55],
      TEMP_CLEARANCE_POINT,
      [23.76, 59.06],
      [23.12, 58.84],
      [22.94, 60.36],
      [23.12, 60.72],
      [22.98, 60.42],
      [22.9, 60.24],
    ];

    const map = L.map(container, {
      zoomControl: false,
      scrollWheelZoom: false,
      zoomSnap: 0.1,
      zoomDelta: 0.1,
    });
    addCartoLayer(map);
    map.attributionControl.setPrefix("");
    const initBounds = L.latLngBounds(VIEW_ANCHOR_POINTS.map(([lat, lng]) => [lat, lng]));
    map.fitBounds(initBounds, { padding: [52, 82], animate: false });
    const FIXED_CENTER = map.getCenter();
    const FIXED_ZOOM = map.getZoom();

    const riskLayer = L.layerGroup().addTo(map);
    const routeLayer = L.layerGroup().addTo(map);
    const anchorLayer = L.layerGroup().addTo(map);
    const labelLayer = L.layerGroup().addTo(map);
    const shipLayer = L.layerGroup().addTo(map);

    L.circle([26.25, 56.55], {
      radius: 52000,
      color: "#d64030",
      fillColor: "#d64030",
      fillOpacity: 0.18,
      weight: 1.5,
    }).addTo(riskLayer);
    L.circle([26.25, 56.55], {
      radius: 86000,
      color: "rgba(214,64,48,0.4)",
      fillColor: "#d64030",
      fillOpacity: 0.06,
      weight: 1,
    }).addTo(riskLayer);

    L.marker([26.08, 56.9], {
      icon: createDivIcon("strait-label", "<span>霍尔木兹海峡</span>", [130, 26], [20, 13]),
    }).addTo(labelLayer);
    let activeType = "all";
    let currentSnapshot = timelinePoints[0];
    let shipMarker = null;
    let shipAnimationFrame = null;
    let shipProgress = 0;
    let shipLastTime = 0;
    let shipPauseUntil = 0;

    const impactCards = $$(".ship-impact-card", $("#ship-impact-compare"));

    function getInterpolatedSnapshot(rawValue) {
      const scaled = (rawValue / 100) * (timelinePoints.length - 1);
      const index = Math.floor(scaled);
      const nextIndex = Math.min(timelinePoints.length - 1, index + 1);
      const local = scaled - index;
      const left = timelinePoints[index];
      const right = timelinePoints[nextIndex];
      return {
        label: local > 0.5 ? right.label : left.label,
        date: local > 0.5 ? right.date : left.date,
        throughput: lerp(left.throughput, right.throughput, local),
        waitAvg: lerp(left.waitAvg, right.waitAvg, local),
        blocked: lerp(left.blocked, right.blocked, local),
        anchored: lerp(left.anchored, right.anchored, local),
        narrative: local > 0.5 ? right.narrative : left.narrative,
      };
    }

    function getHighlightType() {
      return activeType === "all" ? "all" : activeType;
    }

    function routeStyle(type, highlighted) {
      const meta = routeTypeMeta[type];
      return {
        color: highlighted ? meta.color : "rgba(255,255,255,0.1)",
        weight: highlighted ? meta.highlightWeight : 1.6,
        opacity: highlighted ? 0.98 : 0.28,
        className: highlighted ? "" : "ship-route-dimmed",
      };
    }

    function createPointLabel(text, tone = "neutral", direction = "right") {
      const toneClass = tone === "pulse" ? " pulse" : "";
      const width = Math.max(116, text.length * 16 + 30);
      const anchor = direction === "left" ? [width, 14] : [0, 14];
      return createDivIcon(
        "point-label-marker",
        `<span class="label-chip"><span class="label-dot${toneClass}"></span><span>${text}</span></span>`,
        [width, 28],
        anchor
      );
    }

    function getInterpolatedSeriesValue(series, rawValue) {
      const scaled = (rawValue / 100) * (series.length - 1);
      const index = Math.floor(scaled);
      const nextIndex = Math.min(series.length - 1, index + 1);
      const local = scaled - index;
      return lerp(series[index], series[nextIndex], local);
    }

    function layoutIconCluster(points, minSpacing = 22) {
      const arranged = points
        .map((point, index) => ({ ...point, index }))
        .sort((a, b) => a.x - b.x);
      for (let i = 1; i < arranged.length; i += 1) {
        const prev = arranged[i - 1];
        const curr = arranged[i];
        if (curr.x - prev.x < minSpacing) {
          curr.x = prev.x + minSpacing;
        }
      }
      return arranged.sort((a, b) => a.index - b.index);
    }

    function offsetLatLng(latLng, xOffset, yOffset) {
      const point = map.latLngToContainerPoint(latLng);
      return map.containerPointToLatLng([point.x + xOffset, point.y + yOffset]);
    }

    function renderStaticLabels(anchorLabelPoint) {
      labelLayer.clearLayers();
      L.marker([26.08, 56.9], {
        icon: createDivIcon("strait-label", "<span>霍尔木兹海峡</span>", [130, 26], [20, 13]),
      }).addTo(labelLayer);
      L.marker(offsetLatLng(TEMP_CLEARANCE_POINT, 18, -2), {
        icon: createPointLabel("临时放行点", "pulse", "right"),
      }).addTo(labelLayer);
      if (anchorLabelPoint) {
        L.marker(anchorLabelPoint, {
          icon: createPointLabel("外海锚泊区", "neutral", "right"),
        }).addTo(labelLayer);
      }
    }

    function updateImpactCards(rawValue) {
      const maxWait = 4;
      impactCards.forEach((card) => {
        const type = card.dataset.type;
        const meta = routeTypeMeta[type];
        if (!meta?.waits) return;
        const wait = getInterpolatedSeriesValue(meta.waits, rawValue);
        const valueEl = $("[data-impact-value]", card);
        const fillEl = $("[data-impact-fill]", card);
        animateCount(valueEl, wait, (value) => value.toFixed(1), 360);
        if (fillEl) {
          fillEl.style.setProperty("--fill", `${clamp((wait / maxWait) * 100, 12, 100)}%`);
        }
      });
    }

    function updateImpactCardHighlight(type) {
      impactCards.forEach((card) => {
        const shouldHighlight = type !== "all" && card.dataset.type === type;
        card.classList.toggle("card-highlighted", shouldHighlight);
      });
    }

    function updateStatusLine(snapshot) {
      statusLine.innerHTML =
        `${snapshot.date}：约 <strong>${formatPercent(snapshot.throughput)}</strong> 运力仍在分批通行，` +
        `平均等待 <strong class="emphasis">${formatDays(snapshot.waitAvg)}</strong>，` +
        `示意受阻 <strong class="emphasis">${formatPercent(snapshot.blocked)}</strong>，` +
        `<strong class="emphasis">${formatShipCount(snapshot.anchored)}</strong> 船正在外海等待，${snapshot.narrative}`;
    }

    function renderAnchorMarkers(count) {
      anchorLayer.clearLayers();
      const basePoints = layoutIconCluster(
        ANCHOR_CLUSTER_SEEDS.map((latLng) => {
          const point = map.latLngToContainerPoint(latLng);
          return { x: point.x, y: point.y };
        }),
        26
      ).map((point) => map.containerPointToLatLng([point.x, point.y]));
      for (let i = 0; i < Math.round(count); i += 1) {
        L.marker(basePoints[i], {
          icon: createDivIcon("anchor-diamond", "<div class='diamond'></div>", [14, 14], [7, 7]),
        }).addTo(anchorLayer);
      }
      const rightmost = basePoints.reduce((best, current) => (current.lng > best.lng ? current : best), basePoints[0]);
      const anchorLabelPoint = offsetLatLng(rightmost, 20, -14);
      renderStaticLabels(anchorLabelPoint);
    }

    function setActiveType(type) {
      activeType = type;
      $$(".transport-toggle", typeToolbar).forEach((item) =>
        item.classList.toggle("active", item.dataset.straitType === type)
      );
      updateImpactCardHighlight(type);
      stopShipAnimation();
      renderRoutes();
    }

    function stopShipAnimation() {
      if (shipAnimationFrame) cancelAnimationFrame(shipAnimationFrame);
      shipAnimationFrame = null;
      shipLastTime = 0;
    }

    function startShipAnimation() {
      const focusType = getHighlightType();
      const path = straitScenarios[focusType].post;
      if (!shipMarker) {
        shipMarker = L.marker(path[0], {
          icon: createDivIcon("ship-marker", "<div class='ship'>⛴</div>", [28, 28], [14, 14]),
          zIndexOffset: 1000,
        }).addTo(shipLayer);
      } else if (!shipLayer.hasLayer(shipMarker)) {
        shipLayer.addLayer(shipMarker);
      }
      shipMarker.setLatLng(path[0]);
      shipProgress = shipProgress % 1;
      shipPauseUntil = 0;

      const animate = (now) => {
        if (!shipLastTime) shipLastTime = now;
        const delta = now - shipLastTime;
        shipLastTime = now;

        if (now < shipPauseUntil) {
          shipAnimationFrame = requestAnimationFrame(animate);
          return;
        }

        const severity = 1 - currentSnapshot.throughput / 100;
        const speed = lerp(0.00014, 0.00003, severity);
        shipProgress += delta * speed;

        if (currentSnapshot.blocked > 12 && shipProgress > 0.36 && shipProgress < 0.4) {
          shipPauseUntil = now + lerp(900, 2800, currentSnapshot.blocked / 22);
          shipProgress += 0.01;
        }

        if (shipProgress >= 1) shipProgress = 0;
        shipMarker.setLatLng(interpolatePolyline(path, shipProgress));
        shipAnimationFrame = requestAnimationFrame(animate);
      };

      shipAnimationFrame = requestAnimationFrame(animate);
    }

    function renderRoutes() {
      routeLayer.clearLayers();
      const focusType = getHighlightType();
      L.polyline(straitBaselineRoute, {
        color: "rgba(232,228,220,0.72)",
        weight: 2.4,
        dashArray: "8 8",
        opacity: 1,
      })
        .bindTooltip("封锁前基准航线", { direction: "top" })
        .addTo(routeLayer);

      if (activeType === "all") {
        L.polyline(straitScenarios.all.post, {
          color: "#ffffff",
          weight: routeTypeMeta.all.highlightWeight,
          opacity: 0.98,
        })
          .bindTooltip("封锁后聚合航线", { direction: "top" })
          .addTo(routeLayer);
      } else {
        const meta = routeTypeMeta[focusType];
        L.polyline(straitScenarios[focusType].post, routeStyle(focusType, true))
          .bindTooltip(`${meta.name} · 封锁后航线`, { direction: "top" })
          .addTo(routeLayer);
      }

      startShipAnimation();
    }

    function updateTimeline() {
      const rawValue = Number(slider.value);
      currentSnapshot = getInterpolatedSnapshot(rawValue);
      updateImpactCards(rawValue);
      updateStatusLine(currentSnapshot);
      renderAnchorMarkers(currentSnapshot.anchored);
      stopShipAnimation();
      renderRoutes();
    }

    typeToolbar.addEventListener("click", (event) => {
      const button = event.target.closest("[data-strait-type]");
      if (!button) return;
      setActiveType(button.dataset.straitType);
    });

    impactCards.forEach((card) => {
      card.addEventListener("click", () => {
        const nextType = card.dataset.type;
        if (!nextType) return;
        setActiveType(nextType);
      });
    });

    slider.addEventListener("input", updateTimeline);
    updateTimeline();
    setTimeout(() => {
      map.invalidateSize();
      map.setView(FIXED_CENTER, FIXED_ZOOM, { animate: false });
      renderAnchorMarkers(currentSnapshot.anchored);
    }, 120);
  }

  function initStraitChain() {
    const card = $("#strait-chain-card");
    observeOnce(
      card,
      (node) => {
        node.classList.add("is-live");
        const steps = $$(".strait-chain-node", node);
        steps.forEach((step) => step.classList.remove("is-active", "is-flowing"));

        steps.forEach((step, index) => {
          const activateAt = index * 420;
          const flowAt = activateAt + 170;
          setTimeout(() => step.classList.add("is-active"), activateAt);
          if (index < steps.length - 1) {
            setTimeout(() => {
              step.classList.add("is-flowing");
              setTimeout(() => step.classList.remove("is-flowing"), 250);
            }, flowAt);
          }
        });
      },
      0.35
    );
  }

  function initFlightCorridor() {
    const visual = $("#flight-corridor-visual");
    if (!visual) return;
    observeOnce(
      visual,
      (node) => {
        node.classList.add("is-network-visible");
        setTimeout(() => node.classList.add("is-focused"), 700);
      },
      0.2
    );
  }

  function initFlightAlerts() {
    const stack = $("#flight-alert-stack");
    const reset = $("#flight-alert-reset");
    if (!stack || !reset) return;
    const cards = $$(".flight-alert-item", stack);
    let highestZ = cards.length + 10;
    let interactionsEnabled = false;
    const frameMap = new WeakMap();

    cards.forEach((card, index) => {
      card.dataset.baseX = getComputedStyle(card).getPropertyValue("--stack-x").trim().replace("px", "") || "0";
      card.dataset.baseY = getComputedStyle(card).getPropertyValue("--stack-y").trim().replace("px", "") || "0";
      card.dataset.baseTilt = getComputedStyle(card).getPropertyValue("--tilt").trim() || "0deg";
      card.dataset.originalTransform =
        `translate3d(${card.dataset.baseX}px, ${card.dataset.baseY}px, 0) rotate(${card.dataset.baseTilt})`;
      card.dataset.deltaX = "0";
      card.dataset.deltaY = "0";
      card.dataset.moved = "false";
      card.style.zIndex = String(index + 1);
    });

    function applyCardTransform(card) {
      const x = Number(card.dataset.baseX) + Number(card.dataset.deltaX);
      const y = Number(card.dataset.baseY) + Number(card.dataset.deltaY);
      const tilt = card.dataset.baseTilt;
      card.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${tilt})`;
    }

    function cancelPendingFrame(card) {
      const frame = frameMap.get(card);
      if (frame) {
        cancelAnimationFrame(frame);
        frameMap.delete(card);
      }
    }

    function bringToFront(card) {
      highestZ += 1;
      card.style.zIndex = String(highestZ);
    }

    function resetCards() {
      highestZ = cards.length + 10;
      cards.forEach((card, index) => {
        cancelPendingFrame(card);
        card.dataset.deltaX = "0";
        card.dataset.deltaY = "0";
        card.dataset.moved = "false";
        card.classList.remove("is-dragging");
        card.style.willChange = "";
        card.style.zIndex = String(index + 1);
        card.style.transform = card.dataset.originalTransform;
      });
    }

    observeOnce(
      stack,
      () => {
        stack.classList.add("is-live");
        setTimeout(() => {
          interactionsEnabled = true;
          resetCards();
        }, 1400);
      },
      0.22
    );

    cards.forEach((card) => {
      let pointerId = null;
      let startX = 0;
      let startY = 0;
      let startDX = 0;
      let startDY = 0;
      let currentDX = Number(card.dataset.deltaX);
      let currentDY = Number(card.dataset.deltaY);
      let pendingDX = 0;
      let pendingDY = 0;
      let moved = false;

      const flush = () => {
        currentDX = pendingDX;
        currentDY = pendingDY;
        card.dataset.deltaX = String(currentDX);
        card.dataset.deltaY = String(currentDY);
        applyCardTransform(card);
        frameMap.delete(card);
      };

      card.addEventListener("pointerdown", (event) => {
        if (!interactionsEnabled) return;
        pointerId = event.pointerId;
        moved = false;
        startX = event.clientX;
        startY = event.clientY;
        currentDX = Number(card.dataset.deltaX);
        currentDY = Number(card.dataset.deltaY);
        startDX = currentDX;
        startDY = currentDY;
        pendingDX = startDX;
        pendingDY = startDY;
        bringToFront(card);
        card.classList.add("is-dragging");
        card.style.willChange = "transform";
        card.setPointerCapture(pointerId);
      });

      card.addEventListener("pointermove", (event) => {
        if (!interactionsEnabled || pointerId !== event.pointerId) return;
        const dx = event.clientX - startX;
        const dy = event.clientY - startY;
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved = true;
        pendingDX = startDX + dx;
        pendingDY = startDY + dy;
        if (!frameMap.get(card)) {
          frameMap.set(card, requestAnimationFrame(flush));
        }
      });

      function endDrag(event) {
        if (pointerId !== event.pointerId) return;
        cancelPendingFrame(card);
        currentDX = pendingDX;
        currentDY = pendingDY;
        card.dataset.deltaX = String(currentDX);
        card.dataset.deltaY = String(currentDY);
        applyCardTransform(card);
        frameMap.delete(card);
        card.classList.remove("is-dragging");
        card.style.willChange = "";
        if (card.hasPointerCapture(pointerId)) {
          card.releasePointerCapture(pointerId);
        }
        pointerId = null;
        card.dataset.moved = String(moved);
      }

      card.addEventListener("pointerup", endDrag);
      card.addEventListener("pointercancel", endDrag);

      card.addEventListener("click", () => {
        if (!interactionsEnabled) return;
        if (card.dataset.moved === "true") {
          card.dataset.moved = "false";
          return;
        }
        bringToFront(card);
      });
    });

    reset.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      resetCards();
    });
  }

  function initFlightRouteMap() {
    const container = $("#flight-route-map");
    const toolbar = $("#flight-route-toolbar");
    const timeBox = $("#flight-route-time");
    const restrictionBox = $("#flight-route-restriction");
    const distanceBox = $("#flight-route-distance");
    if (!container || !toolbar || typeof L === "undefined") return;

    const flightRoutes = {
      "london-singapore": {
        name: "伦敦 - 新加坡",
        origin: { name: "伦敦", coords: [51.5074, -0.1278] },
        destination: { name: "新加坡", coords: [1.3521, 103.8198] },
        original: [
          [51.5074, -0.1278],
          [44.5, 14.0],
          [37.0, 28.0],
          [33.5, 43.5],
          [28.0, 58.0],
          [20.0, 78.0],
          [8.0, 98.0],
          [1.3521, 103.8198],
        ],
        reroute: [
          [51.5074, -0.1278],
          [42.5, 10.0],
          [30.0, 20.0],
          [19.0, 37.0],
          [14.0, 51.0],
          [10.0, 67.0],
          [6.0, 86.0],
          [1.3521, 103.8198],
        ],
        extraHours: 3.2,
        extraDistance: 1950,
        comparison: "大致相当于再补上一段区域航线。",
        blockedAt: [33.5, 43.5],
      },
      "frankfurt-dubai": {
        name: "法兰克福 - 迪拜",
        origin: { name: "法兰克福", coords: [50.1109, 8.6821] },
        destination: { name: "迪拜", coords: [25.2048, 55.2708] },
        original: [
          [50.1109, 8.6821],
          [45.0, 20.0],
          [39.0, 34.0],
          [34.0, 46.0],
          [29.0, 52.0],
          [25.2048, 55.2708],
        ],
        reroute: [
          [50.1109, 8.6821],
          [44.0, 18.0],
          [33.0, 27.0],
          [23.0, 36.0],
          [18.0, 45.0],
          [21.5, 52.0],
          [25.2048, 55.2708],
        ],
        extraHours: 1.6,
        extraDistance: 980,
        comparison: "改道集中发生在土耳其南部至海湾前段。",
        blockedAt: [34.0, 46.0],
      },
      "paris-mumbai": {
        name: "巴黎 - 孟买",
        origin: { name: "巴黎", coords: [48.8566, 2.3522] },
        destination: { name: "孟买", coords: [19.076, 72.8777] },
        original: [
          [48.8566, 2.3522],
          [43.0, 16.0],
          [36.0, 28.0],
          [31.5, 45.0],
          [25.0, 59.0],
          [19.076, 72.8777],
        ],
        reroute: [
          [48.8566, 2.3522],
          [41.5, 12.0],
          [32.0, 19.0],
          [22.0, 31.0],
          [15.0, 44.0],
          [16.5, 59.0],
          [19.076, 72.8777],
        ],
        extraHours: 2.4,
        extraDistance: 1420,
        comparison: "大致相当于再补上一段上海到首尔量级的航程。",
        blockedAt: [31.5, 45.0],
      },
    };

    const restrictedZones = [
      {
        name: "伊拉克禁飞区",
        center: [34.2, 43.1],
        radius: 440000,
        labelOffset: [-66, -58],
        labelDirection: "right",
      },
      {
        name: "伊朗禁飞区",
        center: [30.8, 54.9],
        radius: 620000,
        labelOffset: [42, -62],
        labelDirection: "right",
      },
    ];

    const map = L.map(container, {
      center: [31, 50],
      zoom: 4.3,
      zoomControl: false,
      scrollWheelZoom: false,
      dragging: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      touchZoom: false,
    });
    addCartoLayer(map);
    map.attributionControl.setPrefix("");

    const zoneLayer = L.layerGroup().addTo(map);
    const routeLayer = L.layerGroup().addTo(map);
    const markerLayer = L.layerGroup().addTo(map);
    const planeLayer = L.layerGroup().addTo(map);

    restrictedZones.forEach((zone) => {
      L.circle(zone.center, {
        radius: zone.radius,
        color: "#d64030",
        fillColor: "#d64030",
        fillOpacity: 0.15,
        weight: 1.4,
      }).addTo(zoneLayer);
    });

    let activeRouteKey = "london-singapore";
    let renderToken = 0;
    let planeMarker = null;
    let planeFrame = null;
    let planeProgress = 0;
    let planeLastTime = 0;

    function stopPlane() {
      if (planeFrame) cancelAnimationFrame(planeFrame);
      planeFrame = null;
      planeLastTime = 0;
    }

    function startPlane(route) {
      stopPlane();
      planeLayer.clearLayers();
      planeMarker = L.marker(interpolatePolyline(route.reroute, 0.18), {
        icon: createDivIcon("plane-marker", "<div class='plane'>✈</div>", [28, 28], [14, 14]),
        zIndexOffset: 1100,
      }).addTo(planeLayer);
      planeProgress = 0.18;

      const animate = (now) => {
        if (!planeLastTime) planeLastTime = now;
        const delta = now - planeLastTime;
        planeLastTime = now;
        planeProgress += delta * 0.00005;
        if (planeProgress >= 0.86) planeProgress = 0.18;
        planeMarker.setLatLng(interpolatePolyline(route.reroute, planeProgress));
        planeFrame = requestAnimationFrame(animate);
      };

      planeFrame = requestAnimationFrame(animate);
    }

    function updateOverlays(route) {
      $("strong", timeBox).textContent = `+${route.extraHours.toFixed(1)} 小时`;
      $("small", timeBox).textContent = "绕行后的第一段增时成本最容易被用户感知。";
      $("strong", restrictionBox).textContent = "2 片";
      $("small", restrictionBox).textContent = "伊朗 / 伊拉克";
      $("strong", distanceBox).textContent = `+${route.extraDistance.toLocaleString("zh-CN")} 公里`;
      $("small", distanceBox).textContent = route.comparison;
    }

    function createNamedLabel(className, text, width, direction = "right") {
      const anchor = direction === "left" ? [width - 12, 13] : [12, 13];
      return createDivIcon(className, `<span>${text}</span>`, [width, 26], anchor);
    }

    function layoutLabelCluster(points, minVerticalGap = 34) {
      const width = map.getSize().x;
      const height = map.getSize().y;
      const arranged = points
        .map((point, index) => ({ ...point, index }))
        .sort((a, b) => a.y - b.y);

      for (let i = 1; i < arranged.length; i += 1) {
        const prev = arranged[i - 1];
        const curr = arranged[i];
        if (Math.abs(curr.x - prev.x) < 160 && curr.y - prev.y < minVerticalGap) {
          curr.y = prev.y + minVerticalGap;
        }
      }

      return arranged
        .map((point) => ({
          ...point,
          x: clamp(point.x, 34, width - 34),
          y: clamp(point.y, 30, height - 30),
        }))
        .sort((a, b) => a.index - b.index);
    }

    function renderZoneAndBlockedLabels(route) {
      const seedLabels = [
        ...restrictedZones.map((zone) => {
          const point = map.latLngToContainerPoint(zone.center);
          return {
            kind: "zone",
            text: zone.name,
            x: point.x + zone.labelOffset[0],
            y: point.y + zone.labelOffset[1],
            width: 124,
            direction: zone.labelDirection,
          };
        }),
        (() => {
          const point = map.latLngToContainerPoint(route.blockedAt);
          return {
            kind: "blocked",
            text: "航线拦截点",
            x: point.x + 18,
            y: point.y + 58,
            width: 108,
            direction: "right",
          };
        })(),
      ];

      layoutLabelCluster(seedLabels).forEach((label) => {
        const latLng = map.containerPointToLatLng([label.x, label.y]);
        L.marker(latLng, {
          icon: createNamedLabel("region-label", label.text, label.width, label.direction),
        }).addTo(markerLayer);
      });
    }

    function renderCityLabel(city) {
      const width = 110;
      const point = map.latLngToContainerPoint(city.coords);
      const direction = point.x > map.getSize().x * 0.7 ? "left" : "right";
      L.marker(city.coords, {
        icon: createNamedLabel("city-label", city.name, width, direction),
      }).addTo(markerLayer);
    }

    function buildRouteBounds(route) {
      const bounds = buildBounds([
        [
          route.origin.coords,
          route.destination.coords,
          route.blockedAt,
          ...route.original,
          ...route.reroute,
          ...restrictedZones.map((zone) => zone.center),
        ],
      ]);
      return bounds.pad(0.22);
    }

    function renderRouteCore(route) {
      routeLayer.clearLayers();
      markerLayer.clearLayers();

      L.polyline(route.original, {
        color: "rgba(232,228,220,0.72)",
        weight: 2.4,
        dashArray: "10 8",
      }).bindTooltip("原始航线", { direction: "top" }).addTo(routeLayer);
      L.polyline(route.reroute, {
        color: "#e8a838",
        weight: 4,
        opacity: 0.96,
      }).bindTooltip("绕行航线", { direction: "top" }).addTo(routeLayer);
    }

    function renderRouteMarkers(route) {
      markerLayer.clearLayers();

      renderCityLabel(route.origin);
      renderCityLabel(route.destination);

      L.marker(route.blockedAt, {
        icon: createDivIcon("pulse-marker", "<div class='pulse'></div>", [14, 14], [7, 7]),
      }).addTo(markerLayer);
      renderZoneAndBlockedLabels(route);
    }

    function renderRoute(routeKey, animate = true) {
      activeRouteKey = routeKey;
      renderToken += 1;
      const token = renderToken;
      const route = flightRoutes[routeKey];
      renderRouteCore(route);
      updateOverlays(route);

      $$(".flight-route-btn", toolbar).forEach((button) =>
        button.classList.toggle("active", button.dataset.route === routeKey)
      );

      map.fitBounds(buildRouteBounds(route), {
        padding: [68, 88],
        animate,
      });

      const settleDelay = animate ? 360 : 0;
      setTimeout(() => {
        if (token !== renderToken) return;
        renderRouteMarkers(route);
        startPlane(route);
      }, settleDelay);
    }

    toolbar.addEventListener("click", (event) => {
      const button = event.target.closest("[data-route]");
      if (!button) return;
      renderRoute(button.dataset.route);
    });

    renderRoute(activeRouteKey, false);
    setTimeout(() => {
      map.invalidateSize();
      renderRoute(activeRouteKey, false);
    }, 120);
  }

  function initFlightChain() {
    const card = $("#flight-chain-card");
    observeOnce(
      card,
      (node) => {
        node.classList.add("is-live");
        const steps = $$(".flight-chain-node", node);
        steps.forEach((step) => step.classList.remove("is-active", "is-flowing"));

        steps.forEach((step, index) => {
          const activateAt = index * 320;
          const flowAt = activateAt + 120;
          setTimeout(() => step.classList.add("is-active"), activateAt);
          if (index < steps.length - 1) {
            setTimeout(() => {
              step.classList.add("is-flowing");
              setTimeout(() => step.classList.remove("is-flowing"), 220);
            }, flowAt);
          }
        });
      },
      0.35
    );
  }

  function initFreightChart() {
    const canvas = $("#freight-cost-canvas");
    const receipt = $("#receipt-card");
    if (!canvas || typeof Chart === "undefined") {
      if (receipt) observeOnce(receipt, (node) => node.classList.add("is-live"), 0.25);
      return;
    }

    const labels = ["02/12", "02/19", "02/26", "03/02", "03/09", "03/16", "03/23", "03/30", "04/08", "04/15", "05/01", "06/01"];
    const base = [117, 117, 117, 117, 117, 117, 117, 117, 117, 117, 117, 117];
    const insurance = [4, 5, 6, 16, 138, 112, 88, 66, 24, 18, 12, 10];
    const friction = [8, 10, 12, 58, 219, 181, 145, 102, 48, 34, 22, 18];
    const total = base.map((value, index) => value + insurance[index] + friction[index]);

    const eventPlugin = {
      id: "transportEventLines",
      afterDatasetsDraw(chart) {
        const { ctx, chartArea, scales } = chart;
        const xScale = scales.x;
        const yScale = scales.y;
        if (!chartArea || !xScale || !yScale) return;

        const events = [
          { label: "3月2日封锁", index: 3, color: "#d64030" },
          { label: "4月8日停火", index: 8, color: "#e8a838" },
        ];

        ctx.save();
        ctx.setLineDash([5, 5]);
        ctx.font = "12px 'Space Mono', monospace";
        ctx.textAlign = "center";

        events.forEach((event) => {
          const x = xScale.getPixelForValue(event.index);
          const labelY = chartArea.top + 18;
          const labelWidth = ctx.measureText(event.label).width + 16;
          ctx.strokeStyle = event.color;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x, chartArea.top + 30);
          ctx.lineTo(x, chartArea.bottom);
          ctx.stroke();

          ctx.setLineDash([]);
          ctx.fillStyle = "rgba(11,11,15,0.92)";
          ctx.fillRect(x - labelWidth / 2, chartArea.top + 4, labelWidth, 20);
          ctx.strokeStyle = "rgba(232,228,220,0.08)";
          ctx.strokeRect(x - labelWidth / 2, chartArea.top + 4, labelWidth, 20);
          ctx.fillStyle = event.color;
          ctx.fillText(event.label, x, labelY);
          ctx.setLineDash([5, 5]);
        });

        const peakIndex = 4;
        const peakX = xScale.getPixelForValue(peakIndex);
        const peakY = yScale.getPixelForValue(total[peakIndex]);
        ctx.setLineDash([]);
        ctx.fillStyle = "#ffffff";
        ctx.font = "700 14px 'Space Mono', monospace";
        ctx.fillText("47.4万美元/天", peakX + 64, peakY - 20);

        const baseY = yScale.getPixelForValue(117);
        ctx.setLineDash([3, 5]);
        ctx.strokeStyle = "rgba(232,228,220,0.28)";
        ctx.beginPath();
        ctx.moveTo(chartArea.left, baseY);
        ctx.lineTo(chartArea.right, baseY);
        ctx.stroke();
        ctx.setLineDash([]);
        const baseLabel = "战前基准 11.7万";
        const baseWidth = ctx.measureText(baseLabel).width + 16;
        ctx.fillStyle = "rgba(11,11,15,0.9)";
        ctx.fillRect(chartArea.left + 8, baseY - 22, baseWidth, 18);
        ctx.strokeStyle = "rgba(232,228,220,0.08)";
        ctx.strokeRect(chartArea.left + 8, baseY - 22, baseWidth, 18);
        ctx.fillStyle = "rgba(232,228,220,0.76)";
        ctx.font = "12px 'Space Mono', monospace";
        ctx.textAlign = "left";
        ctx.fillText(baseLabel, chartArea.left + 16, baseY - 10);
        ctx.restore();
      },
    };

    new Chart(canvas, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "基础运费基线",
            data: base,
            stack: "cost",
            fill: true,
            borderColor: "rgba(214,64,48,0.9)",
            backgroundColor: "rgba(214,64,48,0.26)",
            borderWidth: 1.5,
            pointRadius: 0,
            tension: 0.34,
          },
          {
            label: "战争险示意贡献",
            data: insurance,
            stack: "cost",
            fill: true,
            borderColor: "rgba(232,168,56,0.9)",
            backgroundColor: "rgba(232,168,56,0.24)",
            borderWidth: 1.5,
            pointRadius: 0,
            tension: 0.34,
          },
          {
            label: "运力紧张与绕行示意贡献",
            data: friction,
            stack: "cost",
            fill: true,
            borderColor: "rgba(127,144,168,0.9)",
            backgroundColor: "rgba(127,144,168,0.24)",
            borderWidth: 1.5,
            pointRadius: 0,
            tension: 0.34,
          },
          {
            label: "TD3C 真实总运费",
            data: total,
            borderColor: "#fff",
            backgroundColor: "transparent",
            borderWidth: 3,
            pointRadius: 0,
            tension: 0.34,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false,
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            position: "nearest",
            xAlign: "left",
            yAlign: "bottom",
            caretPadding: 10,
            backgroundColor: "rgba(11,11,15,0.92)",
            borderColor: "rgba(232,228,220,0.08)",
            borderWidth: 1,
            titleColor: "#fff",
            bodyColor: "rgba(232,228,220,0.82)",
            displayColors: true,
            callbacks: {
              label(context) {
                const value = context.raw;
                if (context.dataset.label === "TD3C 真实总运费") {
                  return `${context.dataset.label}：${(value / 10).toFixed(1)} 万美元/天`;
                }
                return `${context.dataset.label}：${(value / 10).toFixed(1)} 万美元/天`;
              },
            },
          },
        },
        layout: {
          padding: {
            top: 14,
          },
        },
        scales: {
          x: {
            stacked: true,
            grid: {
              color: "rgba(255,255,255,0.05)",
            },
            ticks: {
              color: "rgba(232,228,220,0.62)",
              font: {
                family: "Space Mono",
              },
            },
          },
          y: {
            stacked: true,
            beginAtZero: true,
            max: 520,
            grid: {
              color: "rgba(255,255,255,0.05)",
            },
            ticks: {
              color: "rgba(232,228,220,0.62)",
              font: {
                family: "Space Mono",
              },
              callback(value) {
                return `${(value / 10).toFixed(0)}万`;
              },
            },
          },
        },
      },
      plugins: [eventPlugin],
    });

    observeOnce(receipt, (node) => node.classList.add("is-live"), 0.25);
  }

  initStraitFunnel();
  initStraitMap();
  initStraitChain();
  initFlightCorridor();
  initFlightAlerts();
  initFlightRouteMap();
  initFlightChain();
  initFreightChart();
});

