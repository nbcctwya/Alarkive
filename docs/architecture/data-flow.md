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
