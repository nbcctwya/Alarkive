# 架构总览

Alarkive 是单实例 Next.js App Router 应用。浏览器负责交互状态，Next.js
服务端负责初始查询和写入，SQLite 与本地资源目录负责持久化。

```text
Browser client components
        │ Server Actions / HTTP
        ▼
Next.js routes and actions
        ▼
Application services
        ▼
Repositories ───── File services
        │                 │
        ▼                 ▼
SQLite              data/assets
```

## 目录职责

- `src/app/`：路由、错误边界和服务端页面组合。
- `src/components/`：按 Library、Editor、Reader 和共享 Markdown 分组的 UI。
- `src/actions/`：浏览器写入服务端的稳定边界。
- `src/server/repositories/`：SQLite 查询与事务。
- `src/server/services/`：导入导出、资源、备份和跨资源用例。
- `src/types/`：浏览器与服务端共享的数据契约。
- `src/lib/`：不访问数据库的通用逻辑和客户端 hooks。

## 依赖规则

Client Component 不得导入 `src/server`。Repository 不管理文件系统；需要同时
修改数据库和资源目录的操作由 Service 编排。页面应保持轻量，不在 `page.tsx`
中实现完整界面。
