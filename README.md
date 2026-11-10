# xianyu 个人博客

基于 **VitePress 1.6.4 + Vue 3 + ES Module** 的中文静态博客，使用 npm 管理依赖，面向 GitHub Pages 部署。

## 本地启动

需要 Node.js 22 或更高版本（CI 使用 Node.js 22）。在仓库根目录执行：

```bash
npm ci
npm run dev
```

打开终端输出的地址（当前配置为 `http://127.0.0.1:5184`）。首次没有锁文件时才使用 `npm install`。

```bash
npm run build     # 构建并检查内部死链
npm run preview   # 预览构建产物，默认 4173 端口
```

## 从哪里开始修改

| 需求 | 文件 |
| --- | --- |
| 站名、描述、导航、GitHub 地址 | `docs/.vitepress/config.js` |
| 首页文章区 | `docs/.vitepress/theme/components/BlogHome.vue` |
| 首页静态三维场景 | `docs/.vitepress/theme/components/StaticWritingRoom.vue` |
| 最终打字机模型 | `docs/public/models/typewriter-cream.glb` |
| 内页翻飞纸页动画 | `docs/.vitepress/theme/components/FlyingPapers.vue` |
| 手稿主题配色与字体 | `docs/.vitepress/theme/manuscript.css` |
| 配色、字体、响应式样式 | `docs/.vitepress/theme/style.css` |
| 关于自己 | `docs/about.md` |
| 新增文章 | `docs/posts/英文短名.md` |

文章会自动出现在首页与文章列表，按日期倒序排列；分类从文章元数据自动生成。支持本地全文搜索、分类筛选、代码高亮、文章目录与浅色/深色切换。

当前包含 3 篇明确标注的示例文章。发布前请替换示例内容、站名、简介和个人链接。

首页采用最终奶油色打字机 GLB，静态展示 MY DIARY、自然光和接触阴影。MY DIARY 进入文章索引。首页模型加载失败时显示静态预览图。

动画实验入口为 `/typewriter-demo/index.html`，说明见 [演示说明](project-docs/TYPEWRITER_DEMO.md)。建模脚本、Blender 源文件、纹理和验证记录集中保存在 `typewriter_cream_v5_package/`，网页共用 `docs/public/models/typewriter-cream.glb`。

文章列表、文章正文和关于页通过共享布局添加小型打字机页眉，以及宽屏页边的纸张、回形针与墨迹装饰。装饰不响应点击，窄屏隐藏页边装饰，减少动态效果时停用动画。

全站字体由 `manuscript.css` 的 `--blog-font-manuscript` 统一配置：英文优先使用 Courier New，中文回退到宋体；导航、搜索、文章和表单保持同一手稿风格。代码采用对应的等宽字体栈。这是相似风格的系统字体组合。

## 项目文档

- [项目规范](project-docs/PROJECT_SPEC.md)
- [项目约束](project-docs/CONSTRAINTS.md)
- [项目结构速览](project-docs/STRUCTURE.md)
- [部署说明](project-docs/DEPLOYMENT.md)
- Trae 项目规则：`.trae/rules/project_rules.md`

## 部署

博客采用三个仓库分工：

| 仓库 | 用途 |
| --- | --- |
| [blog](https://github.com/yuyuxianxian74-debug/blog) | 保存博客源代码和 Markdown 内容。 |
| [blog_pages](https://github.com/yuyuxianxian74-debug/blog_pages) | 保存构建后的静态文件，供 GitHub Pages 发布。 |
| [blog_images](https://github.com/yuyuxianxian74-debug/blog_images) | 图床，存放需要通过链接引用的图片。 |

线上地址：[xianyu 的博客](https://yuyuxianxian74-debug.github.io/blog_pages/)。发布仓库的 Pages 设置为 **Deploy from a branch → main → /(root)**。

### 更新博客

1. 在源码仓库中修改文章或页面，并检查内容。
2. 在 PowerShell 中从源码仓库根目录执行以下命令，按发布地址的子路径构建：

   ```powershell
   $env:SITE_BASE = '/blog_pages/'
   npm run build
   Remove-Item Env:SITE_BASE
   ```

3. 将 `docs/.vitepress/dist/` **内部内容**同步到本地 `blog_pages` 仓库根目录，保留根目录的 `.nojekyll` 文件。更新时检查并清理不再属于网站的旧构建文件，避免误删仓库中其他内容。
4. 分别检查、提交并推送 `blog` 和 `blog_pages` 的更改。在 `blog_pages` 的 Actions 页面确认部署成功，再访问线上地址检查效果。

目前源码仓库已有的 GitHub Actions 工作流是向源码仓库自身部署的方案，**不会自动将构建产物同步到 `blog_pages`**。图床是可选的：项目本身使用的静态资源也可以随网站一起发布。

