# Alarkive V0.1

> 知识不应该是固定的，它应该与你共同演化。<br>
> Knowledge should evolve with you.

Alarkive 是一个单用户、轻量级的个人学习文档平台。你可以从外部 AI 工具复制或
导入 Markdown，将材料整理成章节化教材，并在安静的阅读界面中持续学习。

V0.1 不调用 AI API，也不包含账号、社区、Explore、在线 Fork、支付、推荐或协作。
数据保存在自己的 SQLite 数据库和本地资源目录中。

## 当前能力

- Library：创建、修改、删除、搜索、筛选、排序、导入和导出教材。
- Editor：两级章节管理、正文/素材 Markdown、自动保存、预览和图片资源。
- Reader：章节导航、进度与位置恢复、字号/宽度/深色模式和代码复制。
- 持久化：SQLite + Drizzle migration，幂等 seed，备份与安全恢复。
- 部署：Docker Compose、Caddy、健康检查和管理员 Basic Auth。

## 快速开始

要求 Node.js 22（Node.js 20 LTS 也可）和 npm。

```bash
npm ci
npm run db:migrate
npm run db:seed
npm run dev
```

打开 <http://localhost:3000>。可选 Conda 环境为 `webproj`。

默认数据位置：

- SQLite：`data/alarkive.db`
- 图片：`data/assets/<documentId>/`
- 备份：`data/backups/`

这些运行数据和 `.env` 均被 Git 忽略。

## 质量检查

```bash
npm run check
npm run build
npm run test:e2e
```

首次运行浏览器测试前执行 `npx playwright install chromium`。测试使用隔离数据库，
不会接触正式 `data/alarkive.db`。

## Docker 部署

```bash
cp .env.example .env
# 编辑站点地址、管理员用户名和密码
docker compose up -d --build
```

使用域名时 Caddy 自动配置 HTTPS。只有公网 IP 时可以临时配置 HTTP，但 Basic Auth
凭据不会被加密，不适合长期公网使用。

## 文档

- [完整文档导航](docs/README.md)
- [产品总览](docs/product/overview.md)
- [架构总览](docs/architecture/overview.md)
- [数据模型](docs/architecture/data-model.md)
- [开发环境](docs/development/setup.md)
- [测试策略](docs/development/testing.md)
- [Docker 部署](docs/operations/docker.md)
- [备份与恢复](docs/operations/backup-and-restore.md)

## 已知限制

- 仅支持单用户、单实例。
- 当前 UI 为两级章节，数据库允许递归层级。
- 搜索是已加载文档上的前端筛选，不是全文搜索。
- 阅读设置保存在当前浏览器，不跨设备同步。
- SQLite 不适合多个应用实例同时写入同一数据库文件。

## License

当前仓库未声明开源许可证；部署和分发前请由仓库所有者补充明确许可。
