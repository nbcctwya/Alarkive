# ADR 0001：SQLite 与 Drizzle

状态：已采用。

Alarkive V0.1 是单用户、单实例个人工具。SQLite 提供足够的事务和可移植性，Drizzle
提供类型安全 schema 与 migration。代价是不能让多个应用实例并发写入同一个文件；
如果未来进入多用户或多实例阶段，需要重新评估数据库。
