# Fantia 增强油猴脚本

内网自托管油猴脚本集合，直接在 Tampermonkey / Violentmonkey 里用链接安装。

## 安装

1. 浏览器装好 Tampermonkey（或 Violentmonkey）
2. 打开安装地址，点「安装」：

```
http://192.168.2.210:3100/akinxkk/fantia-userscripts/raw/branch/main/fantia-product-search-enhancer.user.js
```

## 脚本清单

### `fantia-product-search-enhancer.user.js` · Fantia 商品搜索增强（v1.0.0）

- 商品搜索/列表页：每张商品卡片的图片与介绍下方注入 `商品 ID <数字>` + 「复制」按钮，一键复制链接尾部数字
- 右下角悬浮按钮：徽标显示本页去重商品数，点击复制全部 ID（换行分隔，可直接喂 FantiaProducts 刮削器）
- 不绑定固定 class，按 DOM 结构识别卡片；兼容整卡可点与「外层 div + 内链只包缩略图」两种布局
- MutationObserver + 轮询兜底，覆盖分页/无限滚动/SPA 跳转；商品详情页与帖子页自动跳过
- 剪贴板 clipboard API 失败时自动降级 execCommand

## 自动更新

脚本头部已配置 `@updateURL` / `@downloadURL` 指向本仓库 raw 地址，
Tampermonkey 会按版本号自动检查更新（需内网或 WireGuard 可达 `192.168.2.210:3100`）。

## 环境

- Gitea：`http://192.168.2.210:3100`（NAS 192.168.2.210，容器 gitea）
- 仅内网 / WireGuard 可达，公网请自行反代
