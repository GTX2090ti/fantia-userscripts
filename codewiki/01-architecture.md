# 01 · 整体架构

## 1. 项目定位

这是一个**单文件、无构建、无第三方依赖**的用户脚本，运行在 Fantia 站点页面内，做四类事情：

1. **读页面**：从 DOM 中识别商品卡片、商品链接、分页、标签栏、网格容器。
2. **改页面**：注入 ID 条、筛选栏、悬浮按钮与面板，必要时重排宽屏布局、切换整站暗色。
3. **存偏好**：把复制历史、暗色开关、调试开关写入 `localStorage`。
4. **抓下一页**：在结构可识别时用同源 `fetch` 抓取分页 HTML，解析后把商品列追加到当前网格。

所有代码位于 [fantia-product-search-enhancer.user.js](../fantia-product-search-enhancer.user.js) 的一个 IIFE 内（[L79-L2141](../fantia-product-search-enhancer.user.js#L79-L2141)），通过 `window.__fantiaProductIdBarLoaded` 防止同一页面重复执行（[L82-L83](../fantia-product-search-enhancer.user.js#L82-L83)）。

## 2. 运行模型

### 2.1 脚本元信息

| 字段 | 值 | 影响 |
| --- | --- | --- |
| `@match` | `https://fantia.jp/*` | 全站匹配；暗色模式在所有页面生效，列表增强只在列表页生效 |
| `@grant` | `none` | 无 `GM_*` API，不能跨域请求、不能用管理器存储；全部依赖标准 Web API |
| `@run-at` | `document-idle` | 首扫时 DOM 基本就绪 |
| `@updateURL` / `@downloadURL` | GitHub raw 地址 | 管理器按 `@version` 自动更新 |
| `@version` | `1.5.3` | 发版必须同步递增 |

### 2.2 为什么是单文件

- 用户脚本管理器以单文件安装、更新，拆文件需要打包器，反而增加发布成本。
- 没有模块导入，函数直接声明在 IIFE 作用域内，靠**命名约定**（`ensure*` / `sync*` / `apply*` / `render*`）表达职责。
- 代价：模块级状态共享、无类型约束、无单元测试，改动时需要靠本文档和手动回归清单控制风险。

### 2.3 生命周期边界

脚本不接管路由，只**观察**页面：

- 首次：`DOMContentLoaded` 或 `document-idle` 启动，若 `<body>` 未出现则每 250ms 重试（[L2070-L2076](../fantia-product-search-enhancer.user.js#L2070-L2076)）。
- 后续：`MutationObserver`（400ms 节流）+ 1.5s 轮询 + `popstate` / `turbo:load` / `page:load` 触发重新扫描（[L2083-L2131](../fantia-product-search-enhancer.user.js#L2083-L2131)）。
- 离开列表页时：`scan()` 检测到 `shouldRun() === false`，主动清理 FAB、筛选栏、无限滚动、吸顶变量与面板（[L934-L941](../fantia-product-search-enhancer.user.js#L934-L941)）。已注入的 ID 条不单独移除，依赖站点替换列表 DOM。

## 3. 分层视图

```text
┌───────────────────────────────────────────────────────────────┐
│ 启动与调度层                                                   │
│   boot() · scan() · MutationObserver · setInterval · rAF scroll │
├───────────────────────────────────────────────────────────────┤
│ 领域能力层                                                     │
│   页面判定 · 卡片识别 · ID 条 · 复制历史 · 筛选/站内搜索        │
│   宽屏重排 · 标签栏避让 · 无限滚动 · 站点暗色 · 主题检测         │
├───────────────────────────────────────────────────────────────┤
│ UI 层（每个组件一个 Shadow DOM 宿主）                           │
│   .fantia-id-bar │ .fantia-fab │ .fantia-panel                 │
│   .fantia-toast  │ .fantia-filter-bar                           │
├───────────────────────────────────────────────────────────────┤
│ 基础设施层                                                     │
│   injectCss() · attachShadowCss() · copyText() · localStorage  │
├───────────────────────────────────────────────────────────────┤
│ 宿主环境                                                       │
│   Fantia DOM · Fantia 路由 · 浏览器 API · 用户脚本管理器         │
└───────────────────────────────────────────────────────────────┘
```

层次之间的规则：

- **只有启动层调用 `scan()`**，其他模块不自行轮询。
- **领域层不直接操作站点全局样式**，站点级样式只由 `injectCss()` 注入的 `#fantia-id-style` 与 `html` 状态类承担。
- **UI 组件全部走 Shadow DOM**，视觉样式在组件内部，宿主只负责定位与占位。
- **基础设施函数无业务状态**（`attachShadowCss` 的样式表缓存除外）。

## 4. 启动与刷新时序

```text
document-idle / DOMContentLoaded
   │
   └─ boot()                                  [L2070]
       ├─ 等待 document.body（缺失则 250ms 重试）
       ├─ applySiteDark()                     恢复暗色偏好，避免加载闪白
       ├─ syncTheme()                         html.fid-dark：脚本 UI 明暗
       ├─ syncPageMode()                      html.fid-wide：此时通常尚未打网格标记
       ├─ watchTheme()                        监听系统主题变化
       ├─ injectCss()                         <style id="fantia-id-style">
       └─ scan()                               [L932]
           ├─ syncPageMode()
           ├─ shouldRun() ──false──> cleanupInfiniteScroll / closePanel
           │                        removeFilterBar / removeNavOffset / updateFab
           ├─ injectCss() · syncTheme()
           ├─ widenLayout()                   识别 .row 网格 → data-fid-grid / split
           ├─ syncPageMode()                  有网格才加 html.fid-wide
           ├─ collectProductLinks()
           ├─ ensureFilterBar(links.length>0)
           ├─ ensureNavOffset()               量标签栏高度 → --fid-nav-h
           ├─ setupInfiniteScroll()           有下一页且已识别网格时启用
           └─ 逐链接处理：
                resolveCard() → cardScope() → 清理重复条
                → 复用 updateBar() 或注入 makeBar()
                → applyFilter()（有查询时）
                → updateFilterCount() → updateFab()
   │
   ├─ MutationObserver(body, childList+subtree) ──400ms 节流──> scan()
   ├─ setInterval(scan, 1500)                 轮询兜底
   ├─ scroll ──requestAnimationFrame──> syncNavOffset / syncFilterAffix / pumpNextPage
   ├─ resize ──> 同上
   ├─ popstate ──300ms──> scan()
   └─ turbo:load / page:load ──> scan()
```

关键顺序约束：

1. **`widenLayout()` 必须在判断 `fid-wide` 之前**：第一次 `syncPageMode()` 可能移除 `fid-wide`，打上 `data-fid-grid` 后第二次才加回。
2. **`injectCss()` 必须早于所有 Shadow 宿主创建**：设计变量定义在 `:root`，通过继承进入 Shadow DOM。
3. **`ensureFilterBar()` 依赖 `filterAnchor()`**，而锚点优先取 `[data-fid-split]` / `[data-fid-grid]`，所以筛选栏位置受宽屏标记影响。
4. **`setupInfiniteScroll()` 依赖 `data-fid-grid`**：识别不到网格就没有无限滚动。

## 5. 页面路由矩阵

页面判定由三条正则完成（[L98-L102](../fantia-product-search-enhancer.user.js#L98-L102)、[L1345](../fantia-product-search-enhancer.user.js#L1345)）：

| 正则 | 匹配 | 用途 |
| --- | --- | --- |
| `PAGE_RE` | `/fanclubs`、`/products`、`/market`、`/ranking`、`/search` 开头 | 是否启用列表增强 |
| `DETAIL_PAGE_RE` | `/products/<id>` 开头 | 商品详情页排除 |
| `POST_PAGE_RE` | `/posts/<id>` 开头 | 帖子详情页排除 |
| `FC_PRODUCTS_RE` | `/fanclubs/<id>/products` 开头 | FC 商品页的站内搜索 |

| 页面 | ID 条 | 筛选栏 | FC 站内搜索 | 无限滚动 | 宽屏重排 | 站点暗色 |
| --- | --- | --- | --- | --- | --- | --- |
| `/fanclubs/<id>/products` | 有商品时 | 有 | 有 | 识别到网格且有下一页 | 有 | 有 |
| `/fanclubs/...` 其他子路径 | 有商品时 | 有商品时 | 无 | 同上 | 有 | 有 |
| `/products`（列表） | 有商品时 | 有商品时 | 无 | 同上 | 有 | 有 |
| `/market...` | 有商品时 | 有商品时 | 无 | **无**（不标记网格） | **跳过** | 有 |
| `/ranking...` | 有商品时 | 有商品时 | 无 | 同上 | 有 | 有 |
| `/search...` | 有商品时 | 有商品时 | 无 | 同上 | 有 | 有 |
| `/products/<id>` | 无 | 无 | 无 | 无 | 无 | 有 |
| `/posts/<id>` | 无 | 无 | 无 | 无 | 无 | 有 |
| 首页 `/` 及其他路径 | 无 | 无 | 无 | 无 | 无 | 有 |

注意两点：

- `PAGE_RE` 是**前缀匹配**，所以 `/fanclubs/<id>/posts/...` 这类嵌套路径会被当作列表页；详情排除只覆盖**顶层** `/products/<id>` 与 `/posts/<id>`。
- 暗色模式由 `applySiteDark()` 在 `boot()` 中无条件执行，因此全站生效，不受 `shouldRun()` 限制。

## 6. 状态模型

脚本没有状态容器，全部是 IIFE 内的模块级变量。按生命周期分组：

| 组 | 变量 | 生命周期 | 说明 |
| --- | --- | --- | --- |
| 启动 | `booted` | 页面级 | 防止 `boot()` 重复执行 |
| 主题 | `DEBUG`、`siteDark` | 页面级 | 调试开关、站点暗色偏好（惰性加载） |
| 历史 | `idHistory` | 页面级 | 懒加载的复制历史数组 |
| UI 引用 | `fab`、`fabBadge`、`panelHost`、`panelCopyAllBtn`、`panelHistHead`、`panelHistList`、`panelHistClear`、`panelDarkSwitch` | 页面级 | 组件宿主与内部节点缓存 |
| 筛选 | `filterHost`、`filterSlot`、`filterInput`、`filterCount`、`filterSearchBtn`、`filterDetailBtn`、`advPanel`、`advFields` | 页面级，切换 URL 时重建 | 筛选栏与詳細検索面板 |
| 筛选状态 | `filterQuery`、`hiddenIds`、`filterDebounce`、`filterUrlKey`、`filterFixed`、`filterRo` | 页面级 | 当前查询、被隐藏的 ID、防抖句柄、URL 快照、吸顶状态、ResizeObserver |
| 吸顶 | `navSource`、`navHeight` | 页面级 | 站点标签栏元素与高度 |
| 无限滚动 | `inf`（对象） | 页面级，URL 变化重置 | `url/loading/page/observer/sentinel/grid/lastUrl/fails/retryAt/seen` |
| 瞬时 UI | `toastTimer`、`clearTimer`、`inf.timer` | 秒级 | 自动消失 / 两段式确认 / 退避 |

持久化状态只有三项，见 [04 · 持久化](04-dependencies-and-data.md#4-持久化数据)。

## 7. 关键设计决策

### 7.1 按 DOM 结构识别卡片，不绑定固定 class

原因：Fantia 的搜索结果、排行榜、Market、社团商品页模板不完全一致，且会随改版变化。

做法：

- 从 `a[href*="/products/"]` 出发，向上最多 8 层找「含 `.card-body`，或含图片且文本长度 > 8」的最小祖先（[`resolveCard()` L761-L781](../fantia-product-search-enhancer.user.js#L761-L781)）。
- 一旦某层祖先包含多个商品 ID，立即停止，避免把整个网格当成一张卡片。
- 用「仍只含单一商品的最大祖先」作为去重作用域（[`cardScope()` L785-L797](../fantia-product-search-enhancer.user.js#L785-L797)），解决缩略图和标题两个链接指向同一商品、却解析出不同容器的问题。

代价：识别是启发式的，依赖 `img`、`.card-body`、文本长度等特征；详见 [05 · 已知限制](05-run-and-maintenance.md#6-已知限制与风险)。

### 7.2 Shadow DOM 隔离 + 共享样式表

每个 UI 组件都是「宿主元素 + `open` Shadow Root」：

- 宿主只保留定位、尺寸、层级等少量样式（`CSS_TEXT` 中的 `.fantia-*` 规则）。
- 视觉全部在 Shadow 内部（`BAR_CSS` / `FAB_CSS` / `TOAST_CSS` / `FILTER_CSS` / `PANEL_CSS`）。
- 优先 `CSSStyleSheet` + `adoptedStyleSheets`，同一类组件共享一份样式表；不支持时回退为每个宿主插一个 `<style>`（[`attachShadowCss()` L562-L580](../fantia-product-search-enhancer.user.js#L562-L580)）。
- 设计变量放在 `:root`，利用继承进入 Shadow DOM，同时避开 Dark Reader 对 `body` 的强制规则。
- 宿主背景被 `clearHostBackground()` 置为 `transparent !important`，防止外部暗色插件给宿主刷底色（[L583-L585](../fantia-product-search-enhancer.user.js#L583-L585)）。

### 7.3 吸顶用「fixed 层 + 占位槽」而不是 sticky

FC 商品页增强栏的祖先带 `overflow`，`position: sticky` 会被裁剪。方案：

- 正常态：宿主放在 `.fantia-filter-slot` 里，随文档流。
- 越过标签栏时：把宿主移到 `<body>` 下，加 `position: fixed`，`top` 取 `--fid-nav-h`，宽度/左边距取占位槽的实时矩形；占位槽同步撑高，防止内容跳动。
- 节点在 `body` 与 `slot` 之间移动会丢焦点，所以移动前保存 `selectionStart/End`，移动后恢复（[`stashFilterFocus()` L1522-L1531](../fantia-product-search-enhancer.user.js#L1522-L1531)）。
- `ResizeObserver` 观察宿主尺寸，滚动用 `requestAnimationFrame` 节流，二者共同触发 `syncFilterAffix()`。

### 7.4 无限滚动用「哨兵 + 显式续泵」

`IntersectionObserver` 只会在交叉状态变化时回调。追加一页后，哨兵往往仍在预载区内，不会再次触发，链条就断了。因此：

- 哨兵是网格后面的 1px `div`（[`ensureSentinel()` L1948-L1957](../fantia-product-search-enhancer.user.js#L1948-L1957)）。
- 每次追加完成、滚动、resize 都调用 `pumpNextPage()`，按哨兵当前位置**主动**决定是否继续抓取（[L1997-L2006](../fantia-product-search-enhancer.user.js#L1997-L2006)）。
- 预载距离 `INF_PRELOAD = 1200`，最小间隔 `INF_GAP = 300ms`。
- 去重靠 `inf.seen`（商品 ID 集合），重复页/重复卡片不追加。
- 失败按 `min(30000, 1200 × fails²)` 退避重试，不会因为一次失败永久停用。

### 7.5 宽屏只在识别到网格时放宽

- 运行时给「直接子列中 ≥2 个含商品卡片的 `.row`」打 `data-fid-grid`。
- 再向外一层找「两列且兄弟列不含商品」的 `.row`，打 `data-fid-split` / `data-fid-side` / `data-fid-main`。
- 只有存在 `data-fid-grid` 才给 `<html>` 加 `fid-wide`；CSS 在 `min-width: 1200px` 时才把网格改为 `auto-fill minmax(220px, 1fr)`。
- `/market` 直接跳过，保留站点自己的居中布局。
- 网格标记本身与视口宽度无关，CSS 才负责响应式；因此窄屏也可能启用无限滚动。

### 7.6 站点暗色分层策略

CSS 规则顺序即优先级策略：

1. 结构性容器（`div`/`section`/`article` 等）统一刷透明，露出暗色 `body`。
2. 抹掉区块级结构标签上的 `background-image`（渐变横幅），但不动普通 `div`，避免误杀背景图缩略图。
3. 自带底色的实心组件（`.card`、`.navbar`、`.alert`、`.badge`、`.list-group`、`.nav-tabs`、`.modal`、`.progress` 等）重新上色。
4. Bootstrap 工具类（`.bg-*`、`.text-*`）与表单控件再补一层。
5. 图片/视频统一 `brightness(.8)`，避免暗底上白底插画过曝。

同时 `html.fid-site-dark` 设置 `color-scheme: dark`，脚本自身的 `detectDark()` 会据此把 UI 切到 `fid-dark` 变量组。

### 7.7 扫描幂等

- 卡片节点用 `__fidBar` 缓存已注入的条；SPA 复用 DOM 时用条上的 `data-fantia-product-id` 校正。
- 同一作用域内若存在多条，保留最靠近卡片的一条并删除其余（[L957-L974](../fantia-product-search-enhancer.user.js#L957-L974)）。
- `updateFab()` 仅在徽标值变化时写 `textContent`，避免写入本身触发 `MutationObserver` 形成 400ms 空转。
- 所有事件监听只注册一次：`boot()` 有 `booted` 守卫，面板/筛选栏构建有引用守卫。

## 8. 主要数据流

### 8.1 单个复制

```text
Shadow 内按钮 click
  → 阻止默认/冒泡（避免触发整卡 <a> 跳转）
  → 读取宿主 data-fantia-product-id（以当前 DOM 为准）
  → copyText()：navigator.clipboard.writeText()
        └─ 拒绝/不可用 → legacyCopy()：textarea + execCommand('copy')
  → flashButton()：按钮锁定 1.5s，显示「已复制 / 失败」
  → 成功：recordIds([id]) → localStorage → refreshBarStates() → toast()
```

### 8.2 本页筛选

```text
input 事件
  → 150ms 防抖
  → filterQuery = 输入值 trim + lowercase
  → applyFilter()：遍历 .fantia-id-bar，按「ID 子串 或 卡片文本子串」匹配
        → 命中：card.style.display = ''
        → 未命中：card.style.display = 'none'，记入 hiddenIds
  → updateFilterCount()：显示「可见 / 总数」或「N 个商品」
  → updateFab()：徽标只统计可见商品
```

Shadow DOM 内部的文本不会进入宿主的 `textContent`，所以卡片文本匹配不包含 ID 条自身的文字；ID 由单独的 `id.indexOf(query)` 负责。

### 8.3 FC 站内搜索

```text
Enter / 搜索按钮 / 詳細検索的「搜索」
  → fcSearchContext() 读取当前 product_tab 与已有条件
  → URLSearchParams 组装：
        product_tab
        q[name_cont]   关键词
        q[tag]         标签（去掉前导 #，压缩空白）
        q[sale_status] 状态
        q[sale_type]   商品类型
        q[s]           排序
  → location.assign('/fanclubs/<id>/products?...')
  → 新页面加载后 scan() 重建筛选栏，syncAdvFromUrl() 回填条件
```

清空时若检测到 URL 里存在服务端搜索条件，会跳回只保留 `product_tab` 与排序的地址，确保原生结果被重置。

### 8.4 无限滚动

```text
IntersectionObserver / scroll / resize / 追加完成
  → pumpNextPage()：哨兵在视口 + 1200px 内且无定时器
  → loadNextPage()
      → fetch(nextUrl, { credentials:'same-origin' })
      → DOMParser 解析 HTML
      → findGridRowIn()：选「含商品列最多」的 .row
      → 逐列用 inf.seen 去重，importNode 追加到当前网格
      → inf.url = 从抓取页分页里解析的下一页
      → scan()：给新卡片注入 ID 条、套用当前筛选
      → 120ms 后再 pumpNextPage()（等滚动锚定完成）
  → 失败：fails++，恢复 URL，退避后重试
  → 没有下一页 / 没有网格 / 没有新商品：endInfiniteScroll()
```

### 8.5 暗色模式

```text
面板拨杆 click
  → siteDark 取反
  → localStorage['fantia-id-sitedark'] = '1' | '0'
  → applySiteDark()：html.fid-site-dark + 开关样式
  → syncTheme()：detectDark() 读到 color-scheme: dark → html.fid-dark
  → 脚本自身 UI 变量切换为暗色组
```

`boot()` 在任何页面都会先执行 `applySiteDark()`，所以刷新后不会先闪一下亮色。

## 9. 样式架构

| 样式块 | 行范围 | 作用域 | 内容 |
| --- | --- | --- | --- |
| `CSS_TEXT` | [L118-L365](../fantia-product-search-enhancer.user.js#L118-L365) | 页面全局 `<style>` | 设计变量、`fid-dark` 变量、站点暗色四层规则、宿主定位、宽屏网格、响应式 |
| `BAR_CSS` | [L367-L401](../fantia-product-search-enhancer.user.js#L367-L401) | ID 条 Shadow | 毛玻璃条、图标、数字、复制按钮、容器查询 |
| `FAB_CSS` | [L403-L419](../fantia-product-search-enhancer.user.js#L403-L419) | FAB Shadow | 圆形按钮、徽标、触屏放大 |
| `TOAST_CSS` | [L421-L431](../fantia-product-search-enhancer.user.js#L421-L431) | Toast Shadow | 提示面板、进入动画、错误色 |
| `FILTER_CSS` | [L433-L491](../fantia-product-search-enhancer.user.js#L433-L491) | 筛选栏 Shadow | 搜索框、计数、清空、FC 按钮、詳細検索网格 |
| `PANEL_CSS` | [L493-L559](../fantia-product-search-enhancer.user.js#L493-L559) | 面板 Shadow | 面板、复制全部、暗色拨杆、历史列表、移动端抽屉 |

设计变量分组（`:root`，`html.fid-dark` 覆盖）：

- 品牌与状态：`--fid-theme`、`--fid-theme-10/20`、`--fid-success`、`--fid-error` 及透明变体
- 文本：`--fid-text-1/2/3`
- 表面：`--fid-surface`、`--fid-elevated`、`--fid-fab-bg`
- 描边与填充：`--fid-border`、`--fid-popover-border`、`--fid-fill-1/2`
- 阴影与材质：`--fid-shadow-1/2`、`--fid-edge-glow`、`--fid-glass`
- 动效：`--fid-ease`

响应式断点：

| 条件 | 行为 |
| --- | --- |
| `min-width: 1200px` + `html.fid-wide` | 放宽容器、网格多列、侧栏定宽 220px |
| `max-width: 600px` | 面板左右贴边成抽屉、历史列表拉高、复制全部按钮加高 |
| `max-width: 480px` | 隐藏「商品 ID」文字标签 |
| `max-width: 560px` | 隐藏筛选计数、詳細検索按钮只留图标、条件网格单列 |
| `pointer: coarse` | FAB 52px、ID 条按钮 ≥30px、历史条目 ≥38px |
| `prefers-reduced-motion: reduce` | 关闭过渡与进入动画 |
| 容器查询 `max-width: 219px` | 窄卡片隐藏「商品 ID」标签 |

## 10. 幂等、清理与失败策略

| 场景 | 处理 |
| --- | --- |
| 重复执行脚本 | `window.__fantiaProductIdBarLoaded` 直接 return |
| `body` 未就绪 | `boot()` 每 250ms 重试 |
| 页面无商品链接 | 不插筛选栏；FAB 徽标为 0 且隐藏 |
| 卡片已有 ID 条 | 复用并按当前 ID 校正，不重复注入 |
| 旧版本残留重复条 | 在 `cardScope` 内保留最靠近卡片的一条，删除其余 |
| SPA 跳到详情/帖子页 | `scan()` 清理无限滚动、面板、筛选栏、吸顶变量、FAB |
| 筛选栏 URL 变化 | `filterUrlKey` 不一致时销毁重建，避免沿用上页关键词 |
| 无限滚动抓取失败 | 指数退避重试（上限 30s），不永久停用 |
| 无限滚动无下一页/无网格/无新商品 | `endInfiniteScroll()`，保留原分页可手动跳页 |
| 剪贴板 API 拒绝 | `execCommand('copy')` 降级，失败提示手动双击复制 |
| `adoptedStyleSheets` 不可用 | 回退为每个 Shadow Root 插入 `<style>` |
| `IntersectionObserver` 不可用 | 不启用无限滚动 |
| `ResizeObserver` 不可用 | 吸顶只在滚动/resize 时同步 |
| `localStorage` 不可用/超额 | 全部读写包 `try/catch`，静默降级 |
| 动画敏感用户 | `prefers-reduced-motion` 关闭过渡 |
