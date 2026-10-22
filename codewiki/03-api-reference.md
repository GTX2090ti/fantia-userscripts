# 03 · API 参考

本页按「常量 / 状态 / 函数 / 契约」组织，覆盖脚本内全部 75 个函数。所有函数都在 IIFE 内部，**没有对外导出的公共 API**；下表的「签名」是源码中的实际参数形式。

## 1. 阅读约定

- `Element` / `HTMLDivElement` 等为浏览器 DOM 类型。
- 「副作用」列只列跨模块或对 DOM / 存储 / 网络的影响；纯局部计算不重复说明。
- 行号链接指向 [fantia-product-search-enhancer.user.js](../fantia-product-search-enhancer.user.js)。

## 2. 常量与状态

### 2.1 常量

| 名称 | 值 | 用途 | 位置 |
| --- | --- | --- | --- |
| `DEBUG` | `localStorage['fantia-id-debug'] === '1'` | 控制 `[FantiaID]` 日志 | [L88-L89](../fantia-product-search-enhancer.user.js#L88-L89) |
| `PRODUCT_HREF_RE` | `/\/products\/(\d+)(?:[/?#]\|$)/` | 链接 → 商品 ID | [L98](../fantia-product-search-enhancer.user.js#L98) |
| `DETAIL_PAGE_RE` | `/^\/products\/\d+(?:[/?#]\|$)/` | 商品详情页判定 | [L99](../fantia-product-search-enhancer.user.js#L99) |
| `POST_PAGE_RE` | `/^\/posts\/\d+(?:[/?#]\|$)/` | 帖子详情页判定 | [L100](../fantia-product-search-enhancer.user.js#L100) |
| `PAGE_RE` | `/^\/(?:fanclubs\|products\|market\|ranking\|search)(?:[/?#]\|$)/` | 列表增强生效范围 | [L102](../fantia-product-search-enhancer.user.js#L102) |
| `FC_PRODUCTS_RE` | `/^\/fanclubs\/(\d+)\/products(?:\/|$)/` | FC 商品页判定 | [L1345](../fantia-product-search-enhancer.user.js#L1345) |
| `HISTORY_KEY` | `'fantia-id-history-v1'` | 历史存储键 | [L688](../fantia-product-search-enhancer.user.js#L688) |
| `HISTORY_MAX` | `500` | 历史条数上限 | [L689](../fantia-product-search-enhancer.user.js#L689) |
| `SITE_DARK_KEY` | `'fantia-id-sitedark'` | 暗色偏好键 | [L1121](../fantia-product-search-enhancer.user.js#L1121) |
| `INF_PRELOAD` | `1200` | 无限滚动预载像素 | [L1887](../fantia-product-search-enhancer.user.js#L1887) |
| `INF_GAP` | `300` | 两次抓取的最小间隔（ms） | [L1888](../fantia-product-search-enhancer.user.js#L1888) |
| `ICON_*` | 11 个 SVG 字符串 | 固定图标 | [L104-L114](../fantia-product-search-enhancer.user.js#L104-L114) |
| `CSS_TEXT` | 字符串 | 页面级样式 | [L118-L365](../fantia-product-search-enhancer.user.js#L118-L365) |
| `BAR_CSS` | 字符串 | ID 条样式 | [L367-L401](../fantia-product-search-enhancer.user.js#L367-L401) |
| `FAB_CSS` | 字符串 | FAB 样式 | [L403-L419](../fantia-product-search-enhancer.user.js#L403-L419) |
| `TOAST_CSS` | 字符串 | Toast 样式 | [L421-L431](../fantia-product-search-enhancer.user.js#L421-L431) |
| `FILTER_CSS` | 字符串 | 筛选栏样式 | [L433-L491](../fantia-product-search-enhancer.user.js#L433-L491) |
| `PANEL_CSS` | 字符串 | 面板样式 | [L493-L559](../fantia-product-search-enhancer.user.js#L493-L559) |

### 2.2 缓存

| 名称 | 类型 | 说明 | 位置 |
| --- | --- | --- | --- |
| `shadowSheets` | `{ [key: string]: CSSStyleSheet }` | 按组件类型缓存共享样式表 | [L561](../fantia-product-search-enhancer.user.js#L561) |
| `shadowSheets` 的键 | `bar` / `fab` / `toast` / `filter` / `panel` | 由 `attachShadowCss()` 使用 | [L807](../fantia-product-search-enhancer.user.js#L807) 等 |

### 2.3 模块级状态变量

| 变量 | 初值 | 含义 | 位置 |
| --- | --- | --- | --- |
| `idHistory` | `null` | 懒加载的历史数组 | [L690](../fantia-product-search-enhancer.user.js#L690) |
| `toastTimer` | `null` | Toast 自动消失定时器 | [L1034](../fantia-product-search-enhancer.user.js#L1034) |
| `fab` / `fabBadge` | `null` | FAB 宿主与徽标 | [L1063-L1064](../fantia-product-search-enhancer.user.js#L1063-L1064) |
| `panelHost` | `null` | 面板宿主 | [L1111](../fantia-product-search-enhancer.user.js#L1111) |
| `panelCopyAllBtn` / `panelHistHead` / `panelHistList` / `panelHistClear` / `panelDarkSwitch` | `null` | 面板内部节点 | [L1112-L1116](../fantia-product-search-enhancer.user.js#L1112-L1116) |
| `siteDark` | `null` | 站点暗色偏好缓存；`null` 表示未加载 | [L1122](../fantia-product-search-enhancer.user.js#L1122) |
| `clearTimer` | `null` | 清空历史的 3s 确认定时器 | [L1314](../fantia-product-search-enhancer.user.js#L1314) |
| `filterHost` / `filterInput` / `filterCount` / `filterSearchBtn` / `filterDetailBtn` / `advPanel` / `advFields` | `null` | 筛选栏节点与字段 | [L1346-L1352](../fantia-product-search-enhancer.user.js#L1346-L1352) |
| `filterQuery` | `''` | 当前本地筛选词 | [L1353](../fantia-product-search-enhancer.user.js#L1353) |
| `hiddenIds` | `{}` | 被筛掉的商品 ID → `true` | [L1354](../fantia-product-search-enhancer.user.js#L1354) |
| `filterDebounce` | `null` | 150ms 防抖句柄 | [L1355](../fantia-product-search-enhancer.user.js#L1355) |
| `filterUrlKey` | `''` | 构建时的 `pathname + search` | [L1356](../fantia-product-search-enhancer.user.js#L1356) |
| `filterSlot` | `null` | 占位槽 | [L1357](../fantia-product-search-enhancer.user.js#L1357) |
| `filterFixed` | `false` | 是否 fixed 吸顶 | [L1358](../fantia-product-search-enhancer.user.js#L1358) |
| `filterRo` | `null` | 筛选栏 `ResizeObserver` | [L1359](../fantia-product-search-enhancer.user.js#L1359) |
| `navSource` / `navHeight` | `null` / `0` | 站点标签栏与高度 | [L1800-L1801](../fantia-product-search-enhancer.user.js#L1800-L1801) |
| `inf` | 对象 | 无限滚动状态机 | [L1889-L1892](../fantia-product-search-enhancer.user.js#L1889-L1892) |
| `booted` | `false` | 启动守卫 | [L2069](../fantia-product-search-enhancer.user.js#L2069) |

## 3. 函数参考

### 3.1 基础设施与调试

| 函数 | 签名 | 作用 | 返回 / 副作用 | 位置 |
| --- | --- | --- | --- | --- |
| `dbg` | `(...args) → void` | 仅当 `DEBUG` 为真时输出 `[FantiaID]` 前缀日志 | 无 | [L91-L95](../fantia-product-search-enhancer.user.js#L91-L95) |
| `attachShadowCss` | `(host, key, css) → ShadowRoot` | 创建 `open` Shadow Root 并挂样式；优先共享 `adoptedStyleSheets`，失败回退 `<style>` | 修改宿主；可能写入 `shadowSheets` | [L562-L580](../fantia-product-search-enhancer.user.js#L562-L580) |
| `clearHostBackground` | `(host) → void` | 宿主背景强制透明 | 写内联样式 | [L583-L585](../fantia-product-search-enhancer.user.js#L583-L585) |
| `injectCss` | `() → void` | 向页面注入 `CSS_TEXT` | 新增 `#fantia-id-style` | [L587-L593](../fantia-product-search-enhancer.user.js#L587-L593) |

### 3.2 主题

| 函数 | 签名 | 作用 | 返回 / 副作用 | 位置 |
| --- | --- | --- | --- | --- |
| `detectDark` | `() → boolean` | 按 `color-scheme` → 背景亮度 → 系统偏好判断暗色 | 无 | [L598-L620](../fantia-product-search-enhancer.user.js#L598-L620) |
| `syncTheme` | `() → void` | 切换 `<html>.fid-dark` | 修改 class | [L622-L626](../fantia-product-search-enhancer.user.js#L622-L626) |
| `syncPageMode` | `() → void` | 有网格且在列表页时切换 `<html>.fid-wide` | 修改 class | [L628-L635](../fantia-product-search-enhancer.user.js#L628-L635) |
| `watchTheme` | `() → void` | 监听系统主题变化 | 注册媒体查询监听 | [L637-L643](../fantia-product-search-enhancer.user.js#L637-L643) |

### 3.3 页面判定与链接

| 函数 | 签名 | 作用 | 返回 / 副作用 | 位置 |
| --- | --- | --- | --- | --- |
| `shouldRun` | `() → boolean` | 是否启用列表增强 | 无 | [L648-L654](../fantia-product-search-enhancer.user.js#L648-L654) |
| `productIdFromHref` | `(href: string) → string` | 从链接提取商品 ID | 无 | [L656-L659](../fantia-product-search-enhancer.user.js#L656-L659) |
| `collectProductLinks` | `() → Array<{a, id}>` | 收集页面内商品链接 | 查询 DOM | [L661-L669](../fantia-product-search-enhancer.user.js#L661-L669) |
| `uniqueIds` | `(visibleOnly?: boolean) → string[]` | 去重 ID；可按 `hiddenIds` 过滤 | 无 | [L671-L683](../fantia-product-search-enhancer.user.js#L671-L683) |

### 3.4 复制历史

| 函数 | 签名 | 作用 | 返回 / 副作用 | 位置 |
| --- | --- | --- | --- | --- |
| `loadHistory` | `() → Array<{id,t}>` | 懒加载历史，异常返回 `[]` | 读 `localStorage`；写 `idHistory` | [L692-L699](../fantia-product-search-enhancer.user.js#L692-L699) |
| `saveHistory` | `() → void` | 截断 500 条后写回 | 写 `localStorage`；异常静默 | [L701-L705](../fantia-product-search-enhancer.user.js#L701-L705) |
| `historyHas` | `(id: string) → boolean` | 是否复制过 | 无 | [L707-L713](../fantia-product-search-enhancer.user.js#L707-L713) |
| `recordIds` | `(ids: string[]) → void` | 去重置顶、更新时间、截断 | 写存储；`refreshBarStates()`；面板打开时 `renderHistory()` | [L715-L734](../fantia-product-search-enhancer.user.js#L715-L734) |
| `formatTime` | `(t: number) → string` | `MM-DD HH:mm` | 无 | [L736-L743](../fantia-product-search-enhancer.user.js#L736-L743) |

### 3.5 卡片识别

| 函数 | 签名 | 作用 | 返回 / 副作用 | 位置 |
| --- | --- | --- | --- | --- |
| `productIdsIn` | `(el: Element) → {[id]: true}` | 子树内所有商品 ID | 查询 DOM | [L751-L759](../fantia-product-search-enhancer.user.js#L751-L759) |
| `resolveCard` | `(anchor: Element) → Element` | 向上找「含图片/`.card-body` 且文本 > 8」的最小祖先；多商品即停 | 无 | [L761-L781](../fantia-product-search-enhancer.user.js#L761-L781) |
| `cardScope` | `(anchor: Element) → Element` | 返回仍只含单一商品的最大祖先 | 无 | [L785-L797](../fantia-product-search-enhancer.user.js#L785-L797) |

### 3.6 ID 条与扫描

| 函数 | 签名 | 作用 | 返回 / 副作用 | 位置 |
| --- | --- | --- | --- | --- |
| `makeBar` | `(id: string) → HTMLDivElement` | 创建 ID 条宿主与 Shadow 内容，绑定复制/悬停/阻断事件 | 创建 DOM；事件内复制、写历史、Toast | [L802-L887](../fantia-product-search-enhancer.user.js#L802-L887) |
| `applyBtnState` | `(btn, id) → void` | 按历史状态渲染「复制 / 已复制」 | 修改按钮类与内容 | [L890-L896](../fantia-product-search-enhancer.user.js#L890-L896) |
| `refreshBarStates` | `() → void` | 刷新所有 ID 条按钮 | 查询 DOM + ShadowRoot | [L898-L905](../fantia-product-search-enhancer.user.js#L898-L905) |
| `flashButton` | `(btn, ok: boolean, bar) → void` | 1.5s 成功/失败反馈并锁定 | 定时器 `btn.__fidTimer` | [L907-L920](../fantia-product-search-enhancer.user.js#L907-L920) |
| `updateBar` | `(bar, id) → void` | 校正已有条的 ID 与按钮态 | 修改属性/文本 | [L922-L930](../fantia-product-search-enhancer.user.js#L922-L930) |
| `scan` | `() → void` | 全量协调：清理、注入、宽屏、筛选、吸顶、无限滚动、FAB | 大量 DOM/状态副作用 | [L932-L1001](../fantia-product-search-enhancer.user.js#L932-L1001) |

### 3.7 剪贴板与 Toast

| 函数 | 签名 | 作用 | 返回 / 副作用 | 位置 |
| --- | --- | --- | --- | --- |
| `copyText` | `(text: string) → Promise<boolean>` | 优先 Clipboard API，失败走 `legacyCopy` | 写系统剪贴板 | [L1006-L1012](../fantia-product-search-enhancer.user.js#L1006-L1012) |
| `legacyCopy` | `(text: string) → boolean` | `textarea` + `execCommand('copy')` | 临时 DOM 节点 | [L1014-L1032](../fantia-product-search-enhancer.user.js#L1014-L1032) |
| `toast` | `(msg: string, isErr?: boolean) → void` | 右上角提示，1.8s 自动消失 | 创建/移除 DOM；全局单例 | [L1035-L1061](../fantia-product-search-enhancer.user.js#L1035-L1061) |

### 3.8 悬浮按钮

| 函数 | 签名 | 作用 | 返回 / 副作用 | 位置 |
| --- | --- | --- | --- | --- |
| `ensureFab` | `() → void` | 首次创建 FAB 与徽标 | 创建 DOM；写 `fab`/`fabBadge` | [L1065-L1091](../fantia-product-search-enhancer.user.js#L1065-L1091) |
| `updateFab` | `() → void` | 非列表页移除；否则更新计数与显隐 | 修改 DOM/引用 | [L1093-L1106](../fantia-product-search-enhancer.user.js#L1093-L1106) |

### 3.9 面板

| 函数 | 签名 | 作用 | 返回 / 副作用 | 位置 |
| --- | --- | --- | --- | --- |
| `copyAllVisible` | `() → void` | 复制可见 ID（换行分隔） | 剪贴板、历史、Toast | [L1146-L1160](../fantia-product-search-enhancer.user.js#L1146-L1160) |
| `buildPanel` | `() → void` | 构建面板与文档级关闭监听 | 创建 DOM；注册 `click`/`keydown` | [L1162-L1242](../fantia-product-search-enhancer.user.js#L1162-L1242) |
| `renderHistory` | `() → void` | 渲染历史前 50 条 | 重建 `.hist-list` | [L1244-L1292](../fantia-product-search-enhancer.user.js#L1244-L1292) |
| `togglePanel` | `() → void` | 按显示状态开/关 | 调用 `openPanel`/`closePanel` | [L1294-L1297](../fantia-product-search-enhancer.user.js#L1294-L1297) |
| `openPanel` | `() → void` | 构建、更新数量、渲染历史、显示 | 修改 `display` | [L1299-L1306](../fantia-product-search-enhancer.user.js#L1299-L1306) |
| `closePanel` | `() → void` | 隐藏并解除清空确认 | 修改 `display` | [L1308-L1311](../fantia-product-search-enhancer.user.js#L1308-L1311) |
| `disarmClear` | `() → void` | 取消「确认清空」状态 | 清定时器、恢复文案 | [L1315-L1321](../fantia-product-search-enhancer.user.js#L1315-L1321) |
| `clearHistoryArm` | `(btn) → void` | 两段式清空历史 | 写存储、刷新按钮、Toast | [L1323-L1337](../fantia-product-search-enhancer.user.js#L1323-L1337) |

### 3.10 站点暗色

| 函数 | 签名 | 作用 | 返回 / 副作用 | 位置 |
| --- | --- | --- | --- | --- |
| `loadSiteDark` | `() → boolean` | 懒加载暗色偏好，异常按浅色 | 读 `localStorage` | [L1124-L1130](../fantia-product-search-enhancer.user.js#L1124-L1130) |
| `applySiteDark` | `() → void` | 切换 `fid-site-dark` 与拨杆状态 | 修改 class | [L1132-L1137](../fantia-product-search-enhancer.user.js#L1132-L1137) |
| `toggleSiteDark` | `() → void` | 取反、持久化、应用、同步脚本主题 | 写存储；改 class | [L1139-L1144](../fantia-product-search-enhancer.user.js#L1139-L1144) |

### 3.11 搜索与筛选

| 函数 | 签名 | 作用 | 返回 / 副作用 | 位置 |
| --- | --- | --- | --- | --- |
| `filterAnchor` | `() → Element \| null` | 选择筛选栏插入锚点 | 查询 DOM | [L1361-L1370](../fantia-product-search-enhancer.user.js#L1361-L1370) |
| `fcSearchContext` | `() → object \| null` | 解析 FC 商品页上下文 | 读 `location` | [L1373-L1386](../fantia-product-search-enhancer.user.js#L1373-L1386) |
| `fcServerSearchActive` | `() → boolean` | URL 是否有服务端搜索条件 | 读 `location` | [L1388-L1392](../fantia-product-search-enhancer.user.js#L1388-L1392) |
| `fcSubmitSearch` | `() → void` | 组装参数并跳转到 FC 搜索地址 | `location.assign` | [L1396-L1413](../fantia-product-search-enhancer.user.js#L1396-L1413) |
| `fcClearSearch` | `() → void` | 跳回无搜索条件地址 | `location.assign` | [L1415-L1422](../fantia-product-search-enhancer.user.js#L1415-L1422) |
| `makeAdvPanel` | `() → HTMLElement` | 构建詳細検索字段与按钮 | 写 `advFields` | [L1424-L1500](../fantia-product-search-enhancer.user.js#L1424-L1500) |
| `syncAdvFromUrl` | `() → void` | 用 URL 条件回填字段 | 修改表单值 | [L1502-L1509](../fantia-product-search-enhancer.user.js#L1502-L1509) |
| `updateDetailState` | `() → void` | 更新詳細検索按钮激活态与 `aria-expanded` | 修改 class/属性 | [L1511-L1520](../fantia-product-search-enhancer.user.js#L1511-L1520) |
| `stashFilterFocus` | `() → object \| null` | 保存输入框与选区 | 无 | [L1522-L1531](../fantia-product-search-enhancer.user.js#L1522-L1531) |
| `restoreFilterFocus` | `(snap) → void` | 恢复焦点与选区 | 焦点变化 | [L1533-L1539](../fantia-product-search-enhancer.user.js#L1533-L1539) |
| `setFilterFixed` | `(on: boolean) → void` | 在占位槽与 `body` 间移动宿主并切类 | 移动 DOM；保留焦点 | [L1541-L1556](../fantia-product-search-enhancer.user.js#L1541-L1556) |
| `syncFilterAffix` | `() → void` | 根据占位槽位置切换吸顶并同步几何 | 移动 DOM、写内联样式 | [L1558-L1585](../fantia-product-search-enhancer.user.js#L1558-L1585) |
| `removeFilterBar` | `() → void` | 销毁筛选栏、观察器与状态 | 移除 DOM；清引用 | [L1587-L1604](../fantia-product-search-enhancer.user.js#L1587-L1604) |
| `ensureFilterBar` | `(hasProducts: boolean) → void` | 创建/复用/重建筛选栏 | 大量 DOM 与状态变更 | [L1606-L1740](../fantia-product-search-enhancer.user.js#L1606-L1740) |
| `applyFilterFromInput` | `() → void` | 读取输入并应用筛选 | 改 `filterQuery`；调用 `applyFilter`/`updateFab` | [L1742-L1746](../fantia-product-search-enhancer.user.js#L1742-L1746) |
| `clearFilter` | `() → void` | 清空输入与筛选；必要时清服务端搜索 | 可能 `location.assign` | [L1748-L1755](../fantia-product-search-enhancer.user.js#L1748-L1755) |
| `applyFilter` | `() → void` | 按 ID/文本显示或隐藏卡片 | 写卡片 `display`；写 `hiddenIds` | [L1757-L1773](../fantia-product-search-enhancer.user.js#L1757-L1773) |
| `updateFilterCount` | `(visible?: number) → void` | 更新计数与 `has-query` | 修改文本/类 | [L1775-L1791](../fantia-product-search-enhancer.user.js#L1775-L1791) |

### 3.12 标签栏避让

| 函数 | 签名 | 作用 | 返回 / 副作用 | 位置 |
| --- | --- | --- | --- | --- |
| `removeNavOffset` | `() → void` | 清标签栏引用、高度与 CSS 变量 | 移除 `--fid-nav-h` | [L1803-L1807](../fantia-product-search-enhancer.user.js#L1803-L1807) |
| `syncNavOffset` | `() → void` | 量高度并写 `--fid-nav-h` | 修改根元素变量 | [L1809-L1817](../fantia-product-search-enhancer.user.js#L1809-L1817) |
| `ensureNavOffset` | `() → void` | 查找标签栏并同步高度 | 查询 DOM；写状态 | [L1819-L1826](../fantia-product-search-enhancer.user.js#L1819-L1826) |

### 3.13 宽屏布局

| 函数 | 签名 | 作用 | 返回 / 副作用 | 位置 |
| --- | --- | --- | --- | --- |
| `widenLayout` | `() → void` | 识别网格行并打 `data-fid-grid` | 写 data 属性；调用 `markSplit` | [L1833-L1864](../fantia-product-search-enhancer.user.js#L1833-L1864) |
| `markSplit` | `(grid: Element) → void` | 识别「侧栏 + 内容」并打标记 | 写 data 属性 | [L1866-L1877](../fantia-product-search-enhancer.user.js#L1866-L1877) |

### 3.14 无限滚动

| 函数 | 签名 | 作用 | 返回 / 副作用 | 位置 |
| --- | --- | --- | --- | --- |
| `paginationNextUrl` | `(root?, base?) → string \| null` | 从分页取下一页绝对地址 | 查询 DOM | [L1894-L1901](../fantia-product-search-enhancer.user.js#L1894-L1901) |
| `findGridRowIn` | `(doc: Document) → Element \| null` | 在解析文档中找商品列最多的 `.row` | 查询 DOM | [L1905-L1918](../fantia-product-search-enhancer.user.js#L1905-L1918) |
| `cleanupInfiniteScroll` | `() → void` | 清定时器、观察器、哨兵与状态 | 移除 DOM；重置 `inf` | [L1920-L1933](../fantia-product-search-enhancer.user.js#L1920-L1933) |
| `sentinelInRange` | `() → boolean` | 哨兵是否在预载范围 | 读布局 | [L1935-L1939](../fantia-product-search-enhancer.user.js#L1935-L1939) |
| `endInfiniteScroll` | `(msg: string) → void` | 停止当前页的自动加载 | 清 `inf.url`；取消观察；日志 | [L1941-L1945](../fantia-product-search-enhancer.user.js#L1941-L1945) |
| `ensureSentinel` | `(grid: Element) → void` | 创建并挂载 1px 哨兵 | 创建/移动 DOM | [L1948-L1957](../fantia-product-search-enhancer.user.js#L1948-L1957) |
| `setupInfiniteScroll` | `() → void` | 初始化/复用/重置无限滚动 | 创建观察器；写 `inf` | [L1959-L1994](../fantia-product-search-enhancer.user.js#L1959-L1994) |
| `pumpNextPage` | `() → void` | 按哨兵位置决定是否续泵 | 设置 `inf.timer` | [L1997-L2006](../fantia-product-search-enhancer.user.js#L1997-L2006) |
| `loadNextPage` | `() → void` | 抓取、解析、去重追加、接龙 | 网络请求；DOM 追加；调用 `scan()` | [L2008-L2064](../fantia-product-search-enhancer.user.js#L2008-L2064) |

### 3.15 启动

| 函数 | 签名 | 作用 | 返回 / 副作用 | 位置 |
| --- | --- | --- | --- | --- |
| `boot` | `() → void` | 等待 `body`、恢复暗色、注入样式、首扫、安装观察器/定时器/全局监听 | 大量全局副作用 | [L2070-L2132](../fantia-product-search-enhancer.user.js#L2070-L2132) |

## 4. DOM / CSS 契约

### 4.1 脚本创建的元素

| 选择器 | 数量 | 角色 | 创建位置 |
| --- | --- | --- | --- |
| `#fantia-id-style` | 1 | 页面级样式表 | `injectCss()` |
| `.fantia-id-bar` | 每张卡片 1 个 | ID 条宿主，带 `data-fantia-product-id` | `makeBar()` |
| `.fantia-fab` | ≤1 | 悬浮按钮宿主 | `ensureFab()` |
| `.fantia-toast` | ≤1（瞬时） | Toast 宿主 | `toast()` |
| `.fantia-panel` | ≤1 | 面板宿主 | `buildPanel()` |
| `.fantia-filter-bar` | ≤1 | 筛选栏宿主 | `ensureFilterBar()` |
| `.fantia-filter-slot` | ≤1 | 吸顶占位槽 | `ensureFilterBar()` |

Shadow 内部主要类名：`.bar`、`.fid-icon`、`.fid-label`、`.fid-num`、`.fantia-id-btn`、`.fab`、`.fab-badge`、`.panel`、`.filterbar`、`.filter-input`、`.filter-count`、`.filter-clear`、`.fid-adv`、`.fid-field`、`.hist-list`、`.hist-item`。

### 4.2 `<html>` 状态类

| 类名 | 写入者 | 含义 |
| --- | --- | --- |
| `fid-dark` | `syncTheme()` | 脚本 UI 使用暗色设计变量 |
| `fid-site-dark` | `applySiteDark()` | 整站暗色主题 |
| `fid-wide` | `syncPageMode()` | 允许宽屏容器与网格重排 |
| `fid-fc-search` | `ensureFilterBar()` | 当前页为 FC 商品页，启用吸顶与原生行隐藏 |

### 4.3 data 属性

| 属性 | 写入者 | 读取者 | 含义 |
| --- | --- | --- | --- |
| `data-fantia-product-id` | `makeBar()` / `updateBar()` | 复制、筛选、`refreshBarStates()` | ID 条对应的商品 ID |
| `data-fid-grid` | `widenLayout()` | `syncPageMode()`、`filterAnchor()`、`setupInfiniteScroll()` | 识别出的商品网格行 |
| `data-fid-split` | `markSplit()` | `filterAnchor()`、宽屏 CSS | 「侧栏 + 内容」行 |
| `data-fid-side` | `markSplit()` | 宽屏 CSS | 侧栏列 |
| `data-fid-main` | `markSplit()` | 宽屏 CSS | 内容列 |

### 4.4 CSS 变量

| 变量 | 写入者 | 使用场景 |
| --- | --- | --- |
| `--fid-nav-h` | `syncNavOffset()` | fixed 筛选栏的 `top`、锚点滚动偏移 |
| `--fid-font`、`--fid-theme*`、`--fid-text-*`、`--fid-surface`、`--fid-elevated`、`--fid-fab-bg`、`--fid-border`、`--fid-popover-border`、`--fid-fill-*`、`--fid-success*`、`--fid-error*`、`--fid-shadow-*`、`--fid-edge-glow`、`--fid-glass`、`--fid-ease` | `CSS_TEXT` / `html.fid-dark` | Shadow 内所有组件视觉 |

## 5. 存储契约

| 键 | 值格式 | 默认 | 读取 | 写入 | 备注 |
| --- | --- | --- | --- | --- | --- |
| `fantia-id-history-v1` | JSON `[{id:string,t:number}]` | `[]` | `loadHistory()` | `saveHistory()` | 上限 500，面板只渲染 50 |
| `fantia-id-sitedark` | `'1'` / `'0'` | 浅色 | `loadSiteDark()` | `toggleSiteDark()` | 全站生效 |
| `fantia-id-debug` | `'1'` | 关闭 | `DEBUG` 初始化 | 仅用户手动 | 控制 `[FantiaID]` 日志 |

另有进程内标记 `window.__fantiaProductIdBarLoaded = true`（[L82-L83](../fantia-product-search-enhancer.user.js#L82-L83)），不持久化。

## 6. URL 参数契约（FC 商品页）

| 参数 | 取值 | 说明 |
| --- | --- | --- |
| `product_tab` | 站点现有值，缺省 `all` | 始终保留 |
| `q[name_cont]` | 任意关键词 | 标题/关键词搜索 |
| `q[tag]` | 单个标签 | 去掉前导 `#`，空白压缩 |
| `q[sale_status]` | `0` / `1` / `2` | 销售中 / COMING SOON / 销售结束 |
| `q[sale_type]` | `0` / `1` / `5` / `8` / `10` / `11` / `12` | 自宅发货 / 下载 / 匿名配送 / 仓库发货 / 抽奖 / 投稿精选 / 见面会 |
| `q[s]` | `newer` / `updater` / `popular` | 新着 / 更新 / 收藏排序 |

## 7. 事件与定时器清单

| 来源 | 回调 | 节流/频率 | 位置 |
| --- | --- | --- | --- |
| `MutationObserver(body)` | `scan()` | 400ms | [L2092-L2099](../fantia-product-search-enhancer.user.js#L2092-L2099) |
| `setInterval` | `scan()` | 1500ms | [L2101](../fantia-product-search-enhancer.user.js#L2101) |
| `window.scroll` | `syncNavOffset` / `syncFilterAffix` / `pumpNextPage` | `requestAnimationFrame` | [L2103-L2116](../fantia-product-search-enhancer.user.js#L2103-L2116) |
| `window.resize` | 同上三函数 | 每次触发 | [L2116](../fantia-product-search-enhancer.user.js#L2116) |
| `document.click`（捕获） | 收起詳細検索 | 每次点击 | [L2119-L2126](../fantia-product-search-enhancer.user.js#L2119-L2126) |
| `popstate` | `scan()` | 300ms 延迟 | [L2128](../fantia-product-search-enhancer.user.js#L2128) |
| `turbo:load` / `page:load` | `scan()` | 每次事件 | [L2129-L2130](../fantia-product-search-enhancer.user.js#L2129-L2130) |
| 输入框 `input` | `applyFilterFromInput` | 150ms 防抖 | [L1665-L1671](../fantia-product-search-enhancer.user.js#L1665-L1671) |
| 输入框 `keydown` | Enter 提交 / Esc 清空 | 每次按键 | [L1672-L1682](../fantia-product-search-enhancer.user.js#L1672-L1682) |
| `IntersectionObserver` | `pumpNextPage` | 交叉变化 | [L1986-L1991](../fantia-product-search-enhancer.user.js#L1986-L1991) |
| `ResizeObserver` | `syncFilterAffix` | 宿主尺寸变化 | [L1728-L1731](../fantia-product-search-enhancer.user.js#L1728-L1731) |
| Toast 定时器 | 移除 Toast | 1800ms | [L1057-L1060](../fantia-product-search-enhancer.user.js#L1057-L1060) |
| 清空确认定时器 | `disarmClear` | 3000ms | [L1328](../fantia-product-search-enhancer.user.js#L1328) |
| 按钮反馈定时器 | 解锁并恢复状态 | 1500ms | [L914-L919](../fantia-product-search-enhancer.user.js#L914-L919) |
| 无限滚动退避定时器 | `loadNextPage` | ≥300ms，失败上限 30s | [L2000-L2005](../fantia-product-search-enhancer.user.js#L2000-L2005) |
