# 组件地图

```text
RootLayout
├── LibraryPage
│   └── LibraryClient
│       ├── AppSidebar
│       ├── LibraryHeader
│       ├── RecentDocumentsSection
│       │   └── DocumentCard
│       ├── AllDocumentsSection
│       │   └── DocumentCard
│       ├── CreateDocumentDialog / EditDocumentDialog
│       └── ImportDocumentDialog
├── EditorPage
│   └── EditorWorkspace
│       ├── EditorHeader
│       │   └── SaveStatus
│       ├── ChapterSidebar
│       │   └── ChapterTree
│       ├── ContentModeTabs
│       ├── MarkdownToolbar
│       ├── MarkdownEditor
│       ├── MarkdownPreview
│       │   └── MarkdownRenderer
│       ├── FormatMarkdownDialog
│       └── AssetManagerDialog
└── ReaderPage
    └── ReaderShell
        ├── ReaderHeader
        ├── ReaderSettings
        ├── BookTableOfContents
        ├── ArticleContent
        │   ├── MarkdownRenderer
        │   └── ChapterNavigation
        ├── ChapterTableOfContents
        └── ReadingProgressCard
```

## 复用边界

- `MarkdownRenderer` 同时服务 Editor 预览与 Reader，集中维护 Markdown/GFM/KaTeX/代码样式。
- 章节展平与查找属于数据工具，不绑定页面。
- 按钮、徽标等简单视觉模式优先通过设计 token 与类名一致化，V0.1 不建立重量级 UI 基础库。
- 页面级交互状态保留在各自 client shell；服务端页面通过 repository 读取初始数据，写入统一经过 Server Actions。
- `useModalFocus` 为页面弹窗提供 Escape 关闭、Tab 焦点循环和关闭后焦点恢复。
