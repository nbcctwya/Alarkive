# 组件地图

本页描述逻辑组件与真实源码位置。`page.tsx` 是服务端组合入口，三个 Shell/Client
是客户端状态协调器，其他文件是聚焦的展示组件。

## Library

| 组件            | 源码                                        | 职责                           |
| --------------- | ------------------------------------------- | ------------------------------ |
| `LibraryPage`   | `src/app/library/page.tsx`                  | 服务端读取初始文档             |
| `LibraryClient` | `src/components/library/LibraryClient.tsx`  | 搜索、筛选、列表状态和弹窗协调 |
| `AppSidebar`    | `src/components/library/AppSidebar.tsx`     | 响应式应用导航                 |
| `DocumentCard`  | `src/components/library/DocumentCard.tsx`   | 文档摘要、进度和入口           |
| Library dialogs | `src/components/library/LibraryDialogs.tsx` | 创建、修改和导入表单           |

## Editor

| 组件                   | 源码                                             | 职责                         |
| ---------------------- | ------------------------------------------------ | ---------------------------- |
| `EditorPage`           | `src/app/documents/[documentId]/edit/page.tsx`   | 服务端读取文档和章节         |
| `EditorWorkspace`      | `src/components/editor/EditorWorkspace.tsx`      | 编辑状态、章节操作和保存协调 |
| `EditorHeader`         | `src/components/editor/EditorHeader.tsx`         | 页面导航、保存状态与主要动作 |
| `ChapterSidebar`       | `src/components/editor/ChapterSidebar.tsx`       | 章节树展示和目录动作         |
| Markdown controls      | `src/components/editor/MarkdownControls.tsx`     | 工具栏和 textarea            |
| Editor dialogs         | `src/components/editor/EditorDialogs.tsx`        | 文档、标题和章节导入弹窗     |
| `AssetManagerDialog`   | `src/components/editor/AssetManagerDialog.tsx`   | 图片列表、插入和删除         |
| `FormatMarkdownDialog` | `src/components/editor/FormatMarkdownDialog.tsx` | 格式变更预览与确认           |
| Chapter tree helpers   | `src/components/editor/chapter-tree.ts`          | 无副作用的树变换             |

## Reader

| 组件                     | 源码                                               | 职责                           |
| ------------------------ | -------------------------------------------------- | ------------------------------ |
| `ReaderPage`             | `src/app/documents/[documentId]/read/page.tsx`     | 服务端读取教材和进度           |
| `ReaderShell`            | `src/components/reader/ReaderShell.tsx`            | 当前章节、偏好、滚动和进度协调 |
| `ReaderHeader`           | `src/components/reader/ReaderHeader.tsx`           | 标题、总进度和页面入口         |
| `BookTableOfContents`    | `src/components/reader/BookTableOfContents.tsx`    | 全书章节树                     |
| `ReaderSettings`         | `src/components/reader/ReaderSettings.tsx`         | 字号、宽度、主题和栏位设置     |
| `ChapterTableOfContents` | `src/components/reader/ChapterTableOfContents.tsx` | 当前 Markdown 标题导航         |
| `ReadingProgressCard`    | `src/components/reader/ReadingProgressCard.tsx`    | 章节位置、完成状态和下一节     |

## 共享与写入边界

- `MarkdownRenderer` 位于 `src/components/markdown/`，同时服务 Editor 和 Reader。
- 浏览器写入统一经过 `src/actions/`，客户端组件不得导入 `src/server/`。
- SQLite 查询位于 `src/server/repositories/`；跨数据库与文件系统的用例位于
  `src/server/services/`。
- `useModalFocus` 和 `SerialTaskQueue` 是当前有实际复用场景的轻量基础能力。
