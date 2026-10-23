# Fantia

托管在 GitHub 的油猴脚本，直接在 ScriptCat / Tampermonkey / Violentmonkey 里用链接安装。

## 安装

1. 浏览器装好 ScriptCat（或 Tampermonkey / Violentmonkey）
2. 打开安装地址，点「安装」：

```
https://raw.githubusercontent.com/GTX2090ti/fantia-userscripts/main/fantia-product-search-enhancer.user.js
```

仓库主页：https://github.com/GTX2090ti/fantia-userscripts

## 功能

| 页面 | 能力 |
| --- | --- |
| 商品搜索 / 商品列表 / Market / 排行 | 每张卡片注入商品 ID 复制条；悬浮面板复制本页全部 ID、查看复制历史 |
| 社团投稿列表 `/fanclubs/<id>/posts` | 每张投稿卡片注入**投稿 ID** 复制条（无链接的锁定卡按 `data-post_id` 兜底）；滚动近底部自动加载下一页投稿 |
| 社团商品页 / 投稿页顶部 | 增强搜索栏：按 ID / 标题实时筛选、FC 内嵌原生关键词搜索、詳細検索（标签 / 状态 / 类型 / 排序） |
| 全站 | 整站黑暗模式开关、毛玻璃浮层、宽屏多列网格、移动端抽屉 |

## 更新记录

- **v1.6.0**：投稿列表页支持投稿 ID 复制条与无限滚动（跨页去重、追加卡片补 lazyload 图片）；复制历史按商品 / 投稿分型标记。
- v1.5.6：投稿页同款增强栏、商品筛选支持标题并置顶。
- v1.5.3：修复 Market 错位与重复 ID 条，更新源切到 GitHub。
