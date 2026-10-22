# 04 · 依赖与数据

## 1. 外部依赖

| 类别 | 依赖 | 说明 |
| --- | --- | --- |
| 运行时库 | **无** | 不使用 jQuery、Bootstrap JS、Lodash 等 |
| 构建工具 | **无** | 源文件直接安装，无打包、转译、压缩 |
| 包管理 | **无** | 没有 `package.json` / lockfile |
| 特权 API | **无** | `@grant none`，不使用 `GM_*`、`GM_xmlhttpRequest` |
| 网络 | Fantia 同源 | 仅无限滚动 `fetch` 下一页 HTML |
| 站点样式 | Bootstrap 3 风格类名 | 暗色 CSS 针对 `.card`、`.navbar`、`.pagination`、`.row`/`.col-*` 等；**不依赖站点 JS** |
| 站点 DOM | 服务端渲染的商品列表 | 卡片、网格、分页均由站点输出，脚本只读取 |

唯一的外部服务是 GitHub raw：`@updateURL` / `@downloadURL` 供管理器检查更新，脚本运行时不会主动请求它。

## 2. 浏览器 API 与降级

| API | 用途 | 缺失/失败时 | 位置 |
| --- | --- | --- | --- |
| `Element.attachShadow` | 所有 UI 组件隔离 | 无回退；旧浏览器无法运行 | `attachShadowCss()` |
| `CSSStyleSheet` + `adoptedStyleSheets` | 共享组件样式表 | 回退为每个 Shadow Root 插 `<style>` | [L562-L580](../fantia-product-search-enhancer.user.js#L562-L580) |
| `MutationObserver` | DOM 变化后重扫 | 仍有 1.5s 轮询；首扫仍执行 | [L2092-L2099](../fantia-product-search-enhancer.user.js#L2092-L2099) |
| `IntersectionObserver` | 无限滚动触发 | 不启用无限滚动 | [L1973](../fantia-product-search-enhancer.user.js#L1973) |
| `ResizeObserver` | 筛选栏尺寸变化重算吸顶 | 仅在滚动/resize 时同步 | [L1728-L1731](../fantia-product-search-enhancer.user.js#L1728-L1731) |
| `fetch` | 抓取下一页 | 无回退；无限滚动不可用 | [L2020](../fantia-product-search-enhancer.user.js#L2020) |
| `DOMParser` | 解析抓取到的 HTML | 无回退；无限滚动不可用 | [L2026](../fantia-product-search-enhancer.user.js#L2026) |
| `navigator.clipboard.writeText` | 复制 | 回退 `execCommand('copy')` | [L1006-L1012](../fantia-product-search-enhancer.user.js#L1006-L1012) |
| `document.execCommand('copy')` | 复制降级 | 失败返回 `false`，Toast 提示手动复制 | [L1014-L1032](../fantia-product-search-enhancer.user.js#L1014-L1032) |
| `localStorage` | 历史、暗色、调试 | 全部 `try/catch`，异常静默 | 多处 |
| `matchMedia` | 系统主题监听 | 无监听，但每次 `scan()` 仍会 `syncTheme()` | [L637-L643](../fantia-product-search-enhancer.user.js#L637-L643) |
| `getComputedStyle().colorScheme` | 暗色判断 | 属性为空时走背景亮度回退 | [L600-L603](../fantia-product-search-enhancer.user.js#L600-L603) |
| `requestAnimationFrame` | 滚动节流 | 无回退（现代浏览器均支持） | [L2111](../fantia-product-search-enhancer.user.js#L2111) |
| `URL` / `URLSearchParams` | 解析分页地址、组装搜索参数 | 无回退 | [L1376](../fantia-product-search-enhancer.user.js#L1376) |
| CSS 容器查询 `@container` | 窄卡片隐藏文字标签 | 不支持时标签照常显示 | `BAR_CSS` |
| `env(safe-area-inset-*)` | 刘海屏安全边距 | 不支持时取 0 | `CSS_TEXT` |
| `:focus-visible` | 键盘焦点环 | 不支持时无焦点环 | 各 Shadow CSS |
| `prefers-reduced-motion` | 关闭动画 | 不支持时保留动画 | 各 Shadow CSS |
| `pointer: coarse` | 触屏加大点按目标 | 不支持时用桌面尺寸 | 各 Shadow CSS |

## 3. 站点 DOM 契约

脚本不绑定具体 class，但仍依赖一组结构特征。下列选择器/特征一旦变化，对应能力会降级或失效。

| 站点特征 | 使用方 | 缺失后果 |
| --- | --- | --- |
| `a[href*="/products/"]` + `/products/<数字>` | `collectProductLinks()`、`productIdsIn()`、`resolveCard()`、`widenLayout()`、`setupInfiniteScroll()` | 所有列表能力失效（无 ID 条、无筛选、无计数、无宽屏、无无限滚动） |
| `.card-body` 或 `img` + 文本长度 > 8 | `resolveCard()` | 退化为「最后一个单商品祖先」，ID 条可能插在卡片内部错误位置 |
| 单商品作用域（祖先内商品 ID 数 ≤ 1） | `cardScope()` | 去重作用域变窄或变宽，可能重复注入或误删相邻卡片的条 |
| `.row` 的直接 `[class*="col-"]` 子元素中 ≥2 列含商品 | `widenLayout()` | 无 `data-fid-grid`，宽屏重排与无限滚动都不启用 |
| `.row` 恰好两个子元素、兄弟列不含商品 | `markSplit()` | 无侧栏定宽，内容区不被标记 |
| `.pagination li.next a[href]` / `.pagination .next a[href]` / `a[rel="next"]` | `paginationNextUrl()` | 无法发现下一页，无限滚动不启用 |
| `.row` + 商品列（抓取页内） | `findGridRowIn()` | 抓取页无法定位网格，无限滚动结束 |
| `.fanclub-tabs.js-affix-nav` / `nav.scroll-tabs` | `ensureNavOffset()` | `--fid-nav-h` 为 0，吸顶栏贴视口顶部，可能与站点标签栏重叠 |
| `#fanclubs-products-search` 内的 `.fc-search` | `CSS_TEXT` 隐藏规则 | 原生关键词行不隐藏，出现两套搜索框 |
| `#fanclubs-products-search` | `scroll-margin-top` 规则 | 锚点跳转可能被固定栏遮挡 |
| `#main > .container` / `#main` | `filterAnchor()` 回退 | 找不到锚点，筛选栏不插入 |
| `.fanclub-tabs .tab-item.active` | 激活项配色 CSS | 仅影响配色，不影响功能 |
| `.card`、`.navbar`、`.pagination`、`.alert`、`.badge`、`.list-group`、`.nav-tabs`、`.modal`、`.progress`、`.bg-*`、`.text-*` 等 | 站点暗色 CSS | 对应组件在暗色下可能漏白或对比度不足 |

**强耦合点**：无限滚动要求站点返回**服务端渲染的 HTML**，且新页仍使用 `.row` + `col-*` 结构。如果站点改为前端 JSON 渲染，该能力需要重写。

## 4. 持久化数据

### 4.1 `localStorage` 键

| 键 | 值 | 写入时机 | 读取时机 | 容量控制 |
| --- | --- | --- | --- | --- |
| `fantia-id-history-v1` | JSON 数组 `[{id, t}]` | 复制单个/全部、历史再复制、清空 | 启动后首次需要时 | 最多 500 条；面板渲染 50 条 |
| `fantia-id-sitedark` | `'1'` / `'0'` | 面板拨杆 | `boot()` 与拨杆渲染 | 单值 |
| `fantia-id-debug` | `'1'` | 用户手动 | 脚本初始化 | 单值 |

### 4.2 历史条目模型

```ts
interface HistoryEntry {
  id: string;   // 商品数字 ID，统一 String() 化
  t: number;    // Date.now() 时间戳
}
```

`recordIds()` 的更新规则：

1. 遍历传入 ID，空值跳过。
2. 若历史中已存在同 ID，先 `splice` 移除。
3. `unshift({ id, t: now })` 置顶。
4. 总长度超过 500 时截断。
5. 写回存储，刷新所有 ID 条状态，面板打开则重渲染。

### 4.3 无限滚动状态

```ts
interface InfiniteScrollState {
  url: string | null;          // 下一页绝对地址；null = 结束/空闲
  loading: boolean;            // 请求在途
  page: number;                // 当前页序号（初始页为 1，每追加一页 +1）
  observer: IntersectionObserver | null;
  sentinel: HTMLElement | null; // 网格后的 1px 哨兵
  lastUrl: string | null;      // 启用时的 location.href
  grid: HTMLElement | null;    // 当前网格
  timer: number | null;        // 续泵定时器
  fails: number;               // 连续失败次数
  retryAt: number;             // 下次允许抓取的时间戳
  seen: Record<string, true> | null; // 已见商品 ID
}
```

状态迁移：

```text
无网格 / 无下一页 / 不支持 IO
        │
        ▼
     未启用 ──网格出现且分页有下一页──> 启用（url=next, seen=当前ID, page=1）
                                         │
                    ┌────────────────────┼────────────────────┐
                    ▼                    ▼                    ▼
              抓取成功追加          抓取失败退避          无新商品/无下一页/无网格
              page++，接龙下一页      fails++，retryAt      endInfiniteScroll()
                    │                    │                    │
                    └──── pumpNextPage ──┴────────────────────┘
```

### 4.4 DOM 上的临时状态

脚本在元素上挂了两个非标准属性（expando）：

| 属性 | 挂在 | 用途 | 位置 |
| --- | --- | --- | --- |
| `__fidBar` | 卡片元素 | 缓存该卡片已注入的 ID 条，避免重复查询/注入 | [L981-L995](../fantia-product-search-enhancer.user.js#L981-L995) |
| `__fidTimer` | 按钮元素 | 反馈动画锁定期间禁止悬停改变文案 | [L908-L918](../fantia-product-search-enhancer.user.js#L908-L918) |

这些属性不写入 HTML 属性，页面刷新即消失。

## 5. 内部依赖关系

### 5.1 启动与扫描

```text
boot
├── applySiteDark ← loadSiteDark
├── syncTheme ← detectDark
├── syncPageMode ← shouldRun
├── watchTheme
├── injectCss
└── scan
    ├── syncPageMode / shouldRun
    ├── cleanupInfiniteScroll / closePanel / removeFilterBar / removeNavOffset / updateFab
    ├── injectCss / syncTheme
    ├── widenLayout
    │   ├── collectProductLinks
    │   ├── resolveCard ← productIdsIn
    │   ├── productIdsIn
    │   └── markSplit
    ├── collectProductLinks
    ├── ensureFilterBar
    │   ├── fcSearchContext / fcServerSearchActive
    │   ├── filterAnchor
    │   ├── attachShadowCss
    │   ├── makeAdvPanel
    │   ├── syncAdvFromUrl / updateDetailState
    │   ├── syncFilterAffix ← setFilterFixed ← stash/restoreFilterFocus
    │   └── applyFilter / updateFilterCount / updateFab
    ├── ensureNavOffset → syncNavOffset
    ├── setupInfiniteScroll
    │   ├── paginationNextUrl
    │   ├── collectProductLinks
    │   ├── ensureSentinel
    │   └── pumpNextPage → loadNextPage
    │       ├── findGridRowIn ← productIdsIn
    │       ├── paginationNextUrl
    │       └── scan（递归，处理追加后的新卡片）
    ├── resolveCard / cardScope / productIdsIn
    ├── makeBar
    │   ├── attachShadowCss / clearHostBackground
    │   ├── copyText ← legacyCopy
    │   ├── flashButton / applyBtnState ← historyHas
    │   ├── recordIds → saveHistory / refreshBarStates / renderHistory
    │   └── toast
    ├── updateBar → applyBtnState
    ├── applyFilter
    ├── updateFilterCount
    └── updateFab ← uniqueIds ← collectProductLinks
```

### 5.2 面板与用户操作

```text
ensureFab
└── click → togglePanel → openPanel
    ├── buildPanel
    │   ├── attachShadowCss
    │   ├── applySiteDark
    │   └── document click / keydown（关闭）
    ├── uniqueIds
    └── renderHistory ← loadHistory / formatTime
        └── click item → copyText → recordIds → toast

copyAllVisible ← uniqueIds
└── copyText → recordIds → toast

dark switch → toggleSiteDark
├── loadSiteDark
├── applySiteDark
└── syncTheme

hist clear → clearHistoryArm → disarmClear / saveHistory / renderHistory / refreshBarStates
```

### 5.3 依赖方向原则

- 底层工具（`dbg`、`attachShadowCss`、`copyText`、`toast`）不依赖业务状态。
- 领域函数可以读模块状态，但不自行启动定时器（无限滚动的 `timer` 属于其内部状态机）。
- 只有 `scan()` 和 `boot()` 负责编排，其他函数被调用。
- `loadNextPage()` 完成后会回调 `scan()`，形成一次受控递归；`scan()` 不会主动触发抓取，避免循环。

## 6. 耦合热点与改动影响面

| 改动点 | 直接影响 | 建议回归 |
| --- | --- | --- |
| `PRODUCT_HREF_RE` | ID 提取、卡片识别、筛选、宽屏、无限滚动、FAB 计数 | 所有列表页 |
| `resolveCard()` 的特征与深度 | ID 条位置、重复条、宽屏标记、筛选隐藏对象 | 搜索/排行榜/社团/Market 四种模板 |
| `.card-body` / `img` / 文本长度阈值 | 同上 | 长简介、无图卡片、整卡 `<a>` 与内链缩略图两种布局 |
| `.row` / `col-*` 选择器 | `data-fid-grid`、宽屏重排、无限滚动 | ≥1200px 与窄屏 |
| 分页选择器 | 无限滚动 | 有/无下一页、重复页、末页 |
| FC 路由正则与 `q[...]` 参数名 | 站内搜索、詳細検索、原生行隐藏、吸顶 | FC 商品页带条件/不带条件 |
| `.fanclub-tabs.js-affix-nav` / `nav.scroll-tabs` | `--fid-nav-h`、fixed 位置 | 滚动前后、展开詳細検索时 |
| `.fantia-id-bar` 宿主类名 | `applyFilter`、`updateFilterCount`、`refreshBarStates`、`uniqueIds` 的查询 | 复制、筛选、历史清空 |
| `data-fid-grid` | `syncPageMode`、`filterAnchor`、`setupInfiniteScroll` | 宽屏与无限滚动 |
| `data-fantia-product-id` | 复制、筛选、按钮状态 | 全部复制路径 |
| `CSS_TEXT` 中暗色规则顺序 | 整站暗色覆盖率 | 首页/列表/详情/表单/弹窗 |
| `:root` 设计变量 | 所有 Shadow 组件视觉 | 明暗两种主题 |
| 存储键名 | 历史、暗色、调试 | 跨页面刷新 |
| `scan()` 内的步骤顺序 | 首次渲染的整体结果 | 冷启动、SPA 跳转、分页追加 |

## 7. 全局副作用清单

脚本对页面留下的痕迹：

| 类型 | 内容 | 何时出现 | 何时移除 |
| --- | --- | --- | --- |
| 全局标记 | `window.__fantiaProductIdBarLoaded` | 脚本执行 | 页面卸载 |
| `<html>` 类 | `fid-dark`、`fid-site-dark`、`fid-wide`、`fid-fc-search` | 启动/开关/页面变化 | 条件不满足时移除（暗色例外，按偏好保留） |
| `<style>` | `#fantia-id-style` | 首次 `scan()` | 不主动移除 |
| 节点 | ID 条、FAB、面板、Toast、筛选栏、占位槽、哨兵 | 对应功能启用 | 部分随 SPA 清理，ID 条依赖 DOM 替换 |
| 事件 | `document` 的 `click`(capture) / `turbo:load` / `page:load`；`window` 的 `scroll` / `resize` / `popstate` | `boot()` 一次 | 不主动移除 |
| 事件 | `document` 的 `click`（点击外部关闭）与 `keydown`（Esc 关闭） | 首次 `buildPanel()` | 不主动移除 |
| 定时器 | `setInterval(scan, 1500)`、`setTimeout(boot, 2500)`、无限滚动退避、Toast、按钮反馈、清空确认 | 启动/操作 | 除 `setInterval` 外均会清理 |
| 存储 | 三个 `localStorage` 键 | 用户操作/调试 | 用户手动清除 |
| 网络 | 同源 `fetch` 下一页 | 无限滚动 | 请求结束 |
| expando | `card.__fidBar`、`btn.__fidTimer` | 注入/反馈 | 随节点销毁 |

## 8. 安全与隐私

| 方面 | 现状 |
| --- | --- |
| 代码执行 | 无 `eval`、无 `new Function`、无动态 `<script>` |
| 网络外发 | 无第三方请求；只有同源 `fetch(url, { credentials:'same-origin' })` |
| 数据外泄 | 不上传任何页面内容或 ID |
| XSS | `innerHTML` 只写入固定 SVG 与固定文案；商品 ID、历史记录、搜索词均通过 `textContent` / `value` / `URLSearchParams` 处理 |
| 剪贴板 | 仅在用户点击/按键后写入 |
| 存储可见性 | `localStorage` 同源可读，Fantia 自身脚本理论上可读取复制历史；数据仅为商品 ID 与时间戳 |
| 权限 | `@grant none`，无跨域能力 |
| 第三方扩展干扰 | 专门清除宿主背景、设计变量放 `:root` 以规避 Dark Reader |
| iframe | 未声明 `@noframes`，若管理器允许，脚本可能在同源 iframe 中各自运行；每个 frame 有独立的 `window.__fantiaProductIdBarLoaded` |

## 9. 兼容性

| 维度 | 支持情况 |
| --- | --- |
| 浏览器 | 支持 Shadow DOM v1 的现代 Chrome / Edge / Firefox；`adoptedStyleSheets` 不可用时自动回退 |
| 用户脚本管理器 | ScriptCat / Tampermonkey / Violentmonkey（依赖 `@match`、`@grant none`） |
| 页面形态 | Fantia 服务端渲染的 HTML 列表 |
| 移动端 | 小屏抽屉、触屏点按目标、安全区适配 |
| 暗色插件 | 与 Dark Reader 共存做了针对性处理，但不保证所有站点组件完全一致 |
| 站点改版 | 结构启发式识别，选择器变化会影响功能，见 [05 · 已知限制](05-run-and-maintenance.md#6-已知限制与风险) |
