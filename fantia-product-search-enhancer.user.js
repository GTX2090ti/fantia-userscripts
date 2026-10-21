// ==UserScript==
// @name         Fantia 商品搜索增强 · 商品 ID 快取
// @namespace    fantia.jp
// @version      1.0.0
// @description 在 Fantia 商品搜索/列表页，为每个商品卡片在图片与介绍下方注入商品 ID（链接尾部数字）和一键复制按钮，另提供悬浮按钮复制本页全部商品 ID。
// @author       小蓝
// @match        https://fantia.jp/fanclubs*
// @match        https://fantia.jp/products*
// @match        https://fantia.jp/market*
// @match        https://fantia.jp/ranking*
// @match        https://fantia.jp/search*
// @updateURL    http://192.168.2.210:3100/akinxkk/fantia-userscripts/raw/branch/main/fantia-product-search-enhancer.user.js
// @downloadURL  http://192.168.2.210:3100/akinxkk/fantia-userscripts/raw/branch/main/fantia-product-search-enhancer.user.js
// @grant        none
// @run-at       document-idle
// ==/UserScript==
/*
 * 功能
 * ----
 * 1. 商品 ID 条：扫描页面中所有指向 /products/<id> 的商品链接，定位其所属
 *    卡片（含图片 + 介绍文本的最小祖先元素），在卡片末尾（即图片与介绍
 *    下方）插入一条深色科技蓝的信息条：
 *        [链接图标] 商品 ID <数字>            [复制]
 *    - 数字使用等宽字形，双击可整段手动选择；
 *    - 点"复制"把纯数字 ID 写入剪贴板，按钮瞬时变为"已复制"并弹 Toast。
 * 2. 悬浮按钮：页面右下角常驻一个圆形按钮，徽标显示当前已识别的商品数量，
 *    点击一次性复制本页全部商品 ID（去重、换行分隔），方便批量喂给
 *    FantiaProducts 刮削器 / 下载工具。
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
  var ICON_LINK = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>';
  var ICON_STACK = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"></rect><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"></path></svg>';

  var CSS_TEXT = [
    '.fantia-id-bar{display:flex;align-items:center;gap:7px;margin:7px 0 0;padding:5px 8px;',
    'background:#0d192b;border:1px solid rgba(59,130,246,.35);border-radius:6px;',
    'font:12px/1.5 system-ui,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;',
    'color:#dbeafe;box-sizing:border-box;}',
    '.fantia-id-bar .fid-label{color:#7f9cc4;flex:none;}',
    '.fantia-id-bar .fid-icon{color:#60a5fa;flex:none;display:inline-flex;}',
    '.fantia-id-bar .fid-num{color:#93c5fd;font-weight:600;font-variant-numeric:tabular-nums;',
    'letter-spacing:.4px;user-select:all;-webkit-user-select:all;cursor:text;}',
    '.fantia-id-btn{margin-left:auto;flex:none;display:inline-flex;align-items:center;gap:4px;',
    'padding:3px 9px;background:rgba(59,130,246,.16);border:1px solid rgba(59,130,246,.45);',
    'border-radius:4px;color:#bfdbfe;font:12px/1.4 system-ui,"Segoe UI",Roboto,Arial,sans-serif;',
    'cursor:pointer;transition:background .15s,color .15s,border-color .15s;}',
    '.fantia-id-btn:hover{background:rgba(59,130,246,.32);color:#eff6ff;}',
    '.fantia-id-btn.ok{color:#86efac;border-color:rgba(34,197,94,.5);background:rgba(34,197,94,.14);}',
    '.fantia-id-btn.ok:hover{background:rgba(34,197,94,.24);}',
    '.fantia-fab{position:fixed;right:18px;bottom:18px;width:46px;height:46px;border-radius:50%;',
    'background:#0d192b;border:1px solid rgba(59,130,246,.5);color:#93c5fd;cursor:pointer;',
    'display:flex;align-items:center;justify-content:center;z-index:2147483000;padding:0;',
    'box-shadow:0 4px 18px rgba(2,8,20,.55);transition:background .15s,transform .15s;}',
    '.fantia-fab:hover{background:#152742;transform:translateY(-1px);}',
    '.fantia-fab .fab-badge{position:absolute;top:-5px;right:-5px;min-width:18px;height:18px;',
    'padding:0 5px;border-radius:9px;background:#3b82f6;color:#fff;font:600 11px/18px system-ui,Arial,sans-serif;',
    'text-align:center;box-sizing:border-box;}',
    '.fantia-toast{position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:2147483001;',
    'display:flex;align-items:center;gap:8px;padding:8px 15px;max-width:70vw;box-sizing:border-box;',
    'background:rgba(13,25,43,.96);border:1px solid rgba(59,130,246,.45);border-radius:8px;',
    'color:#dbeafe;font:13px/1.4 system-ui,"Segoe UI",Roboto,Arial,sans-serif;',
    'box-shadow:0 6px 24px rgba(2,8,20,.6);animation:fantia-toast-in .18s ease-out;}',
    '.fantia-toast .toast-icon{flex:none;display:inline-flex;color:#4ade80;}',
    '.fantia-toast.err .toast-icon{color:#f87171;}',
    '.fantia-toast .toast-text{word-break:break-all;}',
    '@keyframes fantia-toast-in{from{opacity:0;transform:translateX(-50%) translateY(-8px);}to{opacity:1;transform:translateX(-50%) translateY(0);}}'
  ].join('');

  function injectCss() {
    if (document.getElementById('fantia-id-style')) return;
    var st = document.createElement('style');
    st.id = 'fantia-id-style';
    st.textContent = CSS_TEXT;
    (document.head || document.documentElement).appendChild(st);
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

  function uniqueIds() {
    var seen = {};
    var ids = [];
    var links = collectProductLinks();
    for (var i = 0; i < links.length; i++) {
      if (!seen[links[i].id]) {
        seen[links[i].id] = true;
        ids.push(links[i].id);
      }
    }
    return ids;
  }

  // --------------------------------------------------------------------- //
  // 卡片定位：从商品链接向上找"含图片且有介绍文本"的最小祖先
  // --------------------------------------------------------------------- //
  // 注意：.card-thumbnail 只是缩略图包装，不能单独作为卡片特征——
  // Fantia 存在"外层 div 卡片 + 内部 <a> 只包缩略图"的布局，若认它就会把
  // ID 条插进缩略图链接里（位于介绍上方）。卡片必须有介绍文本或 .card-body。
  function resolveCard(anchor) {
    var el = anchor;
    for (var depth = 0; depth < 6 && el && el !== document.body; depth++) {
      if (el.querySelector) {
        var hasImg = !!el.querySelector('img');
        var hasBody = !!el.querySelector('.card-body');
        var text = (el.textContent || '').replace(/\s+/g, '');
        // 卡片特征：有介绍文本（或 .card-body）且含图；文本量上限避免把整个
        // 列表容器误判成卡片
        if ((hasBody || (hasImg && text.length > 8)) && text.length < 900) {
          return el;
        }
      }
      el = el.parentElement;
    }
    return anchor.closest ? (anchor.closest('div, li, article, section') || anchor.parentElement)
                          : anchor.parentElement;
  }

  // --------------------------------------------------------------------- //
  // 注入 ID 条
  // --------------------------------------------------------------------- //
  function makeBar(id) {
    var bar = document.createElement('div');
    bar.className = 'fantia-id-bar';
    bar.setAttribute('data-fantia-product-id', id);

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
    btn.innerHTML = ICON_CLIP + '<span class="btn-text">复制</span>';

    btn.addEventListener('click', function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      copyText(id).then(function (ok) {
        flashButton(btn, ok);
        if (ok) {
          toast('已复制商品 ID：' + id, false);
        } else {
          toast('复制失败，请双击数字手动复制', true);
        }
      });
    });

    // 卡片整体常是 <a>（Fantia 现行布局）：条内任何点击都不应触发卡片跳转
    bar.addEventListener('click', function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
    });

    bar.appendChild(icon);
    bar.appendChild(label);
    bar.appendChild(num);
    bar.appendChild(btn);
    return bar;
  }

  function flashButton(btn, ok) {
    var textSpan = btn.querySelector('.btn-text');
    if (ok) {
      btn.classList.add('ok');
      btn.innerHTML = ICON_CHECK + '<span class="btn-text">已复制</span>';
    } else {
      btn.classList.add('ok');
      if (textSpan) textSpan.textContent = '失败';
    }
    setTimeout(function () {
      btn.classList.remove('ok');
      btn.innerHTML = ICON_CLIP + '<span class="btn-text">复制</span>';
    }, 1500);
  }

  function scan() {
    if (!shouldRun()) return;
    injectCss();
    var links = collectProductLinks();
    var added = 0;
    for (var i = 0; i < links.length; i++) {
      var card = resolveCard(links[i].a);
      if (!card || card.__fantiaIdBar) continue;
      if (card.querySelector && card.querySelector('.fantia-id-bar')) {
        card.__fantiaIdBar = true;
        continue;
      }
      card.appendChild(makeBar(links[i].id));
      card.__fantiaIdBar = true;
      added++;
    }
    if (added) dbg('本轮新注入 ' + added + ' 个 ID 条，累计商品 ' + uniqueIds().length + ' 个');
    updateFab();
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
    var icon = document.createElement('span');
    icon.className = 'toast-icon';
    icon.innerHTML = isErr
      ? '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8v5"></path><path d="M12 17h.01"></path><circle cx="12" cy="12" r="10"></circle></svg>'
      : ICON_CHECK;
    var text = document.createElement('span');
    text.className = 'toast-text';
    text.textContent = msg;
    el.appendChild(icon);
    el.appendChild(text);
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
    fab = document.createElement('button');
    fab.type = 'button';
    fab.className = 'fantia-fab';
    fab.title = '复制本页全部商品 ID';
    fab.innerHTML = ICON_STACK;
    fabBadge = document.createElement('span');
    fabBadge.className = 'fab-badge';
    fabBadge.textContent = '0';
    fab.appendChild(fabBadge);
    fab.addEventListener('click', function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      var ids = uniqueIds();
      if (!ids.length) {
        toast('本页没有识别到商品', true);
        return;
      }
      copyText(ids.join('\n')).then(function (ok) {
        if (ok) {
          toast('已复制 ' + ids.length + ' 个商品 ID');
        } else {
          toast('复制失败', true);
        }
      });
    });
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
    var n = uniqueIds().length;
    if (fabBadge) fabBadge.textContent = String(n);
    if (fab) fab.style.display = n ? 'flex' : 'none';
  }

  // --------------------------------------------------------------------- //
  // 启动：首扫 + 轮询兜底 + MutationObserver + SPA 跳转
  // --------------------------------------------------------------------- //
  function boot() {
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
