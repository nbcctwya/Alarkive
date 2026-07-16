# ADR 0002：优先使用 Server Actions

状态：已采用。

页面内部写入优先使用 Server Actions，以保持类型边界并减少额外 HTTP 样板。
需要浏览器生命周期外发送、流式响应或直接资源访问时使用 Route Handler，例如滚动
位置 keepalive 和图片读取。
