# 备份与恢复

本地创建经过 SQLite `quick_check` 的在线备份：

```bash
npm run db:backup
```

恢复前必须停止应用。恢复脚本会先备份当前数据库：

```bash
npm run db:restore -- /absolute/path/to/alarkive-backup.db
```

Docker 环境：

```bash
docker compose exec alarkive node /app/scripts/docker-backup.mjs
docker compose stop alarkive
docker compose run --rm --no-deps alarkive \
  node /app/scripts/docker-restore.mjs /app/data/backups/backup.db
docker compose start alarkive
```

SQLite 备份不包含 `data/assets/`。完整灾备必须同时保存图片目录，或者对每份文档
导出包含图片的 Alarkive ZIP。
