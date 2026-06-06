# 美伊战争：冲击与涟漪

数据新闻小组作业

---

## 项目结构

```
iran-war-project/
├── index.html              # 首页（首屏地图 + 时间线 + 三个影响入口）
├── css/
│   ├── style.css           # 全局样式（首页 + 共享变量）
│   └── subpage.css         # 子页面共享样式
├── js/
│   ├── main.js             # 首页逻辑（地图、涟漪、时间线、入场动画）
│   ├── humanitarian.js     # ← 人道影响组员填写
│   ├── energy.js           # ← 能源影响组员填写
│   └── price.js            # ← 物价影响组员填写
└── pages/
    ├── humanitarian.html   # 人道影响页
    ├── energy.html         # 能源影响页
    └── price.html          # 物价影响页
```

---

## 分工说明

| 文件 | 负责人 | 主要任务 |
|------|--------|---------|
| `index.html` + `css/style.css` + `js/main.js` | 陈紫琪 | 首页、整体框架 |
| `pages/humanitarian.html` + `js/humanitarian.js` | 林恺 | 人道主义影响内容 |
| `pages/energy.html` + `js/energy.js` | 张颢篷 | 能源影响内容 |
| `pages/price.html` + `js/price.js` | 吴佩晴 | 物价影响内容 |

---

## 各组员操作指南

### 1. 时间线内容（humanitarian / energy / price 组员均可参与）

在 `index.html` 中找到 `<div class="timeline-track">` 区域，每个 `.timeline-item` 是一个节点：

```html
<div class="timeline-item" data-lat="纬度" data-lng="经度" data-zoom="地图缩放级别">
  <div class="timeline-dot"></div>
  <div class="timeline-content">
    <span class="timeline-date">2026年X月X日</span>
    <h3 class="timeline-title">事件标题</h3>
    <p class="timeline-desc">事件描述，2–3句话。</p>
  </div>
</div>
```

- `data-lat` / `data-lng`：事件发生地的坐标（用 Google Maps 查）
- `data-zoom`：地图缩放级别，5–8 之间，越大越近

### 2. 子页面 JS 文件

打开对应的 `js/humanitarian.js` / `energy.js` / `price.js`，按文件内注释填写：
- 统计数据（`stats` 数组）
- 图表（取消对应注释，填入真实数据）
- 地图标注（energy.js 中的 Leaflet 图层）

### 3. 子页面 HTML 内容

在对应 `pages/xxx.html` 的 `<p><!-- 正文段落 -->` 处填写文字。

### 4. 引入图表库

如需 Chart.js，在对应页面的 `<head>` 中取消注释：
```html
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
```

---

## 本地运行

直接用 VS Code 的 **Live Server** 插件打开 `index.html` 即可。
（不能直接双击打开，因为 Leaflet 地图需要 HTTP 协议）

---

## GitHub 协作建议

- 每人在自己负责的 branch 上开发（如 `feature/humanitarian`）
- 完成后发 Pull Request 合并到 `main`
- **不要修改其他人负责的文件**，避免冲突
