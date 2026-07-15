# Alarkive

## 知识不应该是固定的，它应该与你共同演化。

Alarkive 是一个 AI 原生的教材生成、阅读与个性化平台。

在 Alarkive Explore 中发现知识，
在 Alarkive Reader 中沉浸阅读，
在 Alarkive Library 中建立自己的教材库，
通过 Alarkive Fork 复制并重构任何课程，
最后在 Alarkive Studio 中生成、编辑并发布属于自己的版本。

每一个学习者，都可以成为知识的创作者。
每一份教材，都可以生长出新的分支。

---

## Knowledge should evolve with you.

Alarkive is an AI-native platform for creating, reading, and personalizing educational content.

Discover structured courses in Alarkive Explore.
Read them deeply in Alarkive Reader.
Save them to your Alarkive Library.
Fork any course and reshape it around your goals.
Then refine and publish your own version with Alarkive Studio.

Every learner can become a creator.
Every course can become a new branch of knowledge.

## Local development

```bash
conda run -n webproj npm install
conda run -n webproj npm run db:init
conda run -n webproj npm run db:seed
conda run -n webproj npm run dev
```

The local SQLite database is stored at `data/alarkive.db` and is excluded from Git.
