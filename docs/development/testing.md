# 测试策略

测试分为三层：

- `tests/unit/`：纯函数、Markdown 和客户端队列。
- `tests/integration/`：Repository、SQLite、资源、导入导出和备份。
- `tests/e2e/`：从 Library 创建文档到 Editor 保存、Reader 阅读和删除的浏览器闭环。

Vitest 和 Playwright 使用隔离数据库与资源目录，不得读取或清空 `data/alarkive.db`。

```bash
npm run check
npm run build
npx playwright install chromium # 首次使用
npm run test:e2e
```

修复缺陷时，应在最接近问题的层级增加回归测试；跨页面持久化行为使用 E2E。
