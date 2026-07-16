# Alarkive 文档导航

这里是产品行为、技术架构与运维流程的统一入口。根目录 `README.md`
面向第一次运行项目的人，本目录面向维护者和 Codex。

## 从哪里开始

| 目标                           | 文档                                                                                      |
| ------------------------------ | ----------------------------------------------------------------------------------------- |
| 理解产品范围                   | [产品总览](product/overview.md)                                                           |
| 修改 Library / Editor / Reader | [Library](product/library.md) · [Editor](product/editor.md) · [Reader](product/reader.md) |
| 理解代码和请求路径             | [架构总览](architecture/overview.md) · [数据流](architecture/data-flow.md)                |
| 修改 SQLite                    | [数据模型](architecture/data-model.md)                                                    |
| 查找组件                       | [组件地图](architecture/component-map.md)                                                 |
| 本地开发与测试                 | [开发环境](development/setup.md) · [测试策略](development/testing.md)                     |
| 部署与恢复                     | [Docker 部署](operations/docker.md) · [备份恢复](operations/backup-and-restore.md)        |

## 权威来源

- 产品范围：`docs/product/`
- 数据库结构：`src/server/db/schema.ts` 与 `drizzle/`
- 共享数据契约：`src/types/`
- 运行参数：`.env.example`
- 自动化命令：`package.json`
- 长期开发约束：根目录 `AGENTS.md`

设计图位于 `design/`，用于说明信息架构，不是必须逐像素复刻的实现规范。
架构决策记录位于 `decisions/`，用于解释重要选择背后的原因。
