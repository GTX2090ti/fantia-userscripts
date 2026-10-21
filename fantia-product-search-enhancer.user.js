// ==UserScript==
// @name         Fantia 商品搜索增强 · 商品 ID 快取
// @namespace    fantia.jp
// @version      1.4.3
// @description 在 Fantia 商品搜索/列表页，为每个商品卡片注入商品 ID（链接尾部数字）和一键复制按钮，悬浮面板支持复制本页全部 ID、查看/清空复制历史，页首筛选框可按 ID 或标题实时过滤卡片；复制过的卡片自动标记「已复制」；有下一页时滚动近底部自动加载追加；宽屏下自动重排为多列网格（全页型通用）；适配手机触屏（小屏抽屉面板、加大点按目标）；面板内开关可一键切换整站黑暗模式（记忆偏好，全站页面生效）；界面采用 BewlyCat 风格的毛玻璃浮层。
// @author       小蓝
// @match        https://fantia.jp/*
// @updateURL    https://gitea.51370.xyz:7999/akinxkk/fantia-userscripts/raw/branch/main/fantia-product-search-enhancer.user.js
// @downloadURL  https://gitea.51370.xyz:7999/akinxkk/fantia-userscripts/raw/branch/main/fantia-product-search-enhancer.user.js
// @grant        none
// @run-at       document-idle
// ==/UserScript==
/*
 * 功能
 * ----
 * 1. 商品 ID 条：扫描页面中所有指向 /products/<id> 的商品链接，定位其所属
 *    卡片（含图片 + 介绍文本的最小祖先元素），在卡片末尾（即图片与介绍
 *    下方）插入一条毛玻璃质感的 ID 信息条：
 *        [链接图标] 商品 ID <数字>            [复制]
 *    - 数字使用等宽字形，双击可整段手动选择；
 *    - 点"复制"把纯数字 ID 写入剪贴板，按钮瞬时变为"已复制"并弹 Toast。
 * 2. 悬浮面板：页面右下角常驻圆形按钮（徽标显示当前已识别的商品数量），
 *    点击打开毛玻璃面板：
 *        - 「复制本页全部」：一次性复制本页全部商品 ID（去重、换行分隔），
 *          方便批量喂给 FantiaProducts 刮削器 / 下载工具；页首筛选生效时
 *          只复制筛选后可见的卡片；
 *        - 「最近复制」：查看复制历史（跨页面持久化，localStorage），
 *          点击条目可再次复制，支持一键清空；
 *    - 复制过的商品，其卡片 ID 条上的按钮会持久显示「已复制」，
 *      悬停按钮可恢复成「复制」以便再次复制。
 * 3. 页首筛选框：自动插入到商品区上方，按商品 ID 或标题关键词实时
 *    过滤本页卡片（隐藏不匹配项并显示命中数），Esc 或 × 一键清空；
 *    筛选生效时悬浮按钮的徽标与「复制全部」都只统计可见卡片。
 * 4. 无限滚动：分页里存在「下一页」时，滚动近底部（提前 1000px 预载）
 *    自动抓取下一页 HTML、抽取商品网格追加到当前页并接龙后续分页；
 *    加载失败或没有更多页时自动停用，原分页链接保留可手动跳页。
 * 5. 页面黑暗模式：面板内开关一键给整个 Fantia 页面刷上暗色主题
 *    （顶栏、卡片、表单、分页、页脚全覆盖，图片不受影响），偏好写入
 *    localStorage 跨页面记忆；开启后 color-scheme 同步为 dark，
 *    脚本自身的毛玻璃 UI 会自动跟随切到暗色。
 *
 * 适配策略（为什么不依赖固定 class）
 * --------------------------------
 * Fantia 搜索/列表页的卡片结构会随站点改版变化，且不同页面（搜索结果、
 * 排行榜、Market、社团作品页）用的模板不完全一致。本脚本不绑定具体
 * class，而是按结构特征识别：从商品链接出发向上找"同时包含图片与介绍
 * 文本的最小祖先"即为卡片，把 ID 条追加到其末尾。对 <a> 整卡可点的
 * 布局（Fantia 现行卡片就是 a.card > .card-thumbnail + .card-body），
 * ID 条会成为该 <a> 的最后一个子元素，天然位于图片与介绍下方。
 *
 * 宽屏布局（>=1200px，运行时结构识别，全页型通用）
 * ------------------------------------------------
 * 从已识别的商品卡片向上找"直接子元素里有 >=2 个含商品卡片的 .row"，
 * 打上 data-fid-grid 标记并重排为 auto-fill 网格；再向外找一层
 * 「侧栏 + 内容」的 Bootstrap 行，打上 data-fid-split 标记（侧栏定宽
 * 220px、内容区占满余宽）。不依赖 #fanclubs-products-search 等具体
 * ID，社团商品页 / Market / 搜索结果 / 排行榜的网格型容器都能适配；
 * 识别不到网格的页面保持原布局，仅放宽容器。
 *
 * 触发与刷新
 * ----------
 * document-idle 首扫 + MutationObserver（节流 400ms）+ 1.5s 轮询兜底，
 * 分页、无限滚动、Turbo/Turbolinks 等 SPA 跳转都能覆盖；已处理的卡片
 * 打标记，不会重复注入。
 *
 * 调试：浏览器控制台执行
 *   localStorage.setItem('fantia-id-debug', '1')
 * 后刷新页面，可看到 [FantiaID] 前缀日志；删除该键即关闭。
 */

(function () {
  'use strict';

  if (window.__fantiaProductIdBarLoaded) return;
  window.__fantiaProductIdBarLoaded = true;

  // --------------------------------------------------------------------- //
  // 常量与工具
  // --------------------------------------------------------------------- //
  var DEBUG = false;
  try { DEBUG = localStorage.getItem('fantia-id-debug') === '1'; } catch (e) { /* 隐私模式 */ }

  function dbg() {
    if (!DEBUG) return;
    var msg = Array.prototype.join.call(arguments, ' ');
    if (console && console.log) console.log('[FantiaID] ' + msg);
  }

  // 商品链接：兼容绝对/相对地址，允许 /products/<id> 后带 slug 或参数
  var PRODUCT_HREF_RE = /\/products\/(\d+)(?:[/?#]|$)/;
  var DETAIL_PAGE_RE = /^\/products\/\d+(?:[/?#]|$)/;
  var POST_PAGE_RE = /^\/posts\/\d+(?:[/?#]|$)/;
  // 只在这些列表/搜索类页面生效；商品详情页、帖子详情页不注入
  var PAGE_RE = /^\/(?:fanclubs|products|market|ranking|search)(?:[/?#]|$)/;

  var ICON_CLIP = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="2" width="8" height="4" rx="1"></rect><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path></svg>';
  var ICON_CHECK = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg>';
  var ICON_ALERT = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 8v5"></path><path d="M12 17h.01"></path><circle cx="12" cy="12" r="10"></circle></svg>';
  var ICON_LINK = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>';
  var ICON_STACK = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"></rect><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"></path></svg>';
  var ICON_SEARCH = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>';
  var ICON_X = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>';
  var ICON_TRASH = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
  var ICON_HISTORY = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v6l4 2"></path></svg>';
  var ICON_MOON = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path></svg>';

  // 设计变量放在页面根上，通过继承进入 Shadow DOM；Dark Reader 的
  // body :not(iframe) 强刷规则无法穿透 Shadow 边界。
  var CSS_TEXT = [
    // BewlyCat 风格的设计变量：主题蓝、毛玻璃、12px 浮层圆角、150ms 标准动效
    ':root{',
    '--fid-font:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue","Noto Sans SC",Arial,sans-serif;',
    '--fid-theme:hsl(195 100% 42%);',
    '--fid-theme-10:rgba(0,174,236,.10);',
    '--fid-theme-20:rgba(0,174,236,.20);',
    '--fid-text-1:hsl(217 19% 10%);',
    '--fid-text-2:hsl(215 19% 24% / 80%);',
    '--fid-text-3:hsl(215 19% 28% / 60%);',
    '--fid-surface:rgba(255,255,255,.68);',
    '--fid-elevated:rgba(255,255,255,.92);',
    '--fid-fab-bg:rgba(255,255,255,.80);',
    '--fid-border:rgba(131,131,145,.18);',
    '--fid-popover-border:rgba(255,255,255,.55);',
    '--fid-fill-1:rgba(131,131,145,.15);',
    '--fid-fill-2:rgba(131,131,145,.30);',
    '--fid-success:hsl(164 60% 40%);',
    '--fid-success-20:rgba(41,163,131,.18);',
    '--fid-error:hsl(358 75% 59%);',
    '--fid-error-20:rgba(228,62,68,.16);',
    '--fid-shadow-1:0 4px 6px -1px rgba(0,0,0,.08),0 2px 4px -2px rgba(0,0,0,.04);',
    '--fid-shadow-2:0 10px 15px -3px rgba(0,0,0,.10),0 4px 6px -4px rgba(0,0,0,.06);',
    '--fid-edge-glow:inset 1px 1px 1px -0.5px rgba(255,255,255,.34),inset -1px -1px 1px -0.5px rgba(255,255,255,.14);',
    '--fid-glass:blur(20px) saturate(180%);',
    '--fid-ease:cubic-bezier(.22,.61,.36,1);',
    '}',
    'html.fid-dark{',
    '--fid-text-1:hsl(220 13% 95%);',
    '--fid-text-2:hsl(220 13% 85% / 90%);',
    '--fid-text-3:hsl(220 13% 75% / 75%);',
    '--fid-surface:rgba(43,46,51,.74);',
    '--fid-elevated:rgba(45,48,53,.94);',
    '--fid-fab-bg:rgba(45,48,53,.82);',
    '--fid-border:rgba(131,131,145,.16);',
    '--fid-popover-border:rgba(255,255,255,.12);',
    '--fid-fill-1:rgba(131,131,145,.10);',
    '--fid-fill-2:rgba(131,131,145,.20);',
    '--fid-success:hsl(164 60% 50%);',
    '--fid-success-20:rgba(47,184,148,.18);',
    '--fid-error:hsl(358 75% 65%);',
    '--fid-error-20:rgba(232,98,102,.18);',
    '--fid-shadow-1:0 4px 6px -1px rgba(0,0,0,.20),0 2px 4px -2px rgba(0,0,0,.12);',
    '--fid-shadow-2:0 10px 15px -3px rgba(0,0,0,.26),0 4px 6px -4px rgba(0,0,0,.18);',
    '--fid-edge-glow:inset 1px 1px 1px -0.5px rgba(255,255,255,.06),inset -1px -1px 1px -0.5px rgba(255,255,255,.03);',
    '}',
    // 站点级黑暗模式：html.fid-site-dark 由面板开关控制，给整个 Fantia
    // 页面刷暗色。走 Bootstrap 通用结构 + 常见容器选择器，!important 压过
    // 站点原生浅色；图片不加滤镜，照片观感不变。
    'html.fid-site-dark{color-scheme:dark;}',
    'html.fid-site-dark body{background:#141519!important;color:#e6e7eb!important;}',
    'html.fid-site-dark #wrap,html.fid-site-dark #main{background:transparent!important;}',
    // ---- 通用兜底层（必须位于组件规则之前）：把所有普通结构性容器刷成透明，
    // 露出暗色 body。站点自定义的白底区块绝大多数是普通 div/section，这样
    // 无需逐个枚举类名就能全站变暗；需要底色的组件（.card/.navbar/按钮等）
    // 由后面的组件规则以更高优先级重新上色。
    'html.fid-site-dark div,html.fid-site-dark section,html.fid-site-dark article,',
    'html.fid-site-dark aside,html.fid-site-dark main,html.fid-site-dark form,',
    'html.fid-site-dark figure,html.fid-site-dark fieldset,html.fid-site-dark blockquote,',
    'html.fid-site-dark hr{background-color:transparent!important;border-color:#2a2d36!important;}',
    'html.fid-site-dark ul,html.fid-site-dark ol,html.fid-site-dark dl,',
    'html.fid-site-dark nav{background-color:transparent!important;}',
    // 渐变背景也是漏白重灾区：区块级结构标签上的 background-image（渐变横幅/
    // 装饰带）直接抹掉；div 不动，避免误杀用背景图实现的卡片缩略图
    'html.fid-site-dark section,html.fid-site-dark article,html.fid-site-dark aside,',
    'html.fid-site-dark main,html.fid-site-dark header,html.fid-site-dark footer,',
    'html.fid-site-dark figure,html.fid-site-dark nav,',
    'html.fid-site-dark section[class],html.fid-site-dark article[class],',
    'html.fid-site-dark aside[class],html.fid-site-dark header[class],',
    'html.fid-site-dark footer[class]{background-image:none!important;}',
    // 第二档：带 class 的 div/section（站点常用双类名白底区块）
    'html.fid-site-dark div[class],html.fid-site-dark section[class],',
    'html.fid-site-dark article[class],html.fid-site-dark aside[class],',
    'html.fid-site-dark header[class],html.fid-site-dark footer[class]{',
    'background-color:transparent!important;}',
    'html.fid-site-dark h1,html.fid-site-dark h2,html.fid-site-dark h3,html.fid-site-dark h4,',
    'html.fid-site-dark h5,html.fid-site-dark h6,html.fid-site-dark p,html.fid-site-dark li,',
    'html.fid-site-dark label,html.fid-site-dark dd,html.fid-site-dark dt{color:#e6e7eb!important;}',
    'html.fid-site-dark a{color:#5ec2f2!important;}',
    'html.fid-site-dark a:hover,html.fid-site-dark a:focus{color:#8fd6f7!important;}',
    'html.fid-site-dark .text-muted,html.fid-site-dark .help-block,html.fid-site-dark small{',
    'color:#9aa0ac!important;}',
    'html.fid-site-dark header,html.fid-site-dark .navbar,html.fid-site-dark .navbar-default,',
    'html.fid-site-dark .navbar-inverse,html.fid-site-dark .navbar-static-top,',
    'html.fid-site-dark .navbar-fixed-top{background:#1d1f26!important;border-color:#2a2d36!important;',
    'box-shadow:none!important;}',
    'html.fid-site-dark .navbar-brand,html.fid-site-dark .navbar .nav>li>a{color:#c9ccd4!important;}',
    'html.fid-site-dark .navbar .nav>li>a:hover,html.fid-site-dark .navbar .nav>li>a:focus{',
    'color:#fff!important;background:#2a2d36!important;}',
    'html.fid-site-dark .navbar-toggle{border-color:#3a3e4a!important;}',
    'html.fid-site-dark .navbar-toggle .icon-bar{background:#c9ccd4!important;}',
    'html.fid-site-dark .card,html.fid-site-dark .panel,html.fid-site-dark .well,',
    'html.fid-site-dark .thumbnail{background:#1d1f26!important;border-color:#2a2d36!important;',
    'color:#e6e7eb!important;box-shadow:none!important;}',
    'html.fid-site-dark .card .card-body,html.fid-site-dark .panel-body,',
    'html.fid-site-dark .panel-heading,html.fid-site-dark .panel-footer{',
    'background:transparent!important;color:#e6e7eb!important;border-color:#2a2d36!important;}',
    'html.fid-site-dark input:not([type=checkbox]):not([type=radio]),html.fid-site-dark select,',
    'html.fid-site-dark textarea,html.fid-site-dark .form-control{background:#22242c!important;',
    'border-color:#33363f!important;color:#e6e7eb!important;}',
    'html.fid-site-dark input::placeholder,html.fid-site-dark textarea::placeholder{color:#767b87!important;}',
    'html.fid-site-dark .btn-default,html.fid-site-dark .btn-outline-default,',
    'html.fid-site-dark .btn-link{background:#22242c!important;border-color:#33363f!important;',
    'color:#e6e7eb!important;}',
    'html.fid-site-dark .btn-primary{background:hsl(195 100% 32%)!important;border-color:hsl(195 100% 32%)!important;}',
    'html.fid-site-dark .pagination>li>a,html.fid-site-dark .pagination>li>span{',
    'background:#1d1f26!important;border-color:#2a2d36!important;color:#c9ccd4!important;}',
    'html.fid-site-dark .pagination>.active>a,html.fid-site-dark .pagination>.active>span,',
    'html.fid-site-dark .pagination>.active>a:hover{background:hsl(195 100% 32%)!important;',
    'border-color:hsl(195 100% 32%)!important;color:#fff!important;}',
    'html.fid-site-dark .dropdown-menu{background:#1d1f26!important;border-color:#2a2d36!important;}',
    'html.fid-site-dark .dropdown-menu>li>a{color:#c9ccd4!important;}',
    'html.fid-site-dark .dropdown-menu>li>a:hover{background:#2a2d36!important;color:#fff!important;}',
    'html.fid-site-dark table,html.fid-site-dark .table>tbody>tr>td,',
    'html.fid-site-dark .table>tbody>tr>th,html.fid-site-dark .table>thead>tr>td,',
    'html.fid-site-dark .table>thead>tr>th{background:transparent!important;color:#e6e7eb!important;',
    'border-color:#2a2d36!important;}',
    'html.fid-site-dark .modal-content{background:#1d1f26!important;color:#e6e7eb!important;}',
    'html.fid-site-dark footer,html.fid-site-dark .footer{background:#141519!important;',
    'border-color:#2a2d36!important;color:#9aa0ac!important;}',
    'html.fid-site-dark footer a{color:#9aa0ac!important;}',
    // ---- 实心组件重上色（位于兜底层之后，赢回透明）：alert/徽章/列表组/
    // 面包屑/标签页等自带底色的组件不能透明，否则字叠字
    'html.fid-site-dark .alert{background:hsl(195 30% 16%)!important;',
    'border-color:hsl(195 30% 24%)!important;color:#c9ccd4!important;}',
    'html.fid-site-dark .alert-danger,html.fid-site-dark .alert-error{',
    'background:rgba(232,98,102,.18)!important;border-color:hsl(358 75% 45%)!important;color:#ffb3b6!important;}',
    'html.fid-site-dark .alert-success{background:rgba(47,184,148,.18)!important;',
    'border-color:hsl(164 60% 40%)!important;color:#9fe8d1!important;}',
    'html.fid-site-dark .badge,html.fid-site-dark .label,html.fid-site-dark .tag{',
    'background:#2a2d36!important;color:#c9ccd4!important;}',
    'html.fid-site-dark .label-primary,html.fid-site-dark .badge-primary{',
    'background:hsl(195 100% 32%)!important;color:#fff!important;}',
    'html.fid-site-dark .list-group-item,html.fid-site-dark .media,',
    'html.fid-site-dark .breadcrumb{background:#1d1f26!important;',
    'border-color:#2a2d36!important;color:#e6e7eb!important;}',
    'html.fid-site-dark .breadcrumb>li+li:before{color:#767b87!important;}',
    'html.fid-site-dark .nav-tabs,html.fid-site-dark .nav-pills{border-color:#2a2d36!important;}',
    'html.fid-site-dark .nav-tabs>li>a,html.fid-site-dark .nav-pills>li>a{',
    'background:#1d1f26!important;color:#c9ccd4!important;border-color:#2a2d36!important;}',
    'html.fid-site-dark .nav-tabs>li.active>a,html.fid-site-dark .nav-pills>li.active>a,',
    'html.fid-site-dark .nav-tabs>li.active>a:hover,html.fid-site-dark .nav-pills>li.active>a:hover{',
    'background:hsl(195 100% 32%)!important;color:#fff!important;}',
    'html.fid-site-dark .btn-success{background:hsl(164 60% 36%)!important;',
    'border-color:hsl(164 60% 36%)!important;color:#fff!important;}',
    'html.fid-site-dark .btn-danger{background:hsl(358 65% 42%)!important;',
    'border-color:hsl(358 65% 42%)!important;color:#fff!important;}',
    'html.fid-site-dark .btn-warning{background:hsl(36 70% 40%)!important;',
    'border-color:hsl(36 70% 40%)!important;color:#fff!important;}',
    'html.fid-site-dark .btn-info{background:hsl(195 70% 34%)!important;',
    'border-color:hsl(195 70% 34%)!important;color:#fff!important;}',
    // ---- 第三批组件补漏
    'html.fid-site-dark .jumbotron,html.fid-site-dark .page-header,',
    'html.fid-site-dark .thumbnail .caption,html.fid-site-dark .modal-header,',
    'html.fid-site-dark .modal-footer,html.fid-site-dark .panel-default>.panel-heading,',
    'html.fid-site-dark .panel-default>.panel-footer{background:#1d1f26!important;',
    'border-color:#2a2d36!important;color:#e6e7eb!important;}',
    'html.fid-site-dark .popover,html.fid-site-dark .tooltip-inner{background:#1d1f26!important;',
    'border-color:#2a2d36!important;color:#e6e7eb!important;}',
    'html.fid-site-dark .popover-title{background:#22242c!important;color:#e6e7eb!important;}',
    'html.fid-site-dark .input-group-addon,html.fid-site-dark .pager li>a,',
    'html.fid-site-dark .pager li>span{background:#22242c!important;',
    'border-color:#33363f!important;color:#c9ccd4!important;}',
    'html.fid-site-dark .progress,html.fid-site-dark .img-thumbnail{background:#22242c!important;',
    'border-color:#33363f!important;}',
    'html.fid-site-dark .progress-bar{background:hsl(195 100% 32%)!important;}',
    'html.fid-site-dark .tab-content>.tab-pane,html.fid-site-dark .media-object,',
    'html.fid-site-dark .media-body{background:transparent!important;}',
    'html.fid-site-dark .list-group-item.active,html.fid-site-dark .list-group-item.active:hover{',
    'background:hsl(195 100% 32%)!important;border-color:hsl(195 100% 32%)!important;color:#fff!important;}',
    'html.fid-site-dark .bg-primary{background:hsl(195 100% 32%)!important;}',
    'html.fid-site-dark .bg-success{background:rgba(47,184,148,.18)!important;}',
    'html.fid-site-dark .bg-danger{background:rgba(232,98,102,.18)!important;}',
    'html.fid-site-dark .bg-warning{background:rgba(240,180,80,.16)!important;}',
    'html.fid-site-dark .bg-info{background:rgba(94,194,242,.15)!important;}',
    'html.fid-site-dark .text-primary{color:#5ec2f2!important;}',
    'html.fid-site-dark .text-success{color:#7fe0c3!important;}',
    'html.fid-site-dark .text-danger{color:#ff9ba0!important;}',
    'html.fid-site-dark .text-warning{color:#f2c078!important;}',
    'html.fid-site-dark .text-info{color:#8fd6f7!important;}',
    'html.fid-site-dark .text-muted{color:#9aa0ac!important;}',
    'html.fid-site-dark .dropdown-header{color:#767b87!important;}',
    'html.fid-site-dark .navbar-nav>.open>a,html.fid-site-dark .navbar-nav>.open>a:hover,',
    'html.fid-site-dark .navbar-nav>.open>a:focus{background:#2a2d36!important;color:#fff!important;}',
    'html.fid-site-dark .btn-group.open .dropdown-toggle{background:#2a2d36!important;',
    'border-color:#33363f!important;}',
    // 宿主只负责占位与层级，视觉全部在 Shadow DOM 内完成
    '.fantia-id-bar{position:relative;z-index:2;display:block;box-sizing:border-box;',
    'width:calc(100% - 16px);min-width:0;margin:8px;padding:0;border:0;border-radius:10px;',
    'background:transparent;box-shadow:none;text-align:left;text-decoration:none;',
    'font:12px/18px var(--fid-font);}',
    '.fantia-fab{position:fixed;right:calc(18px + env(safe-area-inset-right,0px));',
    'bottom:calc(18px + env(safe-area-inset-bottom,0px));display:block;width:48px;height:48px;',
    'padding:0;border:0;border-radius:999px;background:transparent;box-shadow:none;',
    'z-index:2147483000;cursor:pointer;}',
    '.fantia-toast{position:fixed;top:calc(16px + env(safe-area-inset-top,0px));',
    'right:calc(16px + env(safe-area-inset-right,0px));z-index:2147483001;display:block;',
    'width:max-content;max-width:min(360px,calc(100vw - 24px));padding:0;border:0;',
    'border-radius:12px;background:transparent;box-shadow:none;font:13px/20px var(--fid-font);}',
    '.fantia-filter-bar{display:block;width:100%;margin:0 0 14px;padding:0;border:0;',
    'background:transparent;box-shadow:none;font:13px/20px var(--fid-font);}',
    '.fantia-panel{position:fixed;right:calc(18px + env(safe-area-inset-right,0px));',
    'bottom:calc(78px + env(safe-area-inset-bottom,0px));z-index:2147483000;display:none;',
    'padding:0;border:0;background:transparent;box-shadow:none;}',
    // 手机小屏：面板左右贴边成半屏抽屉，避开 FAB
    '@media (max-width:600px){',
    '.fantia-panel{left:calc(12px + env(safe-area-inset-left,0px));',
    'right:calc(12px + env(safe-area-inset-right,0px));',
    'bottom:calc(88px + env(safe-area-inset-bottom,0px));}',
    '}',
    // 宽屏：撑满视口，运行时识别的网格/侧栏标记负责实际重排
    '@media (min-width:1200px){',
    'html.fid-wide #main > .container{max-width:100%!important;width:100%!important;',
    'padding-left:24px;padding-right:24px;}',
    'html.fid-wide [data-fid-split]{display:flex;gap:20px;align-items:flex-start;',
    'margin-left:0;margin-right:0;}',
    'html.fid-wide [data-fid-split] > [data-fid-side]{flex:0 0 220px;width:220px;',
    'float:none;padding-left:0;padding-right:0;margin-bottom:0;}',
    'html.fid-wide [data-fid-split] > [data-fid-main]{flex:1 1 auto;width:auto;',
    'min-width:0;float:none;padding-left:0;padding-right:0;}',
    'html.fid-wide [data-fid-grid]{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));',
    'gap:18px;margin-left:0;margin-right:0;}',
    // Bootstrap 的 .row::before/.row::after（clearfix）会成为网格/弹性项，
    // 占掉第一格导致卡片整体错位——必须移除
    'html.fid-wide [data-fid-grid]::before,html.fid-wide [data-fid-grid]::after,',
    'html.fid-wide [data-fid-split]::before,html.fid-wide [data-fid-split]::after{',
    'content:none!important;display:none!important;}',
    'html.fid-wide [data-fid-grid] > [class*="col-"]{float:none;width:auto;min-width:0;',
    'padding:0;margin:0;}',
    '}',
    '@media (pointer:coarse){.fantia-fab{width:52px;height:52px;}}',
    '@media (prefers-reduced-motion:reduce){.fantia-fab{transition:none;}}'
  ].join('');

  var BAR_CSS = [
    '.bar{display:flex;align-items:center;gap:7px;box-sizing:border-box;width:100%;min-width:0;',
    'padding:4px 5px 4px 6px;background:var(--fid-surface);border:1px solid var(--fid-popover-border);',
    'border-radius:10px;box-shadow:var(--fid-shadow-1),var(--fid-edge-glow);',
    '-webkit-backdrop-filter:var(--fid-glass);backdrop-filter:var(--fid-glass);',
    'color:var(--fid-text-2);font:12px/18px var(--fid-font);text-align:left;white-space:nowrap;',
    'overflow:hidden;text-decoration:none;container-type:inline-size;',
    'transition:background-color .15s var(--fid-ease),border-color .15s var(--fid-ease);}',
    '.fid-icon{display:inline-flex;align-items:center;justify-content:center;flex:none;',
    'width:22px;height:22px;border-radius:6px;background:var(--fid-theme-10);color:var(--fid-theme);}',
    '.fid-icon svg{width:13px;height:13px;display:block;}',
    '.fid-label{flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;',
    'color:var(--fid-text-3);font-size:11px;line-height:16px;letter-spacing:.2px;}',
    '.fid-num{flex:none;min-width:0;color:var(--fid-text-1);font-size:13px;line-height:18px;',
    'font-weight:600;font-variant-numeric:tabular-nums;letter-spacing:.3px;',
    'user-select:all;-webkit-user-select:all;cursor:text;}',
    '.fantia-id-btn{margin-left:auto;flex:none;display:inline-flex;align-items:center;justify-content:center;gap:4px;',
    'height:24px;padding:0 9px;border:0;border-radius:999px;background:var(--fid-fill-1);color:var(--fid-text-2);',
    'font:600 11px/1 var(--fid-font);letter-spacing:.2px;cursor:pointer;appearance:none;-webkit-appearance:none;',
    'transition:background-color .15s var(--fid-ease),color .15s var(--fid-ease),transform .15s var(--fid-ease);}',
    '.fantia-id-btn:hover{background:var(--fid-fill-2);color:var(--fid-text-1);}',
    '.fantia-id-btn:active{transform:scale(.95);}',
    '.fantia-id-btn:focus-visible{outline:2px solid var(--fid-theme-20);outline-offset:2px;}',
    '.fantia-id-btn:disabled{cursor:default;opacity:.9;}',
    '.fantia-id-btn svg{width:12px;height:12px;display:block;}',
    '.fantia-id-btn.ok,.fantia-id-btn.done{background:var(--fid-success-20);color:var(--fid-success);}',
    '.fantia-id-btn.err{background:var(--fid-error-20);color:var(--fid-error);}',
    // 窄卡片优先保证 ID 与按钮放得下；宽卡片再显示文字标签
    '@container (max-width:219px){.fid-label{display:none;}}',
    '@media (pointer:coarse){.bar{padding:5px 6px;gap:8px;}',
    '.fantia-id-btn{height:30px;padding:0 12px;font-size:12px;}',
    '.fantia-id-btn svg{width:13px;height:13px;}}',
    '@media (max-width:480px){.fid-label{display:none;}}',
    '@media (prefers-reduced-motion:reduce){.fantia-id-btn{transition:none;}}'
  ].join('');

  var FAB_CSS = [
    '.fab{position:relative;width:100%;height:100%;display:flex;align-items:center;justify-content:center;',
    'padding:0;border:1px solid var(--fid-popover-border);border-radius:999px;background:var(--fid-fab-bg);',
    'color:var(--fid-theme);box-shadow:var(--fid-shadow-2),var(--fid-edge-glow);',
    '-webkit-backdrop-filter:var(--fid-glass);backdrop-filter:var(--fid-glass);cursor:pointer;',
    'appearance:none;-webkit-appearance:none;',
    'transition:transform .15s var(--fid-ease),background-color .15s var(--fid-ease),box-shadow .15s var(--fid-ease);}',
    '.fab:hover{transform:translateY(-1px);}',
    '.fab:active{transform:scale(.94);}',
    '.fab:focus-visible{outline:2px solid var(--fid-theme-20);outline-offset:2px;}',
    '.fab svg{width:20px;height:20px;display:block;}',
    '.fab-badge{position:absolute;top:-5px;right:-5px;min-width:18px;height:18px;padding:0 5px;',
    'border-radius:999px;background:var(--fid-theme);color:#fff;font:600 11px/18px var(--fid-font);',
    'text-align:center;box-sizing:border-box;box-shadow:0 2px 6px rgba(0,0,0,.20);}',
    '@media (pointer:coarse){.fab svg{width:22px;height:22px;}}',
    '@media (prefers-reduced-motion:reduce){.fab{transition:none;}}'
  ].join('');

  var TOAST_CSS = [
    '.panel{display:flex;align-items:flex-start;gap:9px;box-sizing:border-box;max-width:100%;padding:12px;',
    'background:var(--fid-elevated);border:1px solid var(--fid-popover-border);border-radius:12px;',
    'box-shadow:var(--fid-shadow-2);-webkit-backdrop-filter:var(--fid-glass);backdrop-filter:var(--fid-glass);',
    'color:var(--fid-text-1);font:13px/20px var(--fid-font);animation:fid-toast-in .18s var(--fid-ease);}',
    '.toast-icon{flex:none;display:inline-flex;margin-top:2px;color:var(--fid-success);}',
    '.panel.err .toast-icon{color:var(--fid-error);}',
    '.toast-text{word-break:break-all;}',
    '@keyframes fid-toast-in{from{opacity:0;transform:translateY(-6px);}to{opacity:1;transform:translateY(0);}}',
    '@media (prefers-reduced-motion:reduce){.panel{animation:none;}}'
  ].join('');

  var FILTER_CSS = [
    '.host{display:block;width:100%;}',
    '.filterbar{display:flex;align-items:center;gap:8px;box-sizing:border-box;width:100%;height:38px;padding:0 12px;',
    'background:var(--fid-surface);border:1px solid var(--fid-popover-border);border-radius:12px;',
    'box-shadow:var(--fid-shadow-1),var(--fid-edge-glow);-webkit-backdrop-filter:var(--fid-glass);backdrop-filter:var(--fid-glass);',
    'color:var(--fid-text-2);font:13px/20px var(--fid-font);transition:border-color .15s var(--fid-ease),box-shadow .15s var(--fid-ease);}',
    '.filterbar:focus-within{border-color:var(--fid-theme);box-shadow:0 0 0 3px var(--fid-theme-10),var(--fid-shadow-1);}',
    '.fid-search-icon{flex:none;display:inline-flex;color:var(--fid-text-3);}',
    '.fid-search-icon svg{width:15px;height:15px;display:block;}',
    '.filter-input{flex:1 1 auto;min-width:0;height:100%;padding:0;border:0;outline:none;background:transparent;',
    'color:var(--fid-text-1);font:13px/20px var(--fid-font);}',
    '.filter-input::placeholder{color:var(--fid-text-3);}',
    '.filter-count{flex:none;color:var(--fid-text-3);font-size:12px;line-height:20px;',
    'font-variant-numeric:tabular-nums;white-space:nowrap;}',
    '.filter-clear{flex:none;display:none;align-items:center;justify-content:center;width:22px;height:22px;padding:0;',
    'border:0;border-radius:999px;background:var(--fid-fill-1);color:var(--fid-text-2);cursor:pointer;appearance:none;',
    '-webkit-appearance:none;transition:background-color .15s var(--fid-ease),color .15s var(--fid-ease);}',
    '.filter-clear:hover{background:var(--fid-fill-2);color:var(--fid-text-1);}',
    '.filter-clear svg{width:12px;height:12px;display:block;}',
    '.filterbar.has-query .filter-clear{display:inline-flex;}',
    '@media (pointer:coarse){.filterbar{height:42px;}}',
    '@media (prefers-reduced-motion:reduce){.filter-clear{transition:none;}}'
  ].join('');

  var PANEL_CSS = [
    '.host{display:block;width:100%;}',
    '.panel{display:flex;flex-direction:column;gap:10px;box-sizing:border-box;padding:12px;',
    'background:var(--fid-elevated);border:1px solid var(--fid-popover-border);border-radius:14px;',
    'box-shadow:var(--fid-shadow-2);-webkit-backdrop-filter:var(--fid-glass);backdrop-filter:var(--fid-glass);',
    'color:var(--fid-text-1);font:13px/20px var(--fid-font);animation:fid-panel-in .16s var(--fid-ease);}',
    '.panel-title{display:flex;align-items:center;gap:6px;color:var(--fid-text-3);font-size:11px;line-height:16px;letter-spacing:.4px;}',
    '.panel-title svg{width:13px;height:13px;display:block;}',
    '.copy-all{display:flex;align-items:center;justify-content:center;gap:6px;height:36px;padding:0 12px;border:0;',
    'border-radius:10px;background:var(--fid-theme);color:#fff;font:600 13px/1 var(--fid-font);cursor:pointer;',
    'appearance:none;-webkit-appearance:none;transition:filter .15s var(--fid-ease),transform .15s var(--fid-ease);}',
    '.copy-all:hover{filter:brightness(1.08);}',
    '.copy-all:active{transform:scale(.98);}',
    '.copy-all:focus-visible{outline:2px solid var(--fid-theme-20);outline-offset:2px;}',
    '.copy-all svg{width:15px;height:15px;display:block;}',
    // 黑暗模式开关行：左侧月亮+文案，右侧 iOS 风拨杆
    '.dark-row{display:flex;align-items:center;gap:6px;color:var(--fid-text-2);',
    'font-size:12px;line-height:20px;}',
    '.dark-row svg{width:13px;height:13px;display:block;flex:none;color:var(--fid-text-3);}',
    '.dark-switch{margin-left:auto;position:relative;flex:none;width:34px;height:20px;padding:0;',
    'border:0;border-radius:999px;background:var(--fid-fill-2);cursor:pointer;appearance:none;',
    '-webkit-appearance:none;transition:background-color .15s var(--fid-ease);}',
    '.dark-switch::after{content:\'\';position:absolute;top:2px;left:2px;width:16px;height:16px;',
    'border-radius:999px;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.2);',
    'transition:transform .15s var(--fid-ease);}',
    '.dark-switch.on{background:var(--fid-theme);}',
    '.dark-switch.on::after{transform:translateX(14px);}',
    '.dark-switch:focus-visible{outline:2px solid var(--fid-theme-20);outline-offset:2px;}',
    '@media (prefers-reduced-motion:reduce){.dark-switch,.dark-switch::after{transition:none;}}',
    '.hist-head{display:flex;align-items:center;justify-content:space-between;color:var(--fid-text-3);',
    'font-size:11px;line-height:16px;letter-spacing:.4px;}',
    '.hist-clear{display:none;align-items:center;gap:4px;padding:0;border:0;background:transparent;',
    'color:var(--fid-error);font:11px/1 var(--fid-font);cursor:pointer;}',
    '.hist-clear:hover{text-decoration:underline;}',
    '.hist-clear svg{width:11px;height:11px;display:block;}',
    '.hist-clear.on{display:inline-flex;}',
    '.hist-list{display:flex;flex-direction:column;gap:2px;max-height:240px;overflow-y:auto;margin:0 -4px;',
    'padding:0 4px;scrollbar-width:thin;}',
    '.hist-item{display:flex;align-items:center;gap:8px;height:30px;padding:0 8px;border-radius:8px;cursor:pointer;',
    'user-select:none;-webkit-user-select:none;}',
    '.hist-item:hover{background:var(--fid-fill-1);}',
    '.hist-id{flex:none;color:var(--fid-text-1);font-size:12.5px;line-height:18px;font-weight:600;',
    'font-variant-numeric:tabular-nums;letter-spacing:.3px;}',
    '.hist-time{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;',
    'color:var(--fid-text-3);font-size:11px;line-height:16px;text-align:right;}',
    '.hist-copy{flex:none;display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;',
    'padding:0;border:0;border-radius:6px;background:transparent;color:var(--fid-text-3);cursor:pointer;}',
    '.hist-copy:hover{background:var(--fid-theme-10);color:var(--fid-theme);}',
    '.hist-copy svg{width:12px;height:12px;display:block;}',
    '.hist-empty{color:var(--fid-text-3);font-size:12px;line-height:18px;text-align:center;padding:6px 0;}',
    '.panel-foot{color:var(--fid-text-3);font-size:11px;line-height:16px;}',
    '@keyframes fid-panel-in{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);}}',
    // 手机小屏：面板占满可用宽度，历史列表拉高，主按钮加大
    '@media (max-width:600px){',
    '.panel{width:100%;max-width:100%;padding:12px 10px;}',
    '.copy-all{height:42px;}',
    '.hist-list{max-height:38vh;}',
    '}',
    // 触屏：点按目标放大到 ≥38px
    '@media (pointer:coarse){',
    '.hist-item{height:38px;}',
    '.hist-copy{width:28px;height:28px;}',
    '.hist-clear{padding:8px 4px;}',
    '.hist-id{font-size:13.5px;}',
    '}',
    '@media (prefers-reduced-motion:reduce){.panel{animation:none;}}'
  ].join('');

  var shadowSheets = {};
  function attachShadowCss(host, key, css) {
    var root = host.attachShadow({ mode: 'open' });
    try {
      if (typeof CSSStyleSheet !== 'undefined' && 'adoptedStyleSheets' in root) {
        var sheet = shadowSheets[key];
        if (!sheet) {
          sheet = new CSSStyleSheet();
          sheet.replaceSync(css);
          shadowSheets[key] = sheet;
        }
        root.adoptedStyleSheets = [sheet];
        return root;
      }
    } catch (e) { /* 回退到 <style> */ }
    var st = document.createElement('style');
    st.textContent = css;
    root.appendChild(st);
    return root;
  }

  // Dark Reader 会给宿主自身刷不透明底色；清掉它，视觉由 Shadow 内部绘制
  function clearHostBackground(host) {
    host.style.setProperty('background-color', 'transparent', 'important');
  }

  function injectCss() {
    if (document.getElementById('fantia-id-style')) return;
    var st = document.createElement('style');
    st.id = 'fantia-id-style';
    st.textContent = CSS_TEXT;
    (document.head || document.documentElement).appendChild(st);
  }

  // --------------------------------------------------------------------- //
  // 主题：跟随站点实际明暗（含 Dark Reader 强制 color-scheme 的情况）
  // --------------------------------------------------------------------- //
  function detectDark() {
    try {
      var de = document.documentElement;
      var scheme = String((de && getComputedStyle(de).colorScheme) || '');
      if (/dark/i.test(scheme)) return true;
      if (/light/i.test(scheme)) return false;

      var nodes = [document.body, de];
      for (var i = 0; i < nodes.length; i++) {
        if (!nodes[i]) continue;
        var bg = getComputedStyle(nodes[i]).backgroundColor || '';
        var m = bg.match(/[\d.]+/g);
        if (!m || m.length < 3) continue;
        var alpha = m.length > 3 ? parseFloat(m[3]) : 1;
        if (alpha < 0.2) continue;
        var lum = (0.2126 * +m[0] + 0.7152 * +m[1] + 0.0722 * +m[2]) / 255;
        return lum < 0.45;
      }
      return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    } catch (e) {
      return false;
    }
  }

  function syncTheme() {
    try {
      document.documentElement.classList.toggle('fid-dark', detectDark());
    } catch (e) { /* 不阻断主流程 */ }
  }

  function syncPageMode() {
    try {
      document.documentElement.classList.toggle('fid-wide', shouldRun());
    } catch (e) { /* 不阻断主流程 */ }
  }

  function watchTheme() {
    try {
      var mq = window.matchMedia('(prefers-color-scheme: dark)');
      if (mq.addEventListener) mq.addEventListener('change', syncTheme);
      else if (mq.addListener) mq.addListener(syncTheme);
    } catch (e) { /* 旧浏览器忽略 */ }
  }

  // --------------------------------------------------------------------- //
  // 页面判定与商品链接收集
  // --------------------------------------------------------------------- //
  function shouldRun() {
    var p = location.pathname || '';
    if (DETAIL_PAGE_RE.test(p)) return false;   // 商品详情页不注入
    if (POST_PAGE_RE.test(p)) return false;     // 帖子详情页不注入
    if (!PAGE_RE.test(p)) return false;
    return true;
  }

  function productIdFromHref(href) {
    var m = PRODUCT_HREF_RE.exec(href || '');
    return m ? m[1] : '';
  }

  function collectProductLinks() {
    var out = [];
    var anchors = document.querySelectorAll('a[href*="/products/"]');
    for (var i = 0; i < anchors.length; i++) {
      var id = productIdFromHref(anchors[i].getAttribute('href') || '');
      if (id) out.push({ a: anchors[i], id: id });
    }
    return out;
  }

  function uniqueIds(visibleOnly) {
    var seen = {};
    var ids = [];
    var links = collectProductLinks();
    for (var i = 0; i < links.length; i++) {
      if (visibleOnly && hiddenIds[links[i].id]) continue;
      if (!seen[links[i].id]) {
        seen[links[i].id] = true;
        ids.push(links[i].id);
      }
    }
    return ids;
  }

  // --------------------------------------------------------------------- //
  // 复制历史（localStorage 持久化，跨页面保留）
  // --------------------------------------------------------------------- //
  var HISTORY_KEY = 'fantia-id-history-v1';
  var HISTORY_MAX = 500;
  var idHistory = null;

  function loadHistory() {
    if (idHistory) return idHistory;
    try {
      var raw = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      idHistory = Array.isArray(raw) ? raw : [];
    } catch (e) { idHistory = []; }
    return idHistory;
  }

  function saveHistory() {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(idHistory.slice(0, HISTORY_MAX)));
    } catch (e) { /* 隐私模式 / 容量不足时静默 */ }
  }

  function historyHas(id) {
    var h = loadHistory();
    for (var i = 0; i < h.length; i++) {
      if (h[i] && h[i].id === id) return true;
    }
    return false;
  }

  function recordIds(ids) {
    var h = loadHistory();
    var now = Date.now();
    var changed = false;
    for (var i = 0; i < ids.length; i++) {
      var id = String(ids[i] || '');
      if (!id) continue;
      for (var j = 0; j < h.length; j++) {
        if (h[j] && h[j].id === id) { h.splice(j, 1); break; }
      }
      h.unshift({ id: id, t: now });
      changed = true;
    }
    if (changed) {
      if (h.length > HISTORY_MAX) h.length = HISTORY_MAX;
      saveHistory();
      refreshBarStates();
      if (panelHost && panelHost.style.display !== 'none') renderHistory();
    }
  }

  function formatTime(t) {
    try {
      var d = new Date(t);
      var pad = function (n) { return (n < 10 ? '0' : '') + n; };
      return pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' +
        pad(d.getHours()) + ':' + pad(d.getMinutes());
    } catch (e) { return ''; }
  }

  // --------------------------------------------------------------------- //
  // 卡片定位：从商品链接向上找"含图片且有介绍文本"的最小祖先
  // --------------------------------------------------------------------- //
  // 注意：.card-thumbnail 只是缩略图包装，不能单独作为卡片特征——
  // Fantia 存在"外层 div 卡片 + 内部 <a> 只包缩略图"的布局，若认它就会把
  // ID 条插进缩略图链接里（位于介绍上方）。卡片必须有介绍文本或 .card-body。
  function productIdsIn(el) {
    var found = {};
    var anchors = el.querySelectorAll ? el.querySelectorAll('a[href*="/products/"]') : [];
    for (var i = 0; i < anchors.length; i++) {
      var id = productIdFromHref(anchors[i].getAttribute('href') || '');
      if (id) found[id] = true;
    }
    return found;
  }

  function resolveCard(anchor) {
    var el = anchor;
    var lastSingle = anchor;
    for (var depth = 0; depth < 8 && el && el !== document.body; depth++) {
      if (el.querySelector) {
        var ids = productIdsIn(el);
        var count = 0;
        for (var k in ids) count++;
        // 一旦跨到包含多个商品的容器就停，避免把网格当成一张卡片
        if (count > 1) break;
        lastSingle = el;
        var hasImg = !!el.querySelector('img');
        var hasBody = !!el.querySelector('.card-body');
        var text = (el.textContent || '').replace(/\s+/g, '');
        // 含图片与介绍文本的最小祖先即为卡片；长简介不再被长度上限误判
        if (hasBody || (hasImg && text.length > 8)) return el;
      }
      el = el.parentElement;
    }
    return lastSingle || anchor.parentElement;
  }

  // --------------------------------------------------------------------- //
  // 注入 ID 条
  // --------------------------------------------------------------------- //
  function makeBar(id) {
    var bar = document.createElement('div');
    bar.className = 'fantia-id-bar';
    bar.setAttribute('data-fantia-product-id', id);
    clearHostBackground(bar);
    var root = attachShadowCss(bar, 'bar', BAR_CSS);

    var wrap = document.createElement('div');
    wrap.className = 'bar';

    var icon = document.createElement('span');
    icon.className = 'fid-icon';
    icon.innerHTML = ICON_LINK;

    var label = document.createElement('span');
    label.className = 'fid-label';
    label.textContent = '商品 ID';

    var num = document.createElement('span');
    num.className = 'fid-num';
    num.textContent = id;
    num.title = '双击可整段选中，手动复制';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'fantia-id-btn';
    btn.setAttribute('aria-label', '复制商品 ID');
    btn.innerHTML = ICON_CLIP + '<span class="btn-text">复制</span>';

    btn.addEventListener('click', function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      // 徽标/数字可能在 SPA 复用卡片时更新，复制时以条上的当前 ID 为准
      var current = bar.getAttribute('data-fantia-product-id') || '';
      if (!current) return;
      copyText(current).then(function (ok) {
        flashButton(btn, ok, bar);
        if (ok) {
          recordIds([current]);
          toast('已复制商品 ID：' + current, false);
        } else {
          toast('复制失败，请双击数字手动复制', true);
        }
      });
    });

    // 已复制过的卡片：按钮持久显示「已复制」；悬停临时恢复「复制」便于重拷
    btn.addEventListener('mouseenter', function () {
      if (btn.__fidTimer) return;
      if (btn.classList.contains('done')) {
        btn.classList.remove('done');
        btn.innerHTML = ICON_CLIP + '<span class="btn-text">复制</span>';
      }
    });
    btn.addEventListener('mouseleave', function () {
      if (btn.__fidTimer) return;
      applyBtnState(btn, bar.getAttribute('data-fantia-product-id') || '');
    });

    // 卡片整体常是 <a>（Fantia 现行布局）：条内任何点击都不应触发卡片跳转
    wrap.addEventListener('click', function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
    });
    wrap.addEventListener('dragstart', function (ev) {
      ev.preventDefault();
    });

    wrap.appendChild(icon);
    wrap.appendChild(label);
    wrap.appendChild(num);
    wrap.appendChild(btn);
    root.appendChild(wrap);
    applyBtnState(btn, id);
    return bar;
  }

  // 按钮按历史状态渲染：已复制过的显示「已复制」，否则显示「复制」
  function applyBtnState(btn, id) {
    if (btn.__fidTimer) return;
    var done = id && historyHas(id);
    btn.classList.toggle('done', !!done);
    btn.innerHTML = (done ? ICON_CHECK : ICON_CLIP) +
      '<span class="btn-text">' + (done ? '已复制' : '复制') + '</span>';
  }

  function refreshBarStates() {
    var bars = document.querySelectorAll('.fantia-id-bar');
    for (var i = 0; i < bars.length; i++) {
      var id = bars[i].getAttribute('data-fantia-product-id') || '';
      var btn = bars[i].shadowRoot && bars[i].shadowRoot.querySelector('.fantia-id-btn');
      if (id && btn) applyBtnState(btn, id);
    }
  }

  function flashButton(btn, ok, bar) {
    if (btn.__fidTimer) clearTimeout(btn.__fidTimer);
    btn.disabled = true;                                // 防止连点重复写剪贴板
    btn.classList.remove('ok', 'err', 'done');
    btn.classList.add(ok ? 'ok' : 'err');
    btn.innerHTML = (ok ? ICON_CHECK : ICON_ALERT) +
      '<span class="btn-text">' + (ok ? '已复制' : '失败') + '</span>';
    btn.__fidTimer = setTimeout(function () {
      btn.disabled = false;
      btn.classList.remove('ok', 'err');
      btn.__fidTimer = null;
      applyBtnState(btn, bar ? (bar.getAttribute('data-fantia-product-id') || '') : '');
    }, 1500);
  }

  function updateBar(bar, id) {
    bar.setAttribute('data-fantia-product-id', id);
    var root = bar.shadowRoot;
    if (!root) return;
    var num = root.querySelector('.fid-num');
    if (num && num.textContent !== id) num.textContent = id;
    var btn = root.querySelector('.fantia-id-btn');
    if (btn) applyBtnState(btn, id);
  }

  function scan() {
    syncPageMode();
    if (!shouldRun()) {
      cleanupInfiniteScroll(); // SPA 跳进详情页时把无限滚动一并收走
      closePanel();
      removeFilterBar();       // SPA 跳进详情页时把筛选框一并收走
      updateFab();             // SPA 跳进详情页时把悬浮按钮收走
      return;
    }
    injectCss();
    syncTheme();
    widenLayout();             // 宽屏网格/侧栏重排（运行时结构识别）
    ensureFilterBar();
    setupInfiniteScroll();     // 有下一页时启用自动加载
    var links = collectProductLinks();
    var added = 0;
    for (var i = 0; i < links.length; i++) {
      var card = resolveCard(links[i].a);
      if (!card) continue;

      // 卡片内只有一个商品时以它为准；SPA 复用 DOM 后条上的旧 ID 会被纠正
      var ids = productIdsIn(card);
      var canonical = links[i].id;
      for (var k in ids) { canonical = k; break; }

      var bar = card.__fidBar;
      if (bar && bar.parentNode !== card) bar = null;
      if (!bar && card.querySelector) bar = card.querySelector('.fantia-id-bar');

      if (bar) {
        if (bar.getAttribute('data-fantia-product-id') !== canonical) updateBar(bar, canonical);
        card.__fidBar = bar;
        continue;
      }

      bar = makeBar(canonical);
      card.appendChild(bar);
      card.__fidBar = bar;
      added++;
    }
    if (added) dbg('本轮新注入 ' + added + ' 个 ID 条，累计商品 ' + uniqueIds().length + ' 个');
    if (filterQuery) applyFilter();   // SPA/分页新渲染的卡片也要套用当前筛选
    updateFab();
    updateFilterCount();              // 无限滚动追加后保持计数最新
  }

  // --------------------------------------------------------------------- //
  // 剪贴板 / Toast / 悬浮按钮
  // --------------------------------------------------------------------- //
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () { return true; },
                                                      function () { return legacyCopy(text); });
    }
    return Promise.resolve(legacyCopy(text));
  }

  function legacyCopy(text) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '0';
      ta.style.left = '0';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch (e) {
      dbg('legacyCopy 失败: ' + e);
      return false;
    }
  }

  var toastTimer = null;
  function toast(msg, isErr) {
    var old = document.querySelector('.fantia-toast');
    if (old) old.remove();
    if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; }
    var el = document.createElement('div');
    el.className = 'fantia-toast' + (isErr ? ' err' : '');
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    clearHostBackground(el);
    var root = attachShadowCss(el, 'toast', TOAST_CSS);
    var panel = document.createElement('div');
    panel.className = 'panel' + (isErr ? ' err' : '');
    var icon = document.createElement('span');
    icon.className = 'toast-icon';
    icon.innerHTML = isErr ? ICON_ALERT : ICON_CHECK;
    var text = document.createElement('span');
    text.className = 'toast-text';
    text.textContent = msg;
    panel.appendChild(icon);
    panel.appendChild(text);
    root.appendChild(panel);
    document.body.appendChild(el);
    toastTimer = setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
      toastTimer = null;
    }, 1800);
  }

  var fab = null;
  var fabBadge = null;
  function ensureFab() {
    if (fab) return;
    fab = document.createElement('div');
    fab.className = 'fantia-fab';
    fab.title = '商品 ID 面板';
    clearHostBackground(fab);
    var root = attachShadowCss(fab, 'fab', FAB_CSS);

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'fab';
    btn.setAttribute('aria-label', '打开商品 ID 面板');
    btn.innerHTML = ICON_STACK;
    fabBadge = document.createElement('span');
    fabBadge.className = 'fab-badge';
    fabBadge.textContent = '0';
    btn.appendChild(fabBadge);

    btn.addEventListener('click', function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      togglePanel();
    });

    root.appendChild(btn);
    document.body.appendChild(fab);
  }

  function updateFab() {
    if (!shouldRun()) {
      if (fab && fab.parentNode) fab.parentNode.removeChild(fab);
      fab = null;
      fabBadge = null;
      return;
    }
    ensureFab();
    var n = uniqueIds(!!filterQuery).length;
    // 值不变时不要写 textContent：否则会触发 MutationObserver，形成 400ms 空转扫描
    if (fabBadge && fabBadge.textContent !== String(n)) fabBadge.textContent = String(n);
    var display = n ? 'flex' : 'none';
    if (fab && fab.style.display !== display) fab.style.display = display;
  }

  // --------------------------------------------------------------------- //
  // 悬浮面板：复制本页全部 + 复制历史（查看 / 再复制 / 清空）
  // --------------------------------------------------------------------- //
  var panelHost = null;
  var panelCopyAllBtn = null;
  var panelHistHead = null;
  var panelHistList = null;
  var panelHistClear = null;
  var panelDarkSwitch = null;

  // --------------------------------------------------------------------- //
  // 页面黑暗模式：html.fid-site-dark 开关，偏好 localStorage 记忆
  // --------------------------------------------------------------------- //
  var SITE_DARK_KEY = 'fantia-id-sitedark';
  var siteDark = null;   // 惰性读取；null 表示尚未从 localStorage 加载

  function loadSiteDark() {
    if (siteDark === null) {
      try { siteDark = localStorage.getItem(SITE_DARK_KEY) === '1'; }
      catch (e) { siteDark = false; }   // 隐私模式等场景下默认浅色
    }
    return siteDark;
  }

  function applySiteDark() {
    try {
      document.documentElement.classList.toggle('fid-site-dark', loadSiteDark());
    } catch (e) { /* 不阻断主流程 */ }
    if (panelDarkSwitch) panelDarkSwitch.classList.toggle('on', loadSiteDark());
  }

  function toggleSiteDark() {
    siteDark = !loadSiteDark();
    try { localStorage.setItem(SITE_DARK_KEY, siteDark ? '1' : '0'); } catch (e) { /* 静默 */ }
    applySiteDark();
    syncTheme();   // color-scheme 变了，脚本自身 UI 立即跟随明暗
  }

  function copyAllVisible() {
    var ids = uniqueIds(!!filterQuery);
    if (!ids.length) {
      toast(filterQuery ? '筛选结果里没有商品' : '本页没有识别到商品', true);
      return;
    }
    copyText(ids.join('\n')).then(function (ok) {
      if (ok) {
        recordIds(ids);
        toast('已复制 ' + ids.length + ' 个商品 ID' + (filterQuery ? '（筛选后）' : ''));
      } else {
        toast('复制失败', true);
      }
    });
  }

  function buildPanel() {
    if (panelHost) return;
    panelHost = document.createElement('div');
    panelHost.className = 'fantia-panel';
    clearHostBackground(panelHost);
    var root = attachShadowCss(panelHost, 'panel', PANEL_CSS);

    var panel = document.createElement('div');
    panel.className = 'panel';

    var title = document.createElement('div');
    title.className = 'panel-title';
    title.innerHTML = ICON_HISTORY + '<span>商品 ID 面板</span>';

    panelCopyAllBtn = document.createElement('button');
    panelCopyAllBtn.type = 'button';
    panelCopyAllBtn.className = 'copy-all';
    panelCopyAllBtn.innerHTML = ICON_STACK + '<span>复制本页全部</span>';
    panelCopyAllBtn.addEventListener('click', function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      copyAllVisible();
    });

    var darkRow = document.createElement('div');
    darkRow.className = 'dark-row';
    darkRow.innerHTML = ICON_MOON + '<span>页面黑暗模式</span>';
    panelDarkSwitch = document.createElement('button');
    panelDarkSwitch.type = 'button';
    panelDarkSwitch.className = 'dark-switch';
    panelDarkSwitch.setAttribute('role', 'switch');
    panelDarkSwitch.setAttribute('aria-label', '切换页面黑暗模式');
    panelDarkSwitch.addEventListener('click', function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      toggleSiteDark();
    });
    darkRow.appendChild(panelDarkSwitch);

    panelHistHead = document.createElement('div');
    panelHistHead.className = 'hist-head';
    panelHistHead.innerHTML = '<span>最近复制</span>';
    panelHistClear = document.createElement('button');
    panelHistClear.type = 'button';
    panelHistClear.className = 'hist-clear';
    panelHistClear.innerHTML = ICON_TRASH + '<span>清空</span>';
    panelHistClear.addEventListener('click', function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      clearHistoryArm(this);
    });
    panelHistHead.appendChild(panelHistClear);

    panelHistList = document.createElement('div');
    panelHistList.className = 'hist-list';

    var foot = document.createElement('div');
    foot.className = 'panel-foot';
    foot.textContent = '点击条目再次复制该 ID；复制过的卡片会标记「已复制」';

    panel.appendChild(title);
    panel.appendChild(panelCopyAllBtn);
    panel.appendChild(darkRow);
    panel.appendChild(panelHistHead);
    panel.appendChild(panelHistList);
    panel.appendChild(foot);
    root.appendChild(panel);
    document.body.appendChild(panelHost);
    applySiteDark();   // 面板建好即同步开关状态与站点明暗

    // 点击面板外部关闭（面板/FAB 自身的点击已 stopPropagation）
    document.addEventListener('click', function (ev) {
      if (panelHost && panelHost.style.display !== 'none' &&
          !panelHost.contains(ev.target) && !(fab && fab.contains(ev.target))) {
        closePanel();
      }
    });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') closePanel();
    });
  }

  function renderHistory() {
    if (!panelHistList) return;
    var h = loadHistory();
    var head = panelHistHead.firstChild;
    if (head && head.textContent !== '最近复制 · ' + h.length) {
      head.textContent = '最近复制 · ' + h.length;
    }
    panelHistClear.classList.toggle('on', h.length > 0);
    if (!h.length) {
      panelHistList.innerHTML = '<div class="hist-empty">暂无复制记录</div>';
      return;
    }
    panelHistList.innerHTML = '';
    for (var i = 0; i < h.length && i < 50; i++) {
      (function (entry) {
        var item = document.createElement('div');
        item.className = 'hist-item';
        item.title = '点击复制 ' + entry.id;
        var idEl = document.createElement('span');
        idEl.className = 'hist-id';
        idEl.textContent = entry.id;
        var timeEl = document.createElement('span');
        timeEl.className = 'hist-time';
        timeEl.textContent = formatTime(entry.t);
        var cp = document.createElement('button');
        cp.type = 'button';
        cp.className = 'hist-copy';
        cp.setAttribute('aria-label', '复制 ' + entry.id);
        cp.innerHTML = ICON_CLIP;   // 点击事件冒泡给条目，统一处理
        cp.setAttribute('tabindex', '-1');
        item.appendChild(idEl);
        item.appendChild(timeEl);
        item.appendChild(cp);
        item.addEventListener('click', function (ev) {
          ev.preventDefault();
          ev.stopPropagation();
          copyText(entry.id).then(function (ok) {
            if (ok) {
              recordIds([entry.id]);
              toast('已复制商品 ID：' + entry.id);
            } else {
              toast('复制失败', true);
            }
          });
        });
        panelHistList.appendChild(item);
      })(h[i]);
    }
  }

  function togglePanel() {
    if (!panelHost || panelHost.style.display === 'none') openPanel();
    else closePanel();
  }

  function openPanel() {
    buildPanel();
    var n = uniqueIds(!!filterQuery).length;
    var label = panelCopyAllBtn.querySelector('span');
    if (label) label.textContent = '复制本页全部（' + n + '）';
    renderHistory();
    panelHost.style.display = 'block';
  }

  function closePanel() {
    if (panelHost && panelHost.style.display !== 'none') panelHost.style.display = 'none';
    if (panelHistClear) disarmClear();
  }

  // 清空历史按钮的两段式确认：第一次点变「确认清空？」，3 秒内再点才执行
  var clearTimer = null;
  function disarmClear() {
    if (clearTimer) { clearTimeout(clearTimer); clearTimer = null; }
    if (panelHistClear) {
      panelHistClear.classList.remove('arm');
      panelHistClear.innerHTML = ICON_TRASH + '<span>清空</span>';
    }
  }

  function clearHistoryArm(btn) {
    if (!btn.classList.contains('arm')) {
      btn.classList.add('arm');
      btn.innerHTML = '<span>确认清空？</span>';
      if (clearTimer) clearTimeout(clearTimer);
      clearTimer = setTimeout(disarmClear, 3000);
      return;
    }
    disarmClear();
    idHistory = [];
    saveHistory();
    renderHistory();
    refreshBarStates();
    toast('已清空复制历史');
  }

  // --------------------------------------------------------------------- //
  // 页首筛选框：按商品 ID / 标题关键词实时过滤本页卡片
  // --------------------------------------------------------------------- //
  var filterHost = null;
  var filterInput = null;
  var filterCount = null;
  var filterQuery = '';
  var hiddenIds = {};
  var filterDebounce = null;

  function filterAnchor() {
    // 优先插到宽屏重排的「侧栏+内容」行之前，其次网格，再退回内容包一层
    var anchor = document.querySelector('[data-fid-split]') ||
                 document.querySelector('[data-fid-grid]');
    if (anchor) return anchor;
    var container = document.querySelector('#main > .container') ||
                    document.querySelector('#main');
    return container || null;
  }

  function removeFilterBar() {
    if (filterHost && filterHost.parentNode) filterHost.parentNode.removeChild(filterHost);
    filterHost = null;
    filterInput = null;
    filterCount = null;
    filterQuery = '';
    hiddenIds = {};
  }

  function ensureFilterBar() {
    var anchor = filterAnchor();
    if (!anchor) return;
    if (filterHost && filterHost.isConnected) {
      if (filterHost.nextElementSibling !== anchor) {
        anchor.parentNode.insertBefore(filterHost, anchor);
      }
      return;
    }
    filterHost = document.createElement('div');
    filterHost.className = 'fantia-filter-bar';
    clearHostBackground(filterHost);
    var root = attachShadowCss(filterHost, 'filter', FILTER_CSS);

    var bar = document.createElement('div');
    bar.className = 'filterbar';

    var icon = document.createElement('span');
    icon.className = 'fid-search-icon';
    icon.innerHTML = ICON_SEARCH;

    filterInput = document.createElement('input');
    filterInput.type = 'text';
    filterInput.className = 'filter-input';
    filterInput.placeholder = '筛选本页商品：输入 ID 或标题关键词';
    filterInput.setAttribute('aria-label', '筛选本页商品');

    filterCount = document.createElement('span');
    filterCount.className = 'filter-count';

    var clear = document.createElement('button');
    clear.type = 'button';
    clear.className = 'filter-clear';
    clear.setAttribute('aria-label', '清空筛选');
    clear.innerHTML = ICON_X;
    clear.addEventListener('click', function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      clearFilter();
    });

    filterInput.addEventListener('input', function () {
      if (filterDebounce) clearTimeout(filterDebounce);
      filterDebounce = setTimeout(function () {
        filterDebounce = null;
        applyFilterFromInput();
      }, 150);
    });
    filterInput.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') {
        ev.preventDefault();
        clearFilter();
      }
    });

    bar.appendChild(icon);
    bar.appendChild(filterInput);
    bar.appendChild(filterCount);
    bar.appendChild(clear);
    root.appendChild(bar);
    anchor.parentNode.insertBefore(filterHost, anchor);

    if (filterQuery) {
      filterInput.value = filterQuery;
      applyFilter();
    }
    updateFilterCount();
  }

  function applyFilterFromInput() {
    filterQuery = (filterInput.value || '').trim().toLowerCase();
    applyFilter();
    updateFab();
  }

  function clearFilter() {
    if (filterInput) filterInput.value = '';
    filterQuery = '';
    applyFilter();
    updateFab();
  }

  function applyFilter() {
    var bars = document.querySelectorAll('.fantia-id-bar');
    hiddenIds = {};
    var visible = 0;
    for (var i = 0; i < bars.length; i++) {
      var bar = bars[i];
      var card = bar.parentNode;
      if (!card) continue;
      var id = bar.getAttribute('data-fantia-product-id') || '';
      var text = (card.textContent || '').toLowerCase();
      var match = !filterQuery || id.indexOf(filterQuery) >= 0 || text.indexOf(filterQuery) >= 0;
      var display = match ? '' : 'none';
      if (card.style.display !== display) card.style.display = display;
      if (match) { visible++; } else if (id) { hiddenIds[id] = true; }
    }
    updateFilterCount(visible);
  }

  function updateFilterCount(visible) {
    if (!filterCount) return;
    var total = document.querySelectorAll('.fantia-id-bar').length;
    if (typeof visible !== 'number') {
      visible = 0;
      var bars = document.querySelectorAll('.fantia-id-bar');
      for (var i = 0; i < bars.length; i++) {
        if (bars[i].parentNode && bars[i].parentNode.style.display !== 'none') visible++;
      }
    }
    var text = filterQuery ? (visible + ' / ' + total) : (total ? total + ' 个商品' : '');
    if (filterCount.textContent !== text) filterCount.textContent = text;
    if (filterInput) {
      var bar = filterInput.parentNode;
      if (bar) bar.classList.toggle('has-query', !!filterQuery);
    }
  }

  // --------------------------------------------------------------------- //
  // 宽屏布局：运行时识别「网格行」与「侧栏+内容」结构并打标记
  // --------------------------------------------------------------------- //
  // 网格 = 直接子元素里 >=2 个含商品卡片的 .row（Bootstrap col-* 布局），
  // 侧栏 = 网格外层再包一层的兄弟列（不含商品链接）。识别不到保持原样。
  function widenLayout() {
    var links = collectProductLinks();
    if (!links.length) return;
    var tagged = new Set();   // 元素去重必须用 Set：普通对象会把所有元素并成同一个键
    for (var i = 0; i < links.length; i++) {
      var card = resolveCard(links[i].a);
      if (!card) continue;
      var el = card.parentElement;
      for (var depth = 0; depth < 6 && el && el !== document.body; depth++) {
        if (tagged.has(el)) break;
        if (el.classList && el.classList.contains('row')) {
          var cols = el.querySelectorAll(':scope > [class*="col-"]');
          var cardCols = 0;
          for (var c = 0; c < cols.length; c++) {
            var n = 0;
            var ids = productIdsIn(cols[c]);
            for (var k in ids) n++;
            if (n > 0) cardCols++;
          }
          if (cardCols >= 2) {
            el.setAttribute('data-fid-grid', '1');
            tagged.add(el);
            markSplit(el);
            break;
          }
        }
        el = el.parentElement;
      }
    }
  }

  function markSplit(grid) {
    // 两层候选：contentWrap（网格的父层）与其父级 .row
    var wrap = grid.parentElement;
    if (!wrap) return;
    var row = wrap.parentElement;
    if (!row || !row.classList || !row.classList.contains('row') || row.children.length !== 2) return;
    var other = row.children[0] === wrap ? row.children[1] : row.children[0];
    if (!other || other.querySelector('a[href*="/products/"]')) return; // 兄弟列也含商品就不是侧栏
    row.setAttribute('data-fid-split', '1');
    other.setAttribute('data-fid-side', '1');
    wrap.setAttribute('data-fid-main', '1');
  }

  // --------------------------------------------------------------------- //
  // 无限滚动：有「下一页」的分页列表，滚近底部时自动抓取并追加卡片
  // --------------------------------------------------------------------- //
  // 仅当宽屏网格已识别（data-fid-grid）且分页里有下一页链接时启用；
  // 追加后复用 scan 注入 ID 条，加载失败或无更多页时自动停用。
  var inf = { url: null, loading: false, page: 1, observer: null, sentinel: null, lastUrl: null };

  function paginationNextUrl(root) {
    var a = (root || document).querySelector(
      '.pagination li.next a[href], .pagination .next a[href], a[rel="next"]');
    if (!a) return null;
    var href = a.getAttribute('href');
    if (!href || href === '#') return null;
    try { return new URL(href, location.href).href; } catch (e) { return null; }
  }

  // 在解析出的下一页文档里找商品网格行（与 widenLayout 同一结构判定：
  // 直接子列中 >=2 个含商品链接的 .row，取命中列数最多的一层）
  function findGridRowIn(doc) {
    var rows = doc.querySelectorAll('.row');
    var best = null;
    var bestN = 0;
    for (var i = 0; i < rows.length; i++) {
      var cols = rows[i].querySelectorAll(':scope > [class*="col-"]');
      var n = 0;
      for (var c = 0; c < cols.length; c++) {
        if (cols[c].querySelector('a[href*="/products/"]')) n++;
      }
      if (n >= 2 && n > bestN) { best = rows[i]; bestN = n; }
    }
    return best;
  }

  function cleanupInfiniteScroll() {
    if (inf.observer) { inf.observer.disconnect(); inf.observer = null; }
    if (inf.sentinel && inf.sentinel.parentNode) inf.sentinel.parentNode.removeChild(inf.sentinel);
    inf.sentinel = null;
    inf.url = null;
    inf.loading = false;
    inf.page = 1;
    inf.lastUrl = null;
  }

  function setupInfiniteScroll() {
    // SPA 跳转：URL 变了就重置状态，从新页面的分页重新出发
    if (inf.lastUrl && inf.lastUrl !== location.href) cleanupInfiniteScroll();
    if (inf.observer) return;                      // 本页已就绪
    var grid = document.querySelector('[data-fid-grid]');
    var next = paginationNextUrl(document);
    if (!grid || !next || typeof IntersectionObserver === 'undefined') return;

    inf.lastUrl = location.href;
    inf.url = next;
    inf.page = 1;
    inf.sentinel = document.createElement('div');
    inf.sentinel.style.cssText = 'height:1px;flex:none;';
    grid.parentNode.insertBefore(inf.sentinel, grid.nextSibling);

    inf.observer = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) { loadNextPage(); break; }
      }
    }, { rootMargin: '1000px 0px' });   // 提前 1000px 预载，滚动无感
    inf.observer.observe(inf.sentinel);
    dbg('无限滚动已启用，下一页：' + next);
  }

  function loadNextPage() {
    if (!inf.url || inf.loading) return;
    var grid = document.querySelector('[data-fid-grid]');
    if (!grid) return;
    var url = inf.url;
    inf.url = null;          // 取走即清空：失败/重复触发都不会重复抓这一页
    inf.loading = true;
    fetch(url, { credentials: 'same-origin' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.text();
      })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var row = findGridRowIn(doc);
        if (!row) throw new Error('下一页找不到商品网格');
        var cols = row.querySelectorAll(':scope > [class*="col-"]');
        var added = 0;
        for (var i = 0; i < cols.length; i++) {
          grid.appendChild(document.importNode(cols[i], true));
          added++;
        }
        inf.page++;
        inf.url = paginationNextUrl(doc);   // 以下一页的分页接龙
        dbg('无限滚动：追加第 ' + inf.page + ' 页（' + added + ' 卡片），下一页=' + inf.url);
        scan();                             // 新卡片立即注入 ID 条/套用筛选
        if (!inf.url && inf.observer && inf.sentinel) inf.observer.unobserve(inf.sentinel);
      })
      .catch(function (e) {
        dbg('无限滚动停止：' + e.message);   // 失败即停，分页链接仍可手动翻页
        if (inf.observer && inf.sentinel) inf.observer.unobserve(inf.sentinel);
      })
      .then(function () { inf.loading = false; });
  }

  // --------------------------------------------------------------------- //
  // 启动：首扫 + 轮询兜底 + MutationObserver + SPA 跳转
  // --------------------------------------------------------------------- //
  function boot() {
    applySiteDark();   // 先于首扫恢复黑暗模式，避免页面加载闪白
    syncTheme();
    syncPageMode();
    watchTheme();
    injectCss();
    scan();

    var scanTimer = null;
    function scheduleScan() {
      if (scanTimer) return;
      scanTimer = setTimeout(function () {
        scanTimer = null;
        scan();
      }, 400);
    }

    var mo = new MutationObserver(scheduleScan);
    if (document.body) {
      mo.observe(document.body, { childList: true, subtree: true });
    } else {
      document.addEventListener('DOMContentLoaded', function () {
        mo.observe(document.body, { childList: true, subtree: true });
      });
    }

    setInterval(scan, 1500);  // 轮询兜底：覆盖懒加载/分页/框架替换

    window.addEventListener('popstate', function () { setTimeout(scan, 300); });
    document.addEventListener('turbo:load', scan);        // Turbo
    document.addEventListener('page:load', scan);         // Turbolinks 4
    dbg('已启动，当前页面生效=' + shouldRun());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
