# 开发环境

## 要求

- Node.js 22，Node.js 20 LTS 也可
- npm
- 可选 Conda 环境 `webproj`

```bash
npm ci
npm run db:migrate
npm run db:seed
npm run dev
```

默认访问 <http://localhost:3000>。数据库和资源默认保存在 `data/`，该目录不会提交。

## 常用命令

```bash
npm run check       # format check + lint + typecheck + tests
npm run build
npm run test:e2e
npm run db:backup
```

修改 Drizzle schema 后运行 `npm run db:generate` 创建新 migration，再运行
`npm run db:migrate`。不要修改已经部署过的 migration。
