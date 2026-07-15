# 数据模型

## DocumentSummary

Library 的轻量列表投影：`id`、`title`、`description`、`tags`、`chapterCount`、`progress`、`updatedAt`、`lastReadAt`。日期存储为 ISO 8601，进度为 0–100 的整数。

## ChapterNode

章节树节点：`id`、`documentId`、`parentId`、`title`、`orderIndex`、`children`。V0.1 UI 支持两层，但模型允许递归；同一父节点内按 `orderIndex` 排序。

## ChapterContent

章节内容：`id`（与章节节点 ID 对应）、`title`、`content`（Markdown 正文）、`scratchpad`（Markdown 素材）、`updatedAt`。V0.1 中内容直接存放在 `chapters` 表，不单独建立内容表。

## ReadingProgress

文档级阅读状态：`documentId`、当前 `chapterId`、总 `progress`、`scrollPosition`、`completedChapterIds`。

## 关系与约束

```text
documents        1 ── * chapters
chapters         1 ── * chapters (parentId)
documents        1 ── * reading_progress
chapters         1 ── 1 reading_progress (per document)
documents        1 ── * document_tags
```

- ID 作为路由与未来数据库主键，使用稳定字符串。
- 删除章节时未来需要级联处理内容和阅读进度。
- `chapterCount` 与 `progress` 是便于列表读取的派生/缓存字段，持久层应在事务内更新。
- `scratchpad` 与 `content` 分离，避免收集材料污染正式正文。

## SQLite V0.1 实现

建立 `documents`、`chapters`、`reading_progress` 和 `document_tags` 表；正文与素材直接保存在 `chapters`。`reading_progress` 以 `documentId + chapterId` 为复合主键，完成状态和滚动位置保存在同一行。Repository 将数据库行聚合为页面既有类型，页面不直接查询 Drizzle。
