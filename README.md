# Alarkive V0.1

> 知识不应该是固定的，它应该与你共同演化。
>
> Knowledge should evolve with you.

Alarkive 是一个单用户、轻量级的个人学习文档平台。你可以在 GPT、Gemini、DeepSeek 等外部工具中生成学习材料，再将 Markdown 复制或导入 Alarkive，整理成章节化教材并持续阅读。

V0.1 本身不调用 AI API，也不包含账号系统、社区、Explore、在线 Fork、支付、推荐或协作。所有数据保存在你自己的 SQLite 数据库和本地资源目录中。

## 当前能力

- Library：创建、修改和删除文档；标签、搜索、筛选、排序、最近阅读和真实进度。
- Editor：两级章节管理、正文/素材 Markdown、手动保存、约 1 秒防抖自动保存、保存失败重试、预览、格式整理、章节导入导出和图片管理。
- Reader：全书目录、本章导航、滚动标题联动、章节翻页、阅读位置恢复、完成状态、字号/宽度/深色模式和代码复制。
- 数据迁移：单个 Markdown 导入、整本 Alarkive ZIP 导入导出（含章节层级、标签、素材和图片）。
- 运维：幂等 migration/seed、SQLite 在线备份与安全恢复、健康检查、管理员 Basic Auth、Docker Compose 和 Caddy HTTPS 示例。

## 环境要求

- Node.js 22（Node.js 20 LTS 也可）
- npm
- 本仓库开发环境可选用 Conda 环境 `webproj`

后续命令可直接运行 `npm ...`；若使用项目约定的 Conda 环境，在命令前加 `conda run -n webproj`。

## 本地启动

```bash
npm ci
npm run db:migrate
npm run db:seed
npm run dev
```

打开 <http://localhost:3000>。开发环境未配置管理员密码时允许本机访问；生产环境会默认拒绝未配置保护的请求。

如需验证生产构建：

```bash
npm run build
ALARKIVE_ADMIN_USERNAME=admin \
ALARKIVE_ADMIN_PASSWORD='replace-with-a-strong-password' \
npm start
```

## 数据库初始化与 seed

```bash
npm run db:generate   # schema 改动后生成 migration
npm run db:migrate    # 应用尚未执行的 migration，不清空数据
npm run db:seed       # 幂等写入示例教材，不重复创建
```

`npm run db:reset` 会清空本地数据库并重新初始化，只应在明确不需要现有数据时使用。

## 数据目录

默认目录：

- SQLite：`data/alarkive.db`
- 图片：`data/assets/<documentId>/`
- 备份：`data/backups/`

可通过环境变量覆盖：

```dotenv
ALARKIVE_DATA_DIR=./data
ALARKIVE_ASSETS_DIR=./data/assets
DATABASE_URL=./data/alarkive.db
```

`DATABASE_URL` 优先决定数据库文件位置；相对路径从项目目录解析。数据库、图片、备份和 `.env` 均被 Git 忽略。

## 导入与导出

- Library 顶部“导入”支持 `.md` 和 Alarkive `.zip`，提交前会先检查文件。
- `.md` 在 Library 中导入为新文档；Editor 侧栏可将 `.md` 导入为当前文档的章节。
- 文档卡片可导出整本 ZIP；Editor 当前章节标题旁可导出单个 Markdown。
- ZIP 包含 `metadata.json`、有序 `chapters/`、`scratchpads/` 和 `assets/`。导入时会生成新 ID，不覆盖现有文档；失败不会留下半成品。

单个 Markdown 最大 5MB，ZIP 最大 25MB；上传图片最大 8MB，仅接受内容验证通过的 PNG、JPEG、GIF 和 WebP。

## 备份与恢复

创建带时间戳且经过 SQLite `quick_check` 的备份：

```bash
npm run db:backup
```

恢复时必须先停止 Alarkive 服务。恢复前会自动创建当前数据库的安全备份：

```bash
npm run db:restore -- /absolute/path/to/alarkive-backup.db
```

图片文件不在 SQLite 中。完整灾备还应同时备份 `ALARKIVE_ASSETS_DIR`；整本文档 ZIP 也会携带该文档的图片。

## 测试与质量检查

测试使用隔离数据库和隔离图片目录，不会重置 `data/alarkive.db`：

```bash
npm run format
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium # 首次运行浏览器测试时执行
npm run test:e2e
```

关键测试覆盖 repository CRUD、章节层级与排序、自动保存串行竞态、Markdown 提示块/公式、导入导出往返、备份恢复以及文件名和图片安全。Playwright 使用独立的 `data/alarkive.e2e.db` 完成创建文档到 Reader 阅读、图片展示、进度恢复和删除的浏览器闭环，不接触正式数据库。

## Docker + Caddy 部署

1. 复制并编辑生产环境变量：

   ```bash
   cp .env.example .env
   ```

2. 设置 `ALARKIVE_SITE_ADDRESS`、管理员用户名和一个长随机密码。使用域名（例如 `learn.example.com`）时，需提前将 DNS 指向服务器，Caddy 会自动配置 HTTPS。只有公网 IP 时可临时设置为 `http://PUBLIC_IP`，但 Basic Auth 凭据会通过未加密 HTTP 传输，不适合长期公网使用。
3. 构建并启动：

   ```bash
   docker compose up -d --build
   docker compose ps
   ```

Caddy 自动申请/续期 HTTPS 证书并反向代理至 Alarkive。应用容器以非 root 用户运行，启动时自动应用 migration；命名卷 `alarkive-data` 持久化数据库、图片和备份。健康检查地址为 `/api/health`，该接口不要求 Basic Auth，也不返回业务数据。

如果部署主机无法访问 Docker Hub，可在 `.env` 中将 `ALARKIVE_NODE_IMAGE` 和 `ALARKIVE_CADDY_IMAGE` 指向可信的 Docker Official Images 镜像副本。Alpine 官方软件源较慢时，还可通过 `ALARKIVE_ALPINE_MIRROR` 设置受信任的镜像源地址。原生模块无法下载预编译产物时，可通过 `ALARKIVE_NODE_HEADERS_MIRROR` 指定可信的 Node.js 头文件镜像，并回退到可复现的本地编译。

Docker 中创建备份：

```bash
docker compose exec alarkive node /app/scripts/docker-backup.mjs
```

Docker 中恢复（先停主服务，再以一次性容器恢复）：

```bash
docker compose stop alarkive
docker compose run --rm --no-deps alarkive \
  node /app/scripts/docker-restore.mjs /app/data/backups/alarkive-YYYY-MM-DD.db
docker compose start alarkive
```

在部署机器上执行一次完整的隔离镜像验收（会自动清理测试容器和测试卷）：

```bash
npm run docker:verify
```

该命令检查镜像构建、非 root 身份、自动 migration、健康检查、管理员鉴权、Library 路由和容器重启。

生产环境若缺少管理员用户名或密码，应用会返回 503，避免意外公开个人资料。只在受信任的本机/内网环境中，才可显式设置 `ALARKIVE_AUTH_DISABLED=true`。

## 已知限制

- 仅面向单用户；Basic Auth 是轻量管理员保护，不是多用户权限系统。
- 当前 UI 主动限制为两级章节；数据库允许递归层级。
- 章节排序使用稳定的上移/下移，暂未提供拖拽，以避免降低保存与排序可靠性。
- 搜索是已加载文档上的前端筛选，不是全文搜索引擎。
- 阅读设置保存在当前浏览器的 `localStorage`，不会跨设备同步。
- 图片删除前会提示，但不会自动分析并移除正文中的 Markdown 引用。
- SQLite 适合本项目的单实例自用场景；不要同时运行多个写入同一数据库文件的应用实例。

## License

当前仓库未声明开源许可证；部署和分发前请由仓库所有者补充明确许可。
