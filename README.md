# HelloWorld-Sleep

一个「作品集 + 小游戏」合体的个人站。用纯 HTML / CSS / JavaScript 写成，托管在 GitHub Pages 上。主要给同行、招聘方，和爱鼓捣的人看。

## 技术栈

- 纯 HTML / CSS / JavaScript（无框架、无构建、无后端）
- 明暗主题：CSS 变量换色，首次跟随系统、之后用 `localStorage` 记住选择
- 响应式：flexbox / grid + 媒体查询，手机端收起为汉堡菜单
- 部署：GitHub Pages，`git push` 即上线

## 目录结构

```
index.html        首页：自我介绍 + 入口卡片
about.html        关于：极简，不写私人信息
projects.html     作品：目前是这个站本身
playground.html   小游戏入口
contact.html      联系：只留 GitHub
toys/            小游戏（数独 sudoku、寻机头 plane）
css/base.css      全局样式与设计令牌（明暗双主题）
js/site.js        主题切换 + 汉堡菜单（一份脚本服务所有页面）
过程说明.md        幕后：定位、选型、设计、与 AI 的协作、踩坑、取舍
```

## 本地预览

直接双击 `index.html` 即可；或起一个本地服务：

```bash
python -m http.server 8000
# 浏览器打开 http://localhost:8000
```

## 在线访问

- 网站地址：（部署 GitHub Pages 后补上）
- 仓库地址：（建仓后补上）

## 更多

这个站是怎么从想法走到上线的、和 AI 怎么协作、踩了哪些坑、对 AI 生成的代码做了哪些取舍——都写在 [过程说明.md](过程说明.md) 里。
