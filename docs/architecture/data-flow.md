# 数据流

## Library 创建文档

`LibraryClient → createDocumentAction → documents repository → SQLite`。
Action 返回 `DocumentSummary`，客户端立即更新列表，页面刷新后由服务端重新查询。

## Editor 自动保存

编辑内容先保留在客户端。停止输入约 1000ms 后，串行保存队列调用
`updateChapterAction`。每次保存带有本地 revision，只有最新 revision 可以把界面
标记为“已保存”，从而避免旧请求覆盖新状态。

## Reader 阅读进度

Reader 从服务端接收章节树、内容和阅读状态。章节切换与滚动停止后保存当前位置；
完成状态单独写入。重新进入页面时，服务端读取最近章节，浏览器恢复对应滚动位置。

## 导入导出与图片

ZIP/Markdown 由 portability service 校验和编排；图片保存在文档独立资源目录。
SQLite 不保存图片 BLOB。删除整本文档时，由应用服务协调数据库删除和资源清理。

## Markdown 公式兼容

数据库始终保留用户原始 Markdown。共享渲染器在解析前临时归一化外部 AI 常见的
LaTeX 分隔符，并对丢失反斜杠的公式块使用保守特征检测。归一化跳过围栏代码、
行内代码、已有美元公式、链接、任务列表和普通方括号，不改写持久化内容或导出文件。
对于已确认的复制公式块，独占一行的连续等号会还原为单个等号，以兼容 HTML
转 Markdown 时误生成的 Setext 标题线；普通正文标题不受影响。
渲染归一化同时识别 LF 和 CRLF 换行，因此从 Windows 或外部编辑器导入的公式块
无需改写数据库原文即可正常显示。
