# 05 · 运行与维护

## 1. 安装与更新

### 1.1 安装

1. 在浏览器安装 **ScriptCat**、**Tampermonkey** 或 **Violentmonkey** 之一。
2. 打开脚本安装地址：

```text
https://raw.githubusercontent.com/GTX2090ti/fantia-userscripts/main/fantia-product-search-enhancer.user.js
```

3. 管理器识别到 `.user.js` 后点击「安装」。
4. 打开 Fantia 列表页（社团商品页、搜索页、排行榜等），右下角出现悬浮按钮即生效。

### 1.2 自动更新

脚本头部声明：

```text
@updateURL    https://raw.githubusercontent.com/GTX2090ti/fantia-userscripts/main/fantia-product-search-enhancer.user.js
@downloadURL  https://raw.githubusercontent.com/GTX2090ti/fantia-userscripts/main/fantia-product-search-enhancer.user.js
@version      1.5.3
```

管理器会按 `@version` 比较远端版本。发布新版本时必须递增 `@version`，否则不会触发更新。

README 中提到的 Gitea 地址（`http://192.168.2.210:3100/akinxkk/fantia-userscripts`）是内网旧镜像，已不再更新。

### 1.3 运行环境

| 项 | 要求 |
| --- | --- |
| 站点 | `https://fantia.jp/*` |
| 登录 | 普通浏览即可；无限滚动抓取会携带同源 Cookie，未登录时可能抓不到受限内容 |
| 浏览器 | 支持 Shadow DOM 的现代浏览器 |
| 网络 | 无限滚动需要能正常访问 Fantia 分页 |
| 存储 | 非隐私模式或允许 `localStorage`，否则历史与暗色偏好不持久 |

## 2. 本地开发

### 2.1 没有构建步骤

源文件就是产物。任何修改保存后，刷新 Fantia 页面即可看到效果（管理器会在页面加载时重新注入）。

### 2.2 三种调试方式

| 方式 | 步骤 | 适用 |
| --- | --- | --- |
| 管理器内编辑 | 管理器面板 → 新建脚本 → 粘贴全文 → 保存 → 刷新页面 | 长期开发 |
| 安装本地文件 | 管理器「实用工具 → 从文件导入」选择 `.user.js` | 验证安装/更新流程 |
| 控制台粘贴 | 打开 Fantia 页面 DevTools，粘贴 IIFE 全文并回车 | 临时验证，注意刷新后失效 |

控制台粘贴时页面可能已经执行过脚本（`window.__fantiaProductIdBarLoaded` 为 `true`），直接粘贴不会生效；应先刷新页面再执行。

### 2.3 调试开关

```js
localStorage.setItem('fantia-id-debug', '1');
location.reload();
```

刷新后控制台会出现 `[FantiaID]` 前缀日志，包括：

- 本轮新注入数量与累计商品数
- 无限滚动启用地址、追加页数、下一页
- 无限滚动失败次数与退避时间
- 结束原因

关闭：

```js
localStorage.removeItem('fantia-id-debug');
location.reload();
```

`DEBUG` 在脚本初始化时读取，修改后必须刷新。

### 2.4 常用检查命令

```js
// 已注入的 ID 条数量
document.querySelectorAll('.fantia-id-bar').length

// 是否识别到网格 / 侧栏
document.querySelectorAll('[data-fid-grid]').length
document.querySelectorAll('[data-fid-split]').length

// 当前 html 状态类
document.documentElement.className

// 标签栏高度变量
getComputedStyle(document.documentElement).getPropertyValue('--fid-nav-h')

// 复制历史
JSON.parse(localStorage.getItem('fantia-id-history-v1') || '[]')

// 筛选栏与面板是否挂载
document.querySelector('.fantia-filter-bar')
document.querySelector('.fantia-panel')
```

Shadow 内部结构需要在 DevTools 元素面板中展开 `#shadow-root (open)` 查看。

## 3. 发布流程

1. 修改脚本，确认功能与样式。
2. 更新头部 `@version`（语义化版本，如 `1.5.3 → 1.5.4`）。
3. 同步更新 [README.md](../README.md) 中的版本号与功能清单。
4. 提交并推送到 `main` 分支，确保文件名与路径不变：

```text
fantia-product-search-enhancer.user.js
```

5. 打开 raw 地址确认内容已更新、`@version` 正确。
6. 在管理器里手动「检查更新」验证升级链路。
7. 若改动涉及站点选择器，按 [第 7 节回归清单](#7-手动回归清单) 过一遍。

## 4. 故障排查

### 4.1 快速判定

| 现象 | 优先检查 | 可能原因 | 处理 |
| --- | --- | --- | --- |
| 页面完全没有变化 | 管理器是否启用；地址是否为 `https://fantia.jp/...`；控制台是否有 `[FantiaID]` | 脚本未注入 / 被其他脚本拦截 / 页面在 iframe 中 | 重装脚本；查看管理器日志；确认 `@match` |
| 列表页没有 ID 条 | `document.querySelectorAll('a[href*="/products/"]').length`；`document.documentElement.className` | 不是列表页（详情/帖子）；页面无商品；卡片结构变了 | 换列表页；用调试日志确认 `shouldRun`；检查卡片识别 |
| ID 条位置不对 | 卡片是否「整卡 `<a>`」或「外层 div + 内链缩略图」 | `resolveCard()` 特征不匹配 | 调整识别条件，回归四种模板 |
| 同一卡片出现两条 ID | 是否 SPA 复用 DOM；是否装过旧版本 | 作用域识别或旧条未清理 | 刷新；确认 `cardScope()`；检查清理逻辑 |
| 筛选框不出现 | 是否有商品；是否 FC 商品页；`document.querySelector('#main, #main > .container')` | 无锚点或无商品 | 确认 `filterAnchor()`；FC 页即使无商品也应出现 |
| 筛选不生效 | `.fantia-id-bar` 是否存在；卡片父节点是否为被隐藏对象 | 条不在卡片直接子级；站点虚拟列表 | 检查注入位置；虚拟列表需另做适配 |
| FC 搜索参数无效 | 提交后的 URL；站点自身是否支持该 `q[...]` | 参数名/取值变化 | 对照站点原生表单，更新 `fcSubmitSearch()` |
| 原生搜索行仍显示 | `#fanclubs-products-search .fc-search` 是否存在 | 站点改类名 | 更新隐藏规则 |
| 增强栏吸顶错位/遮挡 | `--fid-nav-h` 是否为 0；标签栏选择器 | 未找到标签栏；高度未同步 | 更新 `ensureNavOffset()` 选择器 |
| 无限滚动不触发 | 调试日志是否有「已启用」；`[data-fid-grid]` 数量；分页是否有下一页 | 无网格、无下一页、IO 不支持 | 检查网格识别与分页选择器 |
| 无限滚动中途停止 | 日志中的结束原因 | 无新商品 / 抓取失败 / 网格被替换 | 查看 Network；确认登录态；等待退避 |
| 暗色模式有白块 | 具体组件的 class | 暗色规则未覆盖 | 在 `CSS_TEXT` 补组件规则，注意放在兜底规则之后 |
| 暗色模式下图片过暗/过亮 | `filter: brightness(.8)` | 统一滤镜对白底插画影响大 | 调整亮度或对特定容器豁免 |
| 宽屏没有多列 | 视口是否 ≥1200px；是否 `/market`；`[data-fid-grid]` | 未识别网格或页面被跳过 | 检查 `widenLayout()` 与视口 |
| 复制失败 | 是否 HTTPS；剪贴板权限；Toast 文案 | Clipboard API 被拒且 `execCommand` 失败 | 允许剪贴板权限；双击数字手动复制 |
| 历史为空/不保留 | `localStorage` 是否可写；是否隐私模式 | 存储被禁用或配额满 | 退出隐私模式；清理站点存储 |

### 4.2 无限滚动专项

按顺序确认：

1. `document.querySelectorAll('[data-fid-grid]').length > 0`。
2. 分页存在下一页：
   ```js
   document.querySelector('.pagination li.next a[href], .pagination .next a[href], a[rel="next"]')
   ```
3. 打开调试日志，刷新后滚到底部，观察：
   - `无限滚动已启用，下一页：...`
   - `无限滚动：追加第 N 页...`
   - 失败时的 `第 N 次，Xs 后重试`
   - 结束原因
4. Network 面板检查 `fetch` 是否 200、返回 HTML 是否包含商品列。
5. 若抓取页结构变化，`findGridRowIn()` 会返回 `null`，日志显示「下一页找不到商品网格」。

### 4.3 暗色模式专项

1. 确认 `<html>` 同时有 `fid-site-dark` 与 `fid-dark`。
2. 白块通常是站点自定义 class 的实心组件：在 DevTools 里找到元素，补一条 `html.fid-site-dark <选择器>` 规则。
3. **规则顺序**：结构性容器透明规则在前，实心组件重上色规则在后；同等特异性下后写覆盖前写。新增规则不要插到兜底规则之前。
4. 跨域 iframe 内的内容无法被页面 CSS 覆盖，属于固有限制。

## 5. 扩展指南

### 5.1 新增一个 FC 詳細検索字段

以新增「某条件」为例，涉及 6 处：

1. **构建字段**：在 `makeAdvPanel()` 中用 `addField()` / `addSelect()` 添加，确保写入 `advFields.<key>`。
2. **读取 URL**：在 `fcSearchContext()` 返回值中增加 `key: sp.get('q[...]')`。
3. **回填**：在 `syncAdvFromUrl()` 中设置 `advFields.<key>.value`。
4. **提交**：在 `fcSubmitSearch()` 中按需 `sp.set('q[...]', ...)`，空值不写。
5. **状态**：在 `updateDetailState()` 的 `active` 判断中加入该字段。
6. **重置**：在 `makeAdvPanel()` 的「清空条件」里恢复默认值。

最后确认站点原生搜索确实接受该参数，否则页面会忽略条件。

### 5.2 新增一个生效页面

1. 在 `PAGE_RE` 中加入路径前缀。
2. 确认 `DETAIL_PAGE_RE` / `POST_PAGE_RE` 能排除该路由下的详情页（当前只匹配顶层 `/products/<id>`、`/posts/<id>`）。
3. 确认该页面的商品卡片满足 `resolveCard()` 的特征（`img` / `.card-body` / 文本长度）。
4. 确认 `filterAnchor()` 能找到一个合理锚点。
5. 如果页面有自己的搜索参数，再考虑扩展 `fcSearchContext()`（当前只服务 FC 商品页）。

### 5.3 调整卡片识别

- 修改 `resolveCard()` 时保留「一旦出现多个商品 ID 就停止」的保护，否则会把网格当卡片。
- `cardScope()` 的深度应与 `resolveCard()` 匹配，否则去重作用域可能落在卡片之外。
- `widenLayout()` 也调用 `resolveCard()`，改动会同时影响宽屏与无限滚动。
- 必须回归：整卡可点、外层 div + 内链缩略图、长简介、无图卡片、侧栏 + 内容、Market 居中页。

### 5.4 新增一个 Shadow UI 组件

1. 在 `ICON_*` 中加图标常量。
2. 新增 `XXX_CSS` 字符串。
3. 用 `attachShadowCss(host, 'xxx', XXX_CSS)` 创建 Shadow Root，并在 `shadowSheets` 体系中复用。
4. 宿主类名写进 `CSS_TEXT`，只保留定位/尺寸/层级。
5. 调用 `clearHostBackground(host)` 防止外部插件刷底色。
6. 如果组件需要随页面切换消失，在 `scan()` 的 `!shouldRun()` 分支和 `boot()` 的生命周期里补清理。
7. 在 `prefers-reduced-motion` 与 `pointer: coarse` 下补响应式规则。

### 5.5 新增持久化项

- 键名使用 `fantia-id-` 前缀并带版本后缀（如 `fantia-id-xxx-v1`）。
- 所有读写包 `try/catch`，隐私模式下静默降级。
- 若保存数组，设置上限并在写入前截断。

## 6. 已知限制与风险

### 6.1 识别与站点耦合

- **启发式识别**：`resolveCard()` 依赖 `img`、`.card-body`、文本长度；站点模板大改时可能插错位置或把网格当卡片。
- **深度上限**：`resolveCard()` 8 层、`cardScope()` 10 层、`widenLayout()` 6 层，超深嵌套会退化。
- **嵌套路由未排除**：`POST_PAGE_RE` 只匹配顶层 `/posts/<id>`；`/fanclubs/<id>/posts/...` 这类路径会被 `PAGE_RE` 当作列表页。
- **SPA 残留**：离开列表页时脚本会清理 FAB/筛选/无限滚动/吸顶变量，但**不主动移除已注入的 ID 条**，依赖站点替换列表 DOM。若站点复用列表节点，可能短暂看到旧条。
- **网格标记与视口无关**：`data-fid-grid` 在任何宽度都会打；窄屏虽然不做多列 CSS，但无限滚动仍可能启用（只要结构匹配）。

### 6.2 无限滚动

- 依赖**服务端渲染 HTML** 与 `.row` + `col-*` 结构；站点改为 JSON/前端渲染后失效。
- 只在识别到 `data-fid-grid` 且分页有下一页时工作。
- 抓取失败会持续退避重试（上限 30s），不会自动报警；需要调试日志观察。
- 结束条件之一是「下一页没有新商品」，这会阻止真正的重复页，但如果站点分页逻辑异常导致整页重复，也会提前结束。
- 终止后观察器与哨兵仍挂在 DOM 上，直到网格被替换或 URL 变化触发 `cleanupInfiniteScroll()`。

### 6.3 筛选与吸顶

- 筛选只作用于**已加载的卡片**，不会改变服务端搜索结果；对未加载的后续页无效。
- 通过内联 `display` 隐藏卡片；若站点自身也操作 `display` 或使用虚拟列表，可能冲突或漏筛。
- 匹配是大小写不敏感的**子串匹配**，不做分词；输入多个词不会拆分匹配。
- Shadow DOM 内文本不进入卡片 `textContent`，因此 ID 条文字不参与匹配；ID 由单独逻辑匹配。
- `--fid-nav-h` 依赖 `.fanclub-tabs.js-affix-nav` / `nav.scroll-tabs`；选择器变化时为 0，固定栏会贴视口顶部。
- fixed 几何取自占位槽矩形；若布局在无滚动、无 resize、宿主尺寸不变的情况下发生位移，可能短暂不同步。

### 6.4 面板与存储

- 历史最多存 500 条，面板只渲染前 50 条；这是展示上限，不是存储丢失。
- `localStorage` 在隐私模式/配额满时静默失败，表现为历史或暗色偏好不好用。
- 历史数据同源可读，Fantia 页面脚本理论上能读取；数据仅为商品 ID 与时间戳。

### 6.5 主题

- `detectDark()` 先匹配 `color-scheme` 中的 `dark`，因此 `color-scheme: light dark` 会被判为暗色。
- 站点暗色是**尽力覆盖**：第三方挂件、跨域 iframe、Shadow DOM 内容不会被页面 CSS 影响。
- 图片/视频统一 `brightness(.8)`，可能让深色图标或白色背景素材显得偏暗。

### 6.6 工程层面

- 单文件 2141 行，75 个函数共享模块级状态；没有类型、没有单元测试、没有 Lint、没有 CI。
- 文件头注释的预载距离写的是 1000px（[L42-L43](../fantia-product-search-enhancer.user.js#L42-L43)），实际是 `INF_PRELOAD = 1200`；以代码为准。
- 没有 `@noframes`；如果管理器允许在 iframe 中运行，同源 iframe 会各自初始化。
- 1.5s 轮询与 400ms 观察器在大列表页有持续开销；`updateFab()` 已避免文本写入自激，但仍会周期性查询 DOM。

## 7. 手动回归清单

仓库没有自动化测试，以下清单用于发版前人工验证。

### 7.1 基础注入

- [ ] 打开社团商品列表，卡片图片与介绍下方出现「商品 ID <数字> + 复制」。
- [ ] 点击复制：按钮短暂显示「已复制」，出现 Toast，剪贴板为纯数字。
- [ ] 刷新后，复制过的卡片按钮仍显示「已复制」；悬停恢复「复制」。
- [ ] 同一卡片被缩略图与标题两个链接指向时，只有一条 ID 条。
- [ ] 商品详情页 `/products/<id>`、帖子页 `/posts/<id>` 没有 ID 条、FAB、筛选栏。

### 7.2 筛选与搜索

- [ ] 输入 ID 片段，只保留匹配卡片，计数显示「可见 / 总数」。
- [ ] 输入标题关键词（含大小写差异），匹配正确。
- [ ] `Esc` 与 `×` 都能清空，所有卡片恢复。
- [ ] 筛选生效时 FAB 徽标只统计可见商品，「复制本页全部」只复制可见 ID。
- [ ] FC 商品页输入关键词回车，URL 带 `q[name_cont]` 并走站点搜索结果。
- [ ] 詳細検索的标签、状态、类型、排序提交后 URL 参数正确，刷新后字段回填。
- [ ] 詳細検索展开时，增强栏吸顶位置在标签栏下方，展开/收起不跳位。
- [ ] FC 页原生关键词行被隐藏，没有两套搜索框。

### 7.3 面板

- [ ] FAB 徽标数量等于本页去重商品数。
- [ ] 「复制本页全部」输出换行分隔的 ID，可直接用于批量工具。
- [ ] 历史条目显示 ID 与时间，点击再次复制并置顶。
- [ ] 「清空」第一次变「确认清空？」，3s 内第二次点击才清空；超时自动恢复。
- [ ] 点击面板外部或按 `Esc` 关闭面板。

### 7.4 无限滚动

- [ ] 有下一页时滚到接近底部自动追加，卡片立即有 ID 条。
- [ ] 连续滚动可跨多页接龙，直到最后一页停止。
- [ ] 重复页不会产生重复卡片。
- [ ] 断网/请求失败后，恢复网络能在退避时间后继续。
- [ ] 原分页链接仍可手动跳页。

### 7.5 布局与主题

- [ ] ≥1200px 时网格多列、卡片对齐，Bootstrap clearfix 不占第一格。
- [ ] 侧栏 + 内容页面侧栏保持 220px，内容区自适应。
- [ ] `/market` 保持站点原生居中布局，没有被撑成通栏。
- [ ] 开启页面黑暗模式后，首页/列表/详情/表单/弹窗均无大面积白块。
- [ ] 刷新或跳页后暗色偏好保留，脚本 UI 跟随变暗。
- [ ] 关闭暗色后恢复站点原样，脚本 UI 跟随变亮。

### 7.6 移动端与可访问性

- [ ] ≤600px 时面板左右贴边成抽屉，不遮挡 FAB。
- [ ] 触屏按钮点按目标足够大（FAB 52px、历史条目 ≥38px）。
- [ ] ≤480px 时 ID 条隐藏「商品 ID」文字，只保留数字与按钮。
- [ ] 键盘可聚焦复制按钮，`focus-visible` 有明显焦点环。
- [ ] 系统开启「减少动态效果」后无进入动画与过渡。
