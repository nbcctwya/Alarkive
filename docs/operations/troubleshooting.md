# 故障排查

## 页面提示数据库不可用

确认 `DATABASE_URL`/`ALARKIVE_DATA_DIR` 指向可写位置，然后执行
`npm run db:migrate`。不要用 seed 或 fixture 掩盖数据库错误。

## 容器不健康

```bash
docker compose ps
docker compose logs --tail=200 alarkive
docker compose exec alarkive node -e 'fetch("http://127.0.0.1:3000/api/health").then(r=>console.log(r.status))'
```

## 图片缺失

确认 `ALARKIVE_ASSETS_DIR` 与数据库属于同一套数据，并检查文档资源目录权限。
SQLite 备份本身不包含图片。

## 原生依赖构建失败

受限网络可使用 `.env.example` 中的镜像覆盖变量。不要下载来源不明的预编译二进制。
