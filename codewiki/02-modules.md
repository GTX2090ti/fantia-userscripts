# 02 · 模块职责

脚本按功能可划分为 17 个模块。文件中的物理顺序与模块顺序不完全一致（例如站点暗色代码夹在面板代码之前），下表以**职责**为准。

| 模块 | 职责 | 行范围 | 对外主要函数 |
| --- | --- | --- | --- |
| M1 | 元信息与功能说明 | [L1-L77](../fantia-product-search-enhancer.user.js#L1-L77) | — |
| M2 | 常量、图标、样式文本 | [L85-L559](../fantia-product-search-enhancer.user.js#L85-L559) | — |
| M3 | Shadow DOM 与全局样式基础设施 | [L561-L593](../fantia-product-search-enhancer.user.js#L561-L593) | `attachShadowCss()` `injectCss()` |
| M4 | 主题检测与脚本 UI 明暗 | [L595-L643](../fantia-product-search-enhancer.user.js#L595-L643) | `detectDark()` `syncTheme()` |
| M5 | 页面判定与商品链接采集 | [L645-L683](../fantia-product-search-enhancer.user.js#L645-L683) | `shouldRun()` `collectProductLinks()` |
| M6 | 复制历史 | [L685-L743](../fantia-product-search-enhancer.user.js#L685-L743) | `recordIds()` `historyHas()` |
| M7 | 卡片识别 | [L745-L797](../fantia-product-search-enhancer.user.js#L745-L797) | `resolveCard()` `cardScope()` |
| M8 | ID 条注入与扫描 | [L799-L1001](../fantia-product-search-enhancer.user.js#L799-L1001) | `makeBar()` `scan()` |
| M9 | 剪贴板与 Toast | [L1003-L1061](../fantia-product-search-enhancer.user.js#L1003-L1061) | `copyText()` `toast()` |
| M10 | 悬浮按钮 FAB | [L1063-L1106](../fantia-product-search-enhancer.user.js#L1063-L1106) | `ensureFab()` `updateFab()` |
| M11 | 悬浮面板 | [L1108-L1337](../fantia-product-search-enhancer.user.js#L1108-L1337) | `openPanel()` `copyAllVisible()` |
| M12 | 站点黑暗模式 | [L1118-L1144](../fantia-product-search-enhancer.user.js#L1118-L1144) | `toggleSiteDark()` `applySiteDark()` |
| M13 | 页首搜索与筛选栏 | [L1339-L1791](../fantia-product-search-enhancer.user.js#L1339-L1791) | `ensureFilterBar()` `applyFilter()` |
| M14 | 标签栏避让与吸顶 | [L1793-L1826](../fantia-product-search-enhancer.user.js#L1793-L1826) | `ensureNavOffset()` `syncFilterAffix()` |
| M15 | 宽屏布局重排 | [L1828-L1877](../fantia-product-search-enhancer.user.js#L1828-L1877) | `widenLayout()` `markSplit()` |
| M16 | 无限滚动 | [L1879-L2064](../fantia-product-search-enhancer.user.js#L1879-L2064) | `setupInfiniteScroll()` `loadNextPage()` |
| M17 | 启动与调度 | [L2066-L2141](../fantia-product-search-enhancer.user.js#L2066-L2141) | `boot()` |

---

## M1 元信息与功能说明

**职责**：提供用户脚本管理器读取的元数据块与开发者说明。

- `@name` / `@namespace` / `@version` / `@description` / `@author`
- `@match https://fantia.jp/*`：全站匹配
- `@updateURL` / `@downloadURL`：GitHub raw，自动更新来源
- `@grant none`：不申请特权 API
- `@run-at document-idle`
- `[L13-L77](../fantia-product-search-enhancer.user.js#L13-L77)` 是长篇功能与设计注释，包含调试开关说明。

**注意**：文件头注释写的无限滚动预载距离是 1000px（[L42-L43](../fantia-product-search-enhancer.user.js#L42-L43)），实际常量 `INF_PRELOAD = 1200`（[L1887](../fantia-product-search-enhancer.user.js#L1887)）。以代码为准。

---

## M2 常量、图标与样式文本

**职责**：集中声明路由正则、调试开关、内联 SVG 图标和全部 CSS 字符串。

### 路由与调试

| 名称 | 值/含义 | 位置 |
| --- | --- | --- |
| `DEBUG` | `localStorage['fantia-id-debug'] === '1'`，读取失败视为 `false` | [L88-L89](../fantia-product-search-enhancer.user.js#L88-L89) |
| `PRODUCT_HREF_RE` | `/\/products\/(\d+)(?:[/?#]\|$)/`，从链接提取数字 ID | [L98](../fantia-product-search-enhancer.user.js#L98) |
| `DETAIL_PAGE_RE` | `^/products/\d+` | [L99](../fantia-product-search-enhancer.user.js#L99) |
| `POST_PAGE_RE` | `^/posts/\d+` | [L100](../fantia-product-search-enhancer.user.js#L100) |
| `PAGE_RE` | `^/(fanclubs\|products\|market\|ranking\|search)` | [L102](../fantia-product-search-enhancer.user.js#L102) |
| `FC_PRODUCTS_RE` | `^/fanclubs/(\d+)/products` | [L1345](../fantia-product-search-enhancer.user.js#L1345) |

### 图标

11 个内联 SVG 常量，全部通过 `innerHTML` 注入，内容为固定字符串，不接收用户输入：

`ICON_CLIP`（复制）、`ICON_CHECK`（成功）、`ICON_ALERT`（错误）、`ICON_LINK`（链接）、`ICON_STACK`（堆叠/全部）、`ICON_SEARCH`、`ICON_FILTER`、`ICON_X`（清空）、`ICON_TRASH`（删除）、`ICON_HISTORY`、`ICON_MOON`（暗色）。定义见 [L104-L114](../fantia-product-search-enhancer.user.js#L104-L114)。

### 样式字符串

| 常量 | 用途 | 关键点 |
| --- | --- | --- |
| `CSS_TEXT` | 页面级全局样式 | `:root` 设计变量、`html.fid-dark` 变量覆盖、站点暗色规则、`.fantia-*` 宿主定位、宽屏网格、媒体查询 |
| `BAR_CSS` | ID 条 Shadow | `.bar` 毛玻璃、`.fid-num` 等宽数字、`.fantia-id-btn` 状态、容器查询 |
| `FAB_CSS` | 悬浮按钮 Shadow | 圆形按钮、`fab-badge` 徽标 |
| `TOAST_CSS` | Toast Shadow | 成功/错误图标、`fid-toast-in` 动画 |
| `FILTER_CSS` | 筛选栏 Shadow | 搜索框、计数、FC 搜索/詳細検索按钮、条件网格 |
| `PANEL_CSS` | 面板 Shadow | 复制全部、暗色拨杆、历史列表、移动端抽屉 |

所有 CSS 以字符串数组 `join('')` 生成，没有预处理器或压缩步骤。

---

## M3 Shadow DOM 与全局样式基础设施

**职责**：统一创建 Shadow Root、注入组件样式、处理外部暗色插件干扰、注入全局样式。

### `attachShadowCss(host, key, css) → ShadowRoot`

[L562-L580](../fantia-product-search-enhancer.user.js#L562-L580)

1. `host.attachShadow({ mode: 'open' })`。
2. 若支持 `CSSStyleSheet` 且 `adoptedStyleSheets` 可用：
   - 以 `key`（`bar` / `fab` / `toast` / `filter` / `panel`）在 `shadowSheets` 缓存中复用样式表；
   - 首次用 `replaceSync(css)` 构建；
   - 赋给 `root.adoptedStyleSheets`。
3. 任一步抛错则回退：创建 `<style>` 写入 `css` 并 `appendChild`。

**副作用**：同一 `key` 的所有组件共享同一个 `CSSStyleSheet` 实例；回退路径下每个实例各有一份 `<style>`。

### `clearHostBackground(host)`

[L583-L585](../fantia-product-search-enhancer.user.js#L583-L585)

把宿主 `background-color` 设为 `transparent !important`，防止 Dark Reader 等扩展给宿主刷不透明底色，导致 Shadow 内毛玻璃失效。

### `injectCss()`

[L587-L593](../fantia-product-search-enhancer.user.js#L587-L593)

向 `head`（或 `documentElement`）插入 `<style id="fantia-id-style">`，内容为 `CSS_TEXT`；已存在则跳过。

---

## M4 主题检测与脚本 UI 明暗

**职责**：判断当前页面是否处于暗色环境，并切换脚本自身 UI 的变量组。

### `detectDark() → boolean`

[L598-L620](../fantia-product-search-enhancer.user.js#L598-L620)

按以下顺序判断：

1. `getComputedStyle(document.documentElement).colorScheme` 含 `dark` → `true`；含 `light` → `false`。
2. 依次看 `body`、`html` 的背景色：忽略 alpha < 0.2；按亮度 `0.2126R + 0.7152G + 0.0722B` 归一化，< 0.45 视为暗色。
3. 回退到 `prefers-color-scheme: dark`。
4. 任何异常返回 `false`。

**注意**：`color-scheme: light dark` 同时包含两个关键字，代码先匹配 `dark`，因此会被判为暗色。这是启发式判断的边界。

### `syncTheme()`

[L622-L626](../fantia-product-search-enhancer.user.js#L622-L626)

把 `fid-dark` 类同步到 `<html>`。`fid-dark` 只影响脚本 UI 的设计变量，不影响站点。

### `watchTheme()`

[L637-L643](../fantia-product-search-enhancer.user.js#L637-L643)

监听 `prefers-color-scheme` 变化并调用 `syncTheme()`；兼容旧版 `addListener`。

### `syncPageMode()`

[L628-L635](../fantia-product-search-enhancer.user.js#L628-L635)

当 `shouldRun()` 为真且页面存在 `[data-fid-grid]` 时，给 `<html>` 加 `fid-wide`，否则移除。决定宽屏 CSS 是否生效。

---

## M5 页面判定与商品链接采集

### `shouldRun() → boolean`

[L648-L654](../fantia-product-search-enhancer.user.js#L648-L654)

```text
商品详情页 /products/<id>  → false
帖子详情页 /posts/<id>     → false
不在 PAGE_RE 覆盖范围        → false
其他                         → true
```

只控制列表增强，不影响暗色模式。

### `productIdFromHref(href) → string`

[L656-L659](../fantia-product-search-enhancer.user.js#L656-L659)

用 `PRODUCT_HREF_RE` 提取数字 ID；无匹配返回空字符串。

### `collectProductLinks() → Array<{ a: HTMLAnchorElement, id: string }>`

[L661-L669](../fantia-product-search-enhancer.user.js#L661-L669)

查询 `a[href*="/products/"]`，逐个提取 ID。**这是所有列表能力的事实来源**：ID 条、筛选、FAB 计数、宽屏识别、无限滚动初始化都依赖它。

### `uniqueIds(visibleOnly) → string[]`

[L671-L683](../fantia-product-search-enhancer.user.js#L671-L683)

按 DOM 顺序去重。`visibleOnly` 为真时跳过 `hiddenIds` 中记录的 ID（筛选后被隐藏的卡片）。

---

## M6 复制历史

**职责**：跨页面保存最近复制的商品 ID，供面板展示、按钮状态回显。

### 数据结构

```js
// localStorage['fantia-id-history-v1']
[
  { "id": "123456", "t": 1760000000000 }   // t = Date.now()
]
```

- 键：`HISTORY_KEY = 'fantia-id-history-v1'`（[L688](../fantia-product-search-enhancer.user.js#L688)）
- 上限：`HISTORY_MAX = 500`（[L689](../fantia-product-search-enhancer.user.js#L689)）
- 缓存：`idHistory`，首次 `loadHistory()` 时懒加载

### 函数

| 函数 | 行为 | 位置 |
| --- | --- | --- |
| `loadHistory()` | 懒加载并解析 JSON；失败返回 `[]` | [L692-L699](../fantia-product-search-enhancer.user.js#L692-L699) |
| `saveHistory()` | 截断到 500 条后写回；失败静默 | [L701-L705](../fantia-product-search-enhancer.user.js#L701-L705) |
| `historyHas(id)` | 线性查找是否已复制 | [L707-L713](../fantia-product-search-enhancer.user.js#L707-L713) |
| `recordIds(ids)` | 去重后把每条移到最前并更新时间；超限截断；刷新按钮状态；面板打开时重渲染 | [L715-L734](../fantia-product-search-enhancer.user.js#L715-L734) |
| `formatTime(t)` | 输出 `MM-DD HH:mm` | [L736-L743](../fantia-product-search-enhancer.user.js#L736-L743) |

**副作用**：`recordIds()` 会调用 `refreshBarStates()`，因此一次复制会让页面上所有同 ID 的条同步显示「已复制」。

---

## M7 卡片识别

**职责**：把商品链接映射到「一张卡片」与「该卡片的作用域」，为注入和去重提供稳定容器。

### `productIdsIn(el) → { [id]: true }`

[L751-L759](../fantia-product-search-enhancer.user.js#L751-L759)

收集元素子树内所有商品链接的 ID，用于判断「这一层是否已经跨到多商品容器」。

### `resolveCard(anchor) → Element`

[L761-L781](../fantia-product-search-enhancer.user.js#L761-L781)

从链接向上最多 8 层：

- 若当前元素含 **> 1** 个商品 ID → 立即停止（已到网格/列表层）。
- 若含 `.card-body`，或「含 `img` 且去空白文本长度 > 8」→ 认定当前元素为卡片并返回。
- 否则继续向上。
- 循环结束仍未命中：返回最后一个只含单商品的祖先；再退化到 `anchor.parentElement`。

**为什么不用 `.card-thumbnail` 单独作特征**：Fantia 存在「外层 div 卡片 + 内层 `<a>` 只包缩略图」的布局，认缩略图包装会把 ID 条插进链接里、位于介绍上方。

### `cardScope(anchor) → Element`

[L785-L797](../fantia-product-search-enhancer.user.js#L785-L797)

向上最多 10 层，返回「仍只含这一个商品的最大祖先」。用途：

- 清理旧版本重复条时，以 scope 为边界。
- 当同一商品被缩略图链接和标题链接同时指向、两条链接解析出不同卡片时，保证只保留一条 ID 条。

---

## M8 ID 条注入与扫描

### `makeBar(id) → HTMLDivElement`

[L802-L887](../fantia-product-search-enhancer.user.js#L802-L887)

创建宿主 `div.fantia-id-bar`：

- `data-fantia-product-id = id`
- Shadow 内结构：

```text
.bar
├── .fid-icon    链接图标
├── .fid-label   「商品 ID」
├── .fid-num     ID 数字（等宽、可整段选中）
└── button.fantia-id-btn  复制 / 已复制
```

事件设计：

| 事件 | 行为 |
| --- | --- |
| 按钮 `click` | 阻止默认/冒泡；以宿主当前 `data-*` 为准；`copyText` → `flashButton`；成功则 `recordIds` + `toast` |
| 按钮 `mouseenter` | 若处于 `done` 且无锁定定时器，临时恢复「复制」 |
| 按钮 `mouseleave` | 按历史状态恢复显示 |
| `.bar` `click` / `dragstart` | 阻止默认，避免触发整卡 `<a>` |
| 宿主 `click` / `auxclick` | 再兜一层阻止冒泡与默认行为 |

### `applyBtnState(btn, id)`

[L890-L896](../fantia-product-search-enhancer.user.js#L890-L896)

- 有锁定定时器（`btn.__fidTimer`）时不动。
- 按 `historyHas(id)` 决定「已复制（check）」或「复制（clip）」。
- 切换 `done` 类。

### `refreshBarStates()`

[L898-L905](../fantia-product-search-enhancer.user.js#L898-L905)

遍历所有 `.fantia-id-bar`，通过 `shadowRoot` 找到按钮并重新应用状态。复制、清空历史后调用。

### `flashButton(btn, ok, bar)`

[L907-L920](../fantia-product-search-enhancer.user.js#L907-L920)

- 清除旧定时器，`disabled = true` 防连点。
- 加 `ok` / `err` 类，显示「已复制」或「失败」。
- 1.5s 后解锁并回到 `applyBtnState()`。

### `updateBar(bar, id)`

[L922-L930](../fantia-product-search-enhancer.user.js#L922-L930)

SPA 复用 DOM 后校正 ID：更新 `data-*`、`.fid-num` 文本、按钮状态。

### `scan()` — 全量协调器

[L932-L1001](../fantia-product-search-enhancer.user.js#L932-L1001)

一次扫描做九件事：

1. `syncPageMode()`；
2. 若 `shouldRun()` 为假：清理无限滚动、面板、筛选栏、吸顶变量、FAB，直接返回；
3. `injectCss()` + `syncTheme()`；
4. `widenLayout()` 打网格/侧栏标记；
5. 再 `syncPageMode()`（有网格才加 `fid-wide`）；
6. 采集链接，`ensureFilterBar(links.length > 0)`；
7. `ensureNavOffset()` 量标签栏；
8. `setupInfiniteScroll()`；
9. 逐链接：`resolveCard` → `cardScope` → 清理同作用域重复条 → 复用 `updateBar` 或新建 `makeBar` → 结束时 `applyFilter`、`updateFilterCount`、`updateFab`。

去重细节（[L957-L974](../fantia-product-search-enhancer.user.js#L957-L974)）：同一 scope 内若有多个条，计算每个条到 scope 的祖先深度，保留深度最小（最靠近卡片）的一条。

---

## M9 剪贴板与 Toast

### `copyText(text) → Promise<boolean>`

[L1006-L1012](../fantia-product-search-enhancer.user.js#L1006-L1012)

- 有 `navigator.clipboard.writeText`：成功 `true`；拒绝时降级 `legacyCopy`。
- 无 API：直接 `legacyCopy`。

### `legacyCopy(text) → boolean`

[L1014-L1032](../fantia-product-search-enhancer.user.js#L1014-L1032)

创建只读 `textarea`，固定定位、透明、`select()` 后 `execCommand('copy')`，最后移除。异常返回 `false`。

### `toast(msg, isErr)`

[L1035-L1061](../fantia-product-search-enhancer.user.js#L1035-L1061)

- 先移除已有 `.fantia-toast`、清定时器，保证同时只显示一条。
- Shadow 内渲染图标 + 文本，挂到 `body`。
- 1.8s 后移除。
- `role="status"`、`aria-live="polite"`，错误时加 `err` 类与警告图标。

---

## M10 悬浮按钮 FAB

### `ensureFab()`

[L1065-L1091](../fantia-product-search-enhancer.user.js#L1065-L1091)

首次创建 `div.fantia-fab`（Shadow 内 `button.fab` + `.fab-badge`），点击调用 `togglePanel()`。已有则跳过。

### `updateFab()`

[L1093-L1106](../fantia-product-search-enhancer.user.js#L1093-L1106)

- 不在列表页：从 DOM 移除并清空引用。
- 否则计算 `uniqueIds(!!filterQuery).length`（筛选时只算可见）。
- 只在数值变化时写 `textContent`，避免触发 `MutationObserver` 自激。
- 数量为 0 时 `display: none`。

---

## M11 悬浮面板

**职责**：展示「复制本页全部」、暗色开关、复制历史。

### `buildPanel()`

[L1162-L1242](../fantia-product-search-enhancer.user.js#L1162-L1242)

只构建一次，结构：

```text
.fantia-panel (Shadow)
└── .panel
    ├── .panel-title      「商品 ID 面板」
    ├── button.copy-all   「复制本页全部」
    ├── .dark-row         「页面黑暗模式」+ button.dark-switch
    ├── .hist-head        「最近复制」+ button.hist-clear
    ├── .hist-list        历史条目
    └── .panel-foot       操作提示
```

同时注册两个文档级监听：

- `click`：点击面板与 FAB 之外关闭。
- `keydown`：`Escape` 关闭。

### `openPanel()` / `closePanel()` / `togglePanel()`

[L1294-L1311](../fantia-product-search-enhancer.user.js#L1294-L1311)

- `openPanel()`：构建（若未建）、更新按钮为「复制本页全部（N）」、渲染历史、`display: block`。
- `closePanel()`：`display: none` 并解除清空确认状态。
- `togglePanel()`：按 `display` 切换。

### `renderHistory()`

[L1244-L1292](../fantia-product-search-enhancer.user.js#L1244-L1292)

- 标题更新为「最近复制 · N」。
- 无记录显示空状态；有记录**最多渲染前 50 条**（存储上限仍是 500）。
- 每条显示 ID、时间、复制图标；点击条目再次复制并 `recordIds`。

### `copyAllVisible()`

[L1146-L1160](../fantia-product-search-enhancer.user.js#L1146-L1160)

- 取 `uniqueIds(!!filterQuery)`；为空时错误 Toast。
- 以换行连接写入剪贴板。
- 成功后 `recordIds(ids)` 并提示数量（筛选时标注「筛选后」）。

### 两段式清空

| 函数 | 行为 | 位置 |
| --- | --- | --- |
| `clearHistoryArm(btn)` | 第一次点击进入 `arm`，文案变「确认清空？」，3s 后自动解除；第二次点击真正清空 | [L1323-L1337](../fantia-product-search-enhancer.user.js#L1323-L1337) |
| `disarmClear()` | 清定时器、移除 `arm`、恢复「清空」文案 | [L1315-L1321](../fantia-product-search-enhancer.user.js#L1315-L1321) |

清空后：`idHistory = []` → `saveHistory()` → `renderHistory()` → `refreshBarStates()`（所有按钮回到「复制」）→ Toast。

---

## M12 站点黑暗模式

**职责**：一键切换整站暗色，偏好跨页面记忆，并与脚本 UI 明暗联动。

### 状态与存储

- 键：`SITE_DARK_KEY = 'fantia-id-sitedark'`（[L1121](../fantia-product-search-enhancer.user.js#L1121)）
- 值：`'1'` / `'0'`
- 内存：`siteDark`，`null` 表示尚未加载

### 函数

| 函数 | 行为 | 位置 |
| --- | --- | --- |
| `loadSiteDark()` | 懒加载偏好；异常按浅色 | [L1124-L1130](../fantia-product-search-enhancer.user.js#L1124-L1130) |
| `applySiteDark()` | 切换 `html.fid-site-dark`；同步拨杆 `on` 类 | [L1132-L1137](../fantia-product-search-enhancer.user.js#L1132-L1137) |
| `toggleSiteDark()` | 取反、写存储、应用、调用 `syncTheme()` | [L1139-L1144](../fantia-product-search-enhancer.user.js#L1139-L1144) |

### 生效范围

- CSS 规则以 `html.fid-site-dark` 为前缀，全站生效（首页、详情页、帖子页、后台）。
- `boot()` 首行调用 `applySiteDark()`，避免刷新闪白。
- `color-scheme: dark` 让 `detectDark()` 把脚本 UI 一并切暗。

### 覆盖策略

四层，详见 [01 · 7.6](01-architecture.md#76-站点暗色分层策略)：

1. 结构性容器刷透明；
2. 区块级结构标签抹除 `background-image`；
3. Bootstrap 通用组件逐个上色；
4. 工具类（`.bg-*` / `.text-*`）与表单控件补漏。

另对 `img` / `video` 加 `brightness(.8) contrast(.98)`。

---

## M13 页首搜索与筛选栏

**职责**：列表页顶部插入一条增强栏：

- 所有列表页：按 ID / 标题实时筛选本页卡片。
- FC 商品页：额外提供站内关键词搜索、詳細検索（标签 / 状态 / 商品类型 / 排序），并隐藏站点原生关键词行。

### 13.1 锚点与状态

`filterAnchor()`（[L1361-L1370](../fantia-product-search-enhancer.user.js#L1361-L1370)）按优先级返回插入锚点：

1. `[data-fid-split]`（宽屏侧栏行）
2. `[data-fid-grid]`（宽屏网格）
3. `#main > .container` 的第一个子元素
4. `#main`

这样在 Market 等居中页面不会插出一条通栏。

模块级状态（[L1346-L1359](../fantia-product-search-enhancer.user.js#L1346-L1359)）：

| 变量 | 含义 |
| --- | --- |
| `filterHost` | 筛选栏宿主（`div.fantia-filter-bar`） |
| `filterSlot` | 占位槽（`div.fantia-filter-slot`） |
| `filterInput` / `filterCount` / `filterSearchBtn` / `filterDetailBtn` | 内部节点 |
| `advPanel` / `advFields` | 詳細検索面板与字段引用 |
| `filterQuery` | 当前本地筛选词（已 trim + 小写） |
| `hiddenIds` | 当前被筛掉的商品 ID 集合 |
| `filterDebounce` | 150ms 防抖句柄 |
| `filterUrlKey` | `pathname + search` 快照，用于判断是否重建 |
| `filterFixed` | 是否处于 fixed 吸顶态 |
| `filterRo` | `ResizeObserver` |

### 13.2 FC 上下文与提交

| 函数 | 行为 | 位置 |
| --- | --- | --- |
| `fcSearchContext()` | 匹配 `/fanclubs/<id>/products`，返回 `{ base, tab, keyword, tag, saleStatus, saleType, sort }`；非 FC 商品页返回 `null` | [L1373-L1386](../fantia-product-search-enhancer.user.js#L1373-L1386) |
| `fcServerSearchActive()` | URL 中是否存在关键词/标签/状态/类型条件 | [L1388-L1392](../fantia-product-search-enhancer.user.js#L1388-L1392) |
| `fcSubmitSearch()` | 组装 `product_tab` + `q[...]` + `q[s]`，`location.assign` 到 FC 商品路由 | [L1396-L1413](../fantia-product-search-enhancer.user.js#L1396-L1413) |
| `fcClearSearch()` | 只保留 `product_tab` 与排序，回到无搜索条件的地址 | [L1415-L1422](../fantia-product-search-enhancer.user.js#L1415-L1422) |

提交参数规则：

| 参数 | 来源 | 处理 |
| --- | --- | --- |
| `product_tab` | 当前 URL，缺省 `all` | 始终保留 |
| `q[name_cont]` | 输入框关键词 | 非空才写入 |
| `q[tag]` | 标签输入框 | 去掉前导 `#`，连续空白压成一个空格 |
| `q[sale_status]` | 状态下拉 | `0` 销售中 / `1` COMING SOON / `2` 销售结束 |
| `q[sale_type]` | 类型下拉 | `0` 自宅发货 / `1` 下载 / `5` 匿名配送 / `8` 仓库发货 / `10` 抽奖 / `11` 投稿精选 / `12` 见面会 |
| `q[s]` | 排序下拉 | `newer` 新着 / `updater` 更新 / `popular` 收藏 |

### 13.3 詳細検索面板

`makeAdvPanel()`（[L1424-L1500](../fantia-product-search-enhancer.user.js#L1424-L1500)）动态构建四个字段并写入 `advFields`：

- `tag`：文本框
- `status`、`type`、`sort`：下拉框
- 底部「清空条件」重置为默认值并刷新按钮态
- 底部「搜索」调用 `fcSubmitSearch()`

配套函数：

- `syncAdvFromUrl()`（[L1502-L1509](../fantia-product-search-enhancer.user.js#L1502-L1509)）：从 URL 回填字段。
- `updateDetailState()`（[L1511-L1520](../fantia-product-search-enhancer.user.js#L1511-L1520)）：面板展开或有非默认条件时给按钮加 `on`，并维护 `aria-expanded`。

### 13.4 构建与吸顶切换

`ensureFilterBar(hasProducts)`（[L1606-L1740](../fantia-product-search-enhancer.user.js#L1606-L1740)）：

1. 既非 FC 商品页又无商品 → `removeFilterBar()` 并返回（避免 Market 首页被顶出一条）。
2. 取锚点。
3. 若已有栏且 `filterUrlKey === pathname + search`：仅在位置漂移时把占位槽移到锚点前，`syncFilterAffix()` 后返回。
4. URL 变化 → 销毁重建。
5. 创建占位槽 + 宿主，Shadow 样式 `FILTER_CSS`。
6. 组装搜索图标、输入框（占位文案按是否 FC 区分，FC 回填 `q[name_cont]`）、计数、清空按钮。
7. 输入：150ms 防抖后 `applyFilterFromInput()`。
8. 键盘：FC 页 `Enter` 提交服务端搜索；`Escape` 清空。
9. FC 页追加搜索按钮、詳細検索按钮与条件面板。
10. 插入 DOM，切换 `html.fid-fc-search`。
11. 绑定 `ResizeObserver`，恢复已有 `filterQuery`，刷新计数与吸顶状态。

焦点保留：`setFilterFixed()` 在节点跨父级移动前后调用 `stashFilterFocus()` / `restoreFilterFocus()`（[L1522-L1539](../fantia-product-search-enhancer.user.js#L1522-L1539)），保存输入框的选区。

`removeFilterBar()`（[L1587-L1604](../fantia-product-search-enhancer.user.js#L1587-L1604)）会断开观察器、移除两个节点、清空全部引用与 `hiddenIds`、移除 `fid-fc-search`。

### 13.5 过滤执行

| 函数 | 行为 | 位置 |
| --- | --- | --- |
| `applyFilterFromInput()` | 读取输入、trim + 小写，调用 `applyFilter()` 与 `updateFab()` | [L1742-L1746](../fantia-product-search-enhancer.user.js#L1742-L1746) |
| `clearFilter()` | 清输入与查询；若之前存在服务端搜索条件，跳回无搜索地址 | [L1748-L1755](../fantia-product-search-enhancer.user.js#L1748-L1755) |
| `applyFilter()` | 遍历 ID 条，按「ID 子串或卡片文本子串」显示/隐藏卡片，记录 `hiddenIds` | [L1757-L1773](../fantia-product-search-enhancer.user.js#L1757-L1773) |
| `updateFilterCount(visible?)` | 显示「可见 / 总数」或「N 个商品」；维护 `has-query` | [L1775-L1791](../fantia-product-search-enhancer.user.js#L1775-L1791) |

匹配规则：

```text
match = !filterQuery
     || id.indexOf(filterQuery) >= 0
     || card.textContent.toLowerCase().indexOf(filterQuery) >= 0
```

被隐藏的是 `bar.parentNode`（即卡片），方式是写内联 `style.display`。

---

## M14 标签栏避让与吸顶

**职责**：量取站点标签栏高度，驱动增强栏在滚动时吸附到标签栏下方。

### 站点侧行为

FC 页面标签栏由站点自己实现吸顶：滚动后给 `.fanclub-tabs.js-affix-nav` 加 `is-fixed`。脚本**不克隆**标签栏，只读取高度。

### 函数

| 函数 | 行为 | 位置 |
| --- | --- | --- |
| `ensureNavOffset()` | 查找 `.fanclub-tabs.js-affix-nav` 或 `nav.scroll-tabs`，记录 `navSource` | [L1819-L1826](../fantia-product-search-enhancer.user.js#L1819-L1826) |
| `syncNavOffset()` | 元素仍连接时取四舍五入高度，写入 `--fid-nav-h`；变化才写 | [L1809-L1817](../fantia-product-search-enhancer.user.js#L1809-L1817) |
| `removeNavOffset()` | 清引用、高度与 CSS 变量 | [L1803-L1807](../fantia-product-search-enhancer.user.js#L1803-L1807) |
| `setFilterFixed(on)` | 在占位槽与 `body` 之间移动宿主，切换 `fid-filter-fixed`，保留焦点 | [L1541-L1556](../fantia-product-search-enhancer.user.js#L1541-L1556) |
| `syncFilterAffix()` | 仅 FC 页：比较占位槽顶部与 `--fid-nav-h`，决定 fixed 与否并同步 left/width/top | [L1558-L1585](../fantia-product-search-enhancer.user.js#L1558-L1585) |

fixed 态关键计算：

```text
slotRect = filterSlot.getBoundingClientRect()
shouldFix = slotRect.top < navH - 0.5
slot.height = filterHost.offsetHeight + 14      // 14 = 宿主 margin-bottom
host.left = slotRect.left
host.width = slotRect.width
host.top = navH
```

`+14` 与 `FILTER_CSS` / `CSS_TEXT` 中的 `margin: 0 0 14px` 对应，保证占位高度等于原占位 + 宿主高度。

---

## M15 宽屏布局重排

**职责**：运行时识别商品网格与「侧栏 + 内容」结构，打标记供 CSS 在 ≥1200px 时重排。

### `widenLayout()`

[L1833-L1864](../fantia-product-search-enhancer.user.js#L1833-L1864)

1. `/market` 直接返回。
2. 遍历商品链接，解析卡片。
3. 从卡片父元素向上最多 6 层，寻找 `.row`。
4. 统计该 `.row` 的直接 `[class*="col-"]` 子元素中，含商品 ID 的列数。
5. ≥2 列 → 打 `data-fid-grid="1"`，加入 `tagged`，调用 `markSplit()`，跳出。
6. 若祖先已在 `tagged` 中则停止，避免重复处理。

`tagged` 使用 `Set` 而非普通对象：普通对象会把所有 DOM 元素并成同一个字符串键。

### `markSplit(grid)`

[L1866-L1877](../fantia-product-search-enhancer.user.js#L1866-L1877)

- `wrap = grid.parentElement`，`row = wrap.parentElement`。
- 要求 `row` 是 `.row` 且**恰好两个子元素**。
- 兄弟列不得包含商品链接（否则不是侧栏）。
- 打标记：`row[data-fid-split]`、兄弟列 `[data-fid-side]`、内容列 `[data-fid-main]`。

CSS 在宽屏下：

- `[data-fid-split]` → flex，gap 20px
- `[data-fid-side]` → 固定 220px
- `[data-fid-main]` → 自适应剩余宽度
- `[data-fid-grid]` → `grid-template-columns: repeat(auto-fill, minmax(220px, 1fr))`
- 清除 `::before/::after`（Bootstrap clearfix 会占掉第一格）

---

## M16 无限滚动

**职责**：有「下一页」时，滚动到接近底部自动抓取并追加商品卡片，跨页接龙到最后一页。

### 启用条件

1. 页面存在 `[data-fid-grid]`（即 `widenLayout()` 已识别网格）。
2. 分页中存在下一页链接：`.pagination li.next a[href]`、`.pagination .next a[href]` 或 `a[rel="next"]`。
3. 浏览器支持 `IntersectionObserver`。

### 状态对象

[L1887-L1892](../fantia-product-search-enhancer.user.js#L1887-L1892)：

```js
var INF_PRELOAD = 1200;   // 预载距离
var INF_GAP = 300;        // 最小抓取间隔

var inf = {
  url: null,        // 下一页地址；null 表示结束或空闲
  loading: false,   // 是否有请求在途
  page: 1,          // 当前页序号（初始页为 1，每追加一页 +1）
  observer: null,   // IntersectionObserver
  sentinel: null,   // 1px 哨兵
  lastUrl: null,    // 启用时的 location.href，用于 SPA 变化重置
  grid: null,       // 当前网格元素
  timer: null,      // 续泵定时器
  fails: 0,         // 连续失败次数
  retryAt: 0,       // 下次允许重试的时间戳
  seen: null        // 已见商品 ID 集合
};
```

### 辅助函数

| 函数 | 行为 | 位置 |
| --- | --- | --- |
| `paginationNextUrl(root, base?)` | 从给定文档/节点找下一页并解析为绝对 URL | [L1894-L1901](../fantia-product-search-enhancer.user.js#L1894-L1901) |
| `findGridRowIn(doc)` | 在解析出的文档里选「含商品列最多」的 `.row`（≥2 列） | [L1905-L1918](../fantia-product-search-enhancer.user.js#L1905-L1918) |
| `ensureSentinel(grid)` | 创建/重新挂载 1px 哨兵到网格后 | [L1948-L1957](../fantia-product-search-enhancer.user.js#L1948-L1957) |
| `sentinelInRange()` | 哨兵仍连接且 `top <= viewport + 1200` | [L1935-L1939](../fantia-product-search-enhancer.user.js#L1935-L1939) |
| `endInfiniteScroll(msg)` | 清空 `inf.url`，取消观察，记录调试日志 | [L1941-L1945](../fantia-product-search-enhancer.user.js#L1941-L1945) |
| `cleanupInfiniteScroll()` | 清定时器、断开观察、移除哨兵、重置全部字段 | [L1920-L1933](../fantia-product-search-enhancer.user.js#L1920-L1933) |

### `setupInfiniteScroll()`

[L1959-L1994](../fantia-product-search-enhancer.user.js#L1959-L1994)

1. `inf.lastUrl` 与当前 `location.href` 不同 → `cleanupInfiniteScroll()`。
2. 找不到网格 → 返回。
3. 已有观察器且网格未变 → 只确认哨兵位置后返回。
4. 网格被替换 → 清空重建。
5. 无下一页或不支持 `IntersectionObserver` → 返回。
6. 初始化 `lastUrl/grid/url/page/fails/retryAt/seen`（`seen` 先填入当前页所有 ID）。
7. 创建观察器（`rootMargin: '1200px 0px'`）并观察哨兵。
8. 立即 `pumpNextPage()`，处理首屏未填满的情况。

### `pumpNextPage()`

[L1997-L2006](../fantia-product-search-enhancer.user.js#L1997-L2006)

- 无 URL、正在加载、已有定时器 → 返回。
- 哨兵不在预载范围 → 返回。
- 计算等待时间 `max(300, retryAt - now)`，定时后调用 `loadNextPage()`。

### `loadNextPage()`

[L2008-L2064](../fantia-product-search-enhancer.user.js#L2008-L2064)

1. 守卫：有 URL、非加载中、网格存在、哨兵在范围内。
2. 网格被替换：清理并重新 `setupInfiniteScroll()`。
3. **先取走 URL 再置空**，保证失败或重复触发都不会重复抓同一页。
4. `fetch(url, { credentials: 'same-origin' })` → 非 2xx 抛错 → 文本。
5. `DOMParser` 解析 → `findGridRowIn`。
6. 找不到网格 → 结束。
7. 遍历列，用 `inf.seen` 判断是否有新 ID；重复列跳过；新列 `document.importNode(col, true)` 追加。
8. 没有新列 → 结束。
9. `page++`、清零失败计数、从**抓取页**解析下一页（基准是抓取 URL）。
10. `scan()` 给新卡片注入 ID 条并套用筛选。
11. 无下一页 → 结束。
12. 失败：`fails++`、恢复 URL、`backoff = min(30000, 1200 × fails²)`、记录 `retryAt`。
13. 收尾：`loading = false`，120ms 后再次 `pumpNextPage()`（等滚动锚定完成，避免读到旧位置提前收手）。

**终止原因**：`下一页找不到商品网格`、`下一页没有新商品`、`没有下一页`。终止后保留原分页，用户仍可手动跳页。

---

## M17 启动与调度

### `boot()`

[L2070-L2132](../fantia-product-search-enhancer.user.js#L2070-L2132)

- `booted` 守卫；`document.body` 不存在则 250ms 后重试。
- 初始化顺序：`applySiteDark()` → `syncTheme()` → `syncPageMode()` → `watchTheme()` → `injectCss()` → `scan()`。
- `MutationObserver` 监听 `body` 的 `childList + subtree`，400ms 节流调用 `scan()`。
- `setInterval(scan, 1500)` 轮询兜底。
- `scroll` 用 `requestAnimationFrame` 节流调用 `syncNavOffset()`、`syncFilterAffix()`、`pumpNextPage()`。
- `resize` 直接调用同上三函数。
- 文档捕获阶段 `click`：若詳細検索展开且点击路径不包含筛选栏，收起面板（用 `composedPath()` 穿透 Shadow DOM）。
- `popstate` 300ms 后扫描；`turbo:load`、`page:load` 立即扫描。

### 入口

[L2134-L2140](../fantia-product-search-enhancer.user.js#L2134-L2140)

```text
readyState === 'loading'
  → DOMContentLoaded 时 boot()
  → 同时 setTimeout(boot, 2500) 兜底（防止第三方脚本卡住 DOMContentLoaded）
否则
  → 立即 boot()
```

`@run-at document-idle` 下通常走立即启动分支。
