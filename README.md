# Fantia 增强油猴脚本

托管在 GitHub 的油猴脚本，直接在 ScriptCat / Tampermonkey / Violentmonkey 里用链接安装。

## 安装

1. 浏览器装好 ScriptCat（或 Tampermonkey / Violentmonkey）
2. 打开安装地址，点「安装」：

```
https://raw.githubusercontent.com/GTX2090ti/fantia-userscripts/main/fantia-product-search-enhancer.user.js
```

仓库主页：https://github.com/GTX2090ti/fantia-userscripts

## 脚本清单

### `fantia-product-search-enhancer.user.js` · Fantia 商品搜索增强（v1.5.3）

- 商品搜索/列表页：每张商品卡片的图片与介绍下方注入 `商品 ID <数字>` + 「复制」按钮，一键复制链接尾部数字；复制过的卡片持久标记「已复制」，悬停按钮可恢复「复制」便于重拷
- 页首筛选框：按商品 ID 或标题关键词实时过滤本页卡片（防抖 150ms，Esc 或 × 清空），显示命中数
- FC 商品页搜索：增强栏内嵌站点原生搜索，关键词提交 `q[name_cont]`；「詳細検索」面板支持标签、状态（販売中 / COMING SOON / 販売期間終了）、商品类型（ダウンロード / 自宅発送 / 匿名配送 / 倉庫発送 / くじ / 投稿セレクト / ミーグリ）与排序（新着 / 更新 / 人気），走 Fantia 自己的搜索路由，原生关键词行自动隐藏避免重复
- FC 页面标签栏沿用站点自身的吸顶（滚动后原栏 `is-fixed`），不额外克隆，固定前后样式一致；激活项统一为深蓝底白字。增强搜索栏随滚动吸附在标签栏下方（祖先 `overflow` 会截断 `sticky`，脚本用 fixed 层 + 占位槽实现，展开詳細検索时占位高度同步）
- 右下角悬浮按钮：徽标显示本页去重商品数（筛选生效时只计可见卡片），点击打开悬浮面板
  - 「复制本页全部」：复制全部 ID（换行分隔，可直接喂 FantiaProducts 刮削器）
  - 「最近复制」：复制历史跨页面持久化（localStorage，上限 500 条），点击条目再次复制，两段式确认一键清空
- 宽屏（≥1200px）布局：只有运行时识别到商品网格才放宽容器，并重排为 220px 起步的 auto-fill 多列，识别「侧栏 + 内容」结构定宽侧栏；社团商品页 / 搜索 / 排行榜的网格型容器适用，Market 保持站点原生居中布局；已移除 Bootstrap clearfix 伪元素，多列严格对齐
- 同一张卡片被缩略图/标题等多个商品链接指向时按「单商品作用域」去重，只保留一条 ID 条，并自动清理旧版本遗留的重复条
- 无限滚动：有「下一页」时滚动近底部自动加载追加（提前 1200px 预载），按哨兵位置持续续泵直到填满预载区，跨页接龙直到最后一页；抓取失败退避重试，重复页自动去重，原分页仍可手动跳页
- 页面黑暗模式：面板内「页面黑暗模式」拨杆一键切换整站暗色主题，偏好写入 localStorage 跨页面记忆，脚本自身毛玻璃 UI 自动跟随明暗。脚本匹配全站 `fantia.jp/*`，黑暗模式在所有页面（首页/详情页/帖子页/后台等）生效；卡片注入、筛选框、悬浮按钮仍只出现在列表页（详情页/帖子页自动跳过）。覆盖策略分四层——Bootstrap 通用组件（顶栏/卡片/表单/分页/页脚等）逐个上色、结构性容器（div/section/article 等）兜底刷透明露出暗色底、区块级标签上的渐变背景图抹除（div 不动避免误杀背景图缩略图）、自带底色的实心组件（alert/徽章/列表组/标签页/弹窗/进度条/bg-\* 与 text-\* 工具类等）再重新上色；全站图片与视频统一加一档亮度滤镜，避免暗底上的白底插画过亮
- 不绑定固定 class，按 DOM 结构识别卡片；兼容整卡可点与「外层 div + 内链只包缩略图」两种布局
- MutationObserver + 轮询兜底，覆盖分页/无限滚动/SPA 跳转；商品详情页与帖子页自动跳过
- 剪贴板 clipboard API 失败时自动降级 execCommand；BewlyCat 风格毛玻璃 UI，自动适配暗色模式
- 手机适配：小屏面板左右贴边成抽屉、历史列表拉高，触屏点按目标 ≥38px，FAB 放大到 52px，480px 以下隐藏「商品 ID」文字标签

## 自动更新

脚本头部已配置 `@updateURL` / `@downloadURL` 指向本仓库的 GitHub raw 地址，
ScriptCat / Tampermonkey 会按版本号自动检查更新，无需内网环境。

## 环境

- GitHub：`GTX2090ti/fantia-userscripts`（主源，安装与自动更新均走 raw.githubusercontent.com）
- Gitea：`http://192.168.2.210:3100/akinxkk/fantia-userscripts`（内网旧镜像，不再更新）
