# Docker 部署

复制 `.env.example` 为 `.env`，至少设置站点地址和管理员密码：

```bash
cp .env.example .env
docker compose up -d --build
docker compose ps
```

域名模式下 Caddy 自动申请 HTTPS。只有公网 IP 时可以临时使用
`http://PUBLIC_IP`，但 Basic Auth 凭据不会被加密，不适合长期使用。

数据保存在 `alarkive-data` 命名卷。应用启动时自动执行 migration，并以非 root
用户运行。健康检查为 `/api/health`。

无法访问 Docker Hub 时，可以通过 `.env` 覆盖 Node/Caddy 镜像、Alpine 软件源和
Node headers 地址，具体变量以 `.env.example` 为准。

部署镜像变更后，在 Docker 主机执行 `npm run docker:verify`。
