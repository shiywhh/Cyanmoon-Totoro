# Cyanmoon Totoro (青月龙猫)

![Nuxt](https://img.shields.io/badge/Nuxt-3.20-04C58E?style=flat-square&logo=nuxt.js)
![Vue](https://img.shields.io/badge/Vue-3.4-4FC08D?style=flat-square&logo=vue.js)
![Vuetify](https://img.shields.io/badge/Vuetify-3.4-1867C0?style=flat-square&logo=vuetify)
![AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-orange?style=flat-square)

<div align="center">青月龙猫 - 龙猫校园解决方案</div>

---

## 目录

- [简介](#简介)
- [功能特性](#功能特性)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [快速开始](#快速开始)
- [部署指南](#部署指南)
- [配置说明](#配置说明)
- [常见问题](#常见问题)
- [开发指南](#开发指南)
- [相关项目](#相关项目)
- [许可证](#许可证)

---

## 简介

**Cyanmoon Totoro** (青月龙猫) 是一个非官方的龙猫校园网页应用，用于简化高校体育跑步任务和早操签到操作。

> 龙猫校园是一款高校体育运动管理应用，需要学生完成规定的跑步里程和早操签到。本项目旨在提供更便捷的方式来管理这些任务。

### 警告

- 本项目仅供学习研究使用
- 请合理使用，确保按时完成真实的体育锻炼
- 使用本项目产生的任何后果由使用者自行承担

---

## 功能特性

### 1. 微信扫码登录
- 无需输入账号密码
- 通过微信扫码即可完成认证

### 2. 阳光跑 (Sun Run)
- 查看本学期跑步任务状态
- 支持多条跑步路线选择
- 可视化显示任务进度 (已完成/总次数)
- 随机路线选择功能

### 3. 自由跑 (Free Run)
- 自定义跑步参数：
  - 跑步距离 (0.5-10 km)
  - 平均速度
  - 跑步日期和时间
- 基于真实路线生成模拟跑步轨迹
- 实时显示跑步进度

### 4. 早操签到 (Morning Exercise)
- 查看签到时间和地点
- 支持多个签到点选择
- 一键随机选择签到点
- 签到状态实时更新

### 5. 批量补跑 (Bulk Run)
- 一键补齐学期内未完成的跑步
- 智能计算剩余需补跑次数
- 显示补跑进度条
- 支持分次补跑

---

## 技术栈

### 前端框架
- **Nuxt 3** - Vue.js 全栈框架
- **Vue 3** - 渐进式 JavaScript 框架
- **Vuetify 3** - Material Design 组件库

### UI/样式
- **UnoCSS** - 即时原子化 CSS 引擎
- **Material Design Icons** - 图标库

### 工具库
- **VueUse** - Vue Composition API 工具集
- **date-fns** - 日期处理库
- **Ky** - 基于 Fetch 的 HTTP 客户端
- **uuid** - UUID 生成

### 加密与安全
- **RSA 加密** - API 请求加密
- **MD5** - 消息摘要

### 构建工具
- **Vite** - 下一代前端构建工具
- **TypeScript** - JavaScript 超集

---

## 项目结构

```
Cyanmoon-Totoro/
├── components/                  # Vue 组件
│   ├── FreeRunDetail.vue           # 自由跑详情
│   ├── FreeRunExecution.vue         # 自由跑执行
│   └── FreeRunSetup.vue           # 自由跑设置
├── composables/                 # Vue Composables
│   ├── useFreeRun.ts             # 自由跑状态管理
│   ├── useFreeRunConfig.ts       # 自由跑配置
│   ├── useSession.ts             # 会话管理
│   ├── useSunRunPaper.ts         # 阳光跑数据
│   └── useTotoroApi.ts           # API 调用封装
├── pages/                       # 页面
│   ├── index.vue                 # 首页 (登录)
│   ├── freerun.vue              # 自由跑页面
│   ├── morning.vue              # 早操签到页面
│   ├── sunrun.vue               # 阳光跑页面
│   ├── sunrun-records.vue       # 批量补跑页面
│   └── run/                     # 跑步执行
│       └── [route].vue          # 跑步执行页面
├── server/                      # Nitro 服务端
│   ├── api/                     # API 路由
│   │   ├── login/              # 登录相关
│   │   ├── scanQr/            # 二维码扫描
│   │   ├── sunrun/             # 阳光跑 API
│   │   ├── sunRunPaper.post.ts
│   │   └── totoro/             # 代理到龙猫 API
│   └── utils/                  # 服务端工具
├── src/                         # 源代码
│   ├── classes/                 # 类文件
│   ├── controllers/            # 控制器
│   ├── data/                  # 静态数据
│   ├── middlewares/           # 中间件
│   ├── types/                 # TypeScript 类型
│   ├── utils/                # 工具函数
│   └── wrappers/              # API 封装
├── utils/                      # 工具函数
├── public/                     # 静态资源
├── plugins/                    # Nuxt 插件
├── nuxt.config.ts             # Nuxt 配置
├── package.json               # 依赖管理
└── LICENSE                    # 许可证
```

---

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm >= 9.0.0 或 pnpm >= 8.0.0

### 安装依赖

```bash
npm install
# 或使用 pnpm
pnpm install
```

### 开发模式

```bash
npm run dev
# 或
pnpm dev
```

访问 http://localhost:3000

### 构建生产版本

```bash
npm run build
# 或
pnpm build
```

### 启动生产服务器

```bash
npm start
# 或
pnpm start
```

---

## 部署指南

### 方式一：直接部署

1. 安装依赖：
```bash
npm install
```

2. 构建项目：
```bash
npm run build
```

3. 启动服务器：
```bash
npm start
```

4. 服务器会在 `http://localhost:3000` 启动

### 方式二：使用 PM2

```bash
# 安装 PM2
npm install -g pm2

# 启动应用
pm2 start .output/server/index.mjs --name cyanmoon-totoro

# 保存进程列表
pm2 save

# 设置开机自启
pm2 startup
```

### 方式三：Docker 部署

```bash
# 构建镜像
docker build -t cyanmoon-totoro .

# 运行容器
docker run -d -p 3000:3000 --name cyanmoon-totoro cyanmoon-totoro
```

或使用 docker-compose：

```bash
docker-compose up -d
```

### 方式四：Vercel 部署

```bash
# 安装 Vercel CLI
npm install -g vercel

# 部署
vercel
```

### Nginx 反向代理配置

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

---

## 配置说明

### 环境变量

创建 `.env` 文件：

```env
# API 代理地址 (可选)
NUXT_PUBLIC_API_BASE=https://app.xtotoro.com

# 端口 (可选，默认 3000)
PORT=3000
```

### Nuxt 配置

主要配置项在 `nuxt.config.ts`：

- `ssr: false` - SPA 模式
- `devtools: { enabled: false }` - 禁用开发工具 (生产环境)
- `routeRules` - 路由规则配置
- `vite` - Vite 构建配置

---

## 常见问题

### Q: 扫码登录失败怎么办？

A: 确保：
1. 微信已绑定龙猫校园账号
2. 二维码在有效期内 (120秒)
3. 网络连接正常

### Q: 跑步数据提交失败？

A: 检查：
1. 会话是否过期 (重新扫码登录)
2. 网络连接是否正常
3. 是否在有效时间段内

### Q: 如何查看更多日志？

A: 启动开发模式：
```bash
npm run dev
```

### Q: 支持哪些学校？

A: 本项目理论上支持所有使用龙猫校园 API 的学校。

---

## 开发指南

### 添加新功能

1. 在 `pages/` 创建新页面
2. 在 `composables/` 添加状态管理
3. 在 `components/` 创建组件
4. 在 `server/api/` 添加 API 路由 (如需)

### 代码规范

- 使用 TypeScript
- 遵循 Vue 3 Composition API 风格
- 使用 Vuetify 组件库

### API 调试

本项目通过 `server/api/totoro/` 代理所有龙猫校园 API 请求：

```typescript
// 调用示例
const response = await $fetch('/api/totoro/platform/recrecord/freeRunning', {
    method: 'POST',
    body: { /* 请求数据 */ }
})
```

---

## 相关项目

- [BeiyanYunyi/totoro-paradise](https://github.com/BeiyanYunyi/totoro-paradise) - 原始项目
- [Mandingo1010/totoro-paradise](https://github.com/Mandingo1010/totoro-paradise) - 分支版本，提供自由跑
- [yuyuyudlc/Totoro](https://github.com/yuyuyudlc/Totoro) - React 版本，提供阳光跑批量补跑

---

## 许可证

本项目基于 [AGPL-3.0](./LICENSE) 许可证开源。

### 重要条款

- **允许** 自由使用、修改和分发
- **要求** 修改后的代码必须开源
- **要求** 使用相同的许可证
- **要求** 在网络服务器上使用时必须提供源代码

---

<div align="center">Made with ❤️ for students<br>Star! Star! Star!<br>By shiywhh in NUAA</div>

