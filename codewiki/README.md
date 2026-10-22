# Fantia 商品搜索增强 · Code Wiki

面向维护者与二次开发者的代码结构文档。对应脚本版本 **v1.5.3**，源文件 [fantia-product-search-enhancer.user.js](../fantia-product-search-enhancer.user.js)（2141 行，单文件 IIFE）。

## 这套文档回答什么

- 项目整体是怎么组织和运行的：入口、生命周期、页面路由、状态模型
- 每个模块负责什么、模块之间如何调用
- 关键常量、变量、函数、数据结构、DOM/CSS 契约
- 依赖了哪些浏览器 API 和站点结构，失败时如何降级
- 如何安装、调试、发布，以及排查常见问题

## 文档导航

| 文档 | 内容 | 适合谁 |
| --- | --- | --- |
| [01 整体架构](01-architecture.md) | 分层、启动时序、页面矩阵、状态模型、关键设计决策 | 第一次读代码的人 |
| [02 模块职责](02-modules.md) | 17 个功能模块的职责、关键函数、输入输出、失败模式 | 要改某个功能的人 |
| [03 API 参考](03-api-reference.md) | 常量、状态变量、75 个函数、CSS/DOM/存储/URL 契约 | 查签名和副作用的人 |
| [04 依赖与数据](04-dependencies-and-data.md) | 外部依赖、浏览器 API、站点 DOM 契约、调用图、数据模型 | 评估改动影响面的人 |
| [05 运行与维护](05-run-and-maintenance.md) | 安装、调试、发布、故障排查、扩展指南、已知限制 | 部署与长期维护的人 |

## 项目速览

| 项 | 值 |
| --- | --- |
| 项目类型 | 浏览器用户脚本（Userscript） |
| 运行宿主 | ScriptCat / Tampermonkey / Violentmonkey |
| 作用域 | `https://fantia.jp/*` |
| 执行时机 | `document-idle`（脚本内另有 `DOMContentLoaded` 与 2.5s 超时兜底） |
| 权限声明 | `@grant none`，不使用任何 `GM_*` API |
| 外部运行时依赖 | 无（不使用 jQuery、Bootstrap JS 或第三方库） |
| 构建 / 打包 | 无，源文件即发布产物 |
| 测试 / Lint / CI | 仓库内没有 |
| 持久化 | `localStorage` 三个键 |
| 网络请求 | 仅同源 `fetch` 抓取下一页 HTML |
| 界面技术 | Shadow DOM + `adoptedStyleSheets`（带 `<style>` 回退） |
| 作者 / 命名空间 | 小蓝 / `fantia.jp` |

## 仓库结构

```text
/workspace
├── README.md                                  # 面向用户的安装与功能说明
├── fantia-product-search-enhancer.user.js     # 全部实现（2141 行）
└── codewiki/                                  # 本套文档
    ├── README.md
    ├── 01-architecture.md
    ├── 02-modules.md
    ├── 03-api-reference.md
    ├── 04-dependencies-and-data.md
    └── 05-run-and-maintenance.md
```

整个项目只有一个可执行文件，所有逻辑都在一个立即执行函数（IIFE）内，通过函数声明和模块级变量组织，没有模块系统、没有构建步骤。

## 一分钟安装

1. 安装 ScriptCat、Tampermonkey 或 Violentmonkey。
2. 打开安装地址并确认安装：

```text
https://raw.githubusercontent.com/GTX2090ti/fantia-userscripts/main/fantia-product-search-enhancer.user.js
```

3. 打开任意 Fantia 列表页（如社团商品页、搜索页、排行榜），右下角出现悬浮按钮即生效。

脚本头部的 `@updateURL` / `@downloadURL` 指向同一地址，管理器会按 `@version` 自动检查更新。更完整的运行与调试说明见 [05 运行与维护](05-run-and-maintenance.md)。

## 能力地图

| 用户可见能力 | 代码入口 | 详细说明 |
| --- | --- | --- |
| 卡片注入「商品 ID + 复制」条 | `scan()` → `resolveCard()` → `makeBar()` | [02 · M7](02-modules.md#m7-卡片识别) / [M8](02-modules.md#m8-id-条注入与扫描) |
| 按 ID / 标题实时筛选本页 | `ensureFilterBar()` → `applyFilter()` | [02 · M13](02-modules.md#m13-页首搜索与筛选栏) |
| FC 商品页站内搜索与詳細検索 | `fcSubmitSearch()` / `makeAdvPanel()` | [02 · M13](02-modules.md#m13-页首搜索与筛选栏) |
| 复制本页全部、复制历史 | `copyAllVisible()` / `renderHistory()` | [02 · M11](02-modules.md#m11-悬浮面板) |
| 复制历史跨页持久化 | `recordIds()` / `loadHistory()` | [02 · M6](02-modules.md#m6-复制历史) |
| 无限滚动自动加载 | `setupInfiniteScroll()` / `loadNextPage()` | [02 · M16](02-modules.md#m16-无限滚动) |
| 宽屏多列重排 | `widenLayout()` / `markSplit()` | [02 · M15](02-modules.md#m15-宽屏布局重排) |
| 增强栏吸顶跟随 | `ensureNavOffset()` / `syncFilterAffix()` | [02 · M14](02-modules.md#m14-标签栏避让与吸顶) |
| 全站黑暗模式 | `toggleSiteDark()` / `applySiteDark()` | [02 · M12](02-modules.md#m12-站点黑暗模式) |
| 脚本 UI 明暗跟随 | `detectDark()` / `syncTheme()` | [02 · M4](02-modules.md#m4-主题检测与脚本-ui-明暗) |
| 复制失败降级 | `copyText()` → `legacyCopy()` | [02 · M9](02-modules.md#m9-剪贴板与-toast) |

## 快速定位

| 我想…… | 先看 |
| --- | --- |
| 弄懂页面加载后发生了什么 | [01 · 启动时序](01-architecture.md#4-启动与刷新时序) |
| 知道某个页面为什么没有注入 | [01 · 页面路由矩阵](01-architecture.md#5-页面路由矩阵) |
| 改卡片识别规则 | [02 · M7](02-modules.md#m7-卡片识别)、[04 · 站点 DOM 契约](04-dependencies-and-data.md#3-站点-dom-契约) |
| 新增一个搜索筛选项 | [05 · 扩展指南](05-run-and-maintenance.md#5-扩展指南) |
| 查某个函数签名和副作用 | [03 · 函数参考](03-api-reference.md#3-函数参考) |
| 排查样式或吸顶问题 | [05 · 故障排查](05-run-and-maintenance.md#4-故障排查) |
| 评估改选择器的影响面 | [04 · 耦合热点](04-dependencies-and-data.md#6-耦合热点与改动影响面) |

## 建议阅读顺序

1. 先读 [01 整体架构](01-architecture.md)，建立生命周期与分层概念。
2. 再读 [02 模块职责](02-modules.md)，按功能定位代码。
3. 需要动手时查 [03 API 参考](03-api-reference.md) 和 [04 依赖与数据](04-dependencies-and-data.md)。
4. 发布或排障时读 [05 运行与维护](05-run-and-maintenance.md)。
