import type { ChapterContent, ChapterNode } from "../../src/types/chapters";
import type { DocumentSummary } from "../../src/types/documents";
import type { ReadingProgress } from "../../src/types/reading";

export const documents: DocumentSummary[] = [
  {
    id: "prism-vq",
    title: "PRISM-VQ 论文精读",
    description: "从整体框架到向量量化，系统拆解高效的向量量化方法。",
    tags: ["机器学习", "论文精读"],
    chapterCount: 12,
    progress: 65,
    updatedAt: "2026-07-14T16:20:00+08:00",
    lastReadAt: "2026-07-15T09:42:00+08:00",
  },
  {
    id: "master-notes",
    title: "MASTER 源码笔记",
    description: "对 MASTER 框架的核心模块进行阅读与源码级理解。",
    tags: ["深度学习", "代码阅读"],
    chapterCount: 18,
    progress: 40,
    updatedAt: "2026-07-13T19:10:00+08:00",
    lastReadAt: "2026-07-14T21:18:00+08:00",
  },
  {
    id: "factor-models",
    title: "因子模型基础",
    description: "系统梳理因子模型的基本思想、常见模型与应用场景。",
    tags: ["统计学", "机器学习"],
    chapterCount: 10,
    progress: 30,
    updatedAt: "2026-07-11T10:30:00+08:00",
    lastReadAt: "2026-07-12T08:40:00+08:00",
  },
  {
    id: "photography",
    title: "摄影曝光笔记",
    description: "整理摄影中曝光相关的原理、参数与实践经验。",
    tags: ["摄影", "笔记"],
    chapterCount: 8,
    progress: 70,
    updatedAt: "2026-07-09T22:08:00+08:00",
    lastReadAt: "2026-07-10T07:50:00+08:00",
  },
  {
    id: "ielts-writing",
    title: "雅思写作整理",
    description: "雅思写作常见题型、结构、词汇句型与高分范文整理。",
    tags: ["语言学习", "雅思"],
    chapterCount: 16,
    progress: 55,
    updatedAt: "2026-07-08T13:12:00+08:00",
    lastReadAt: "2026-07-09T20:15:00+08:00",
  },
  {
    id: "software-design",
    title: "软件系统设计",
    description: "记录软件系统设计的原则、模式与实践案例。",
    tags: ["软件工程", "系统设计"],
    chapterCount: 20,
    progress: 25,
    updatedAt: "2026-07-06T17:45:00+08:00",
    lastReadAt: null,
  },
];

export const chapterTrees: Record<string, ChapterNode[]> = {
  "prism-vq": [
    {
      id: "background",
      documentId: "prism-vq",
      parentId: null,
      title: "1 研究背景",
      orderIndex: 0,
      children: [],
    },
    {
      id: "architecture",
      documentId: "prism-vq",
      parentId: null,
      title: "2 模型总体架构",
      orderIndex: 1,
      children: [],
    },
    {
      id: "stage-1",
      documentId: "prism-vq",
      parentId: null,
      title: "3 Stage 1",
      orderIndex: 2,
      children: [
        {
          id: "encoder",
          documentId: "prism-vq",
          parentId: "stage-1",
          title: "3.1 Encoder",
          orderIndex: 0,
          children: [],
        },
        {
          id: "framework",
          documentId: "prism-vq",
          parentId: "stage-1",
          title: "3.2 整体框架",
          orderIndex: 1,
          children: [],
        },
        {
          id: "quantizer",
          documentId: "prism-vq",
          parentId: "stage-1",
          title: "3.3 向量量化（VQ）",
          orderIndex: 2,
          children: [],
        },
        {
          id: "decoder",
          documentId: "prism-vq",
          parentId: "stage-1",
          title: "3.4 Decoder",
          orderIndex: 3,
          children: [],
        },
      ],
    },
    {
      id: "stage-2",
      documentId: "prism-vq",
      parentId: null,
      title: "4 Stage 2",
      orderIndex: 3,
      children: [],
    },
    {
      id: "loss",
      documentId: "prism-vq",
      parentId: null,
      title: "5 损失函数",
      orderIndex: 4,
      children: [],
    },
    {
      id: "code",
      documentId: "prism-vq",
      parentId: null,
      title: "6 源码对应关系",
      orderIndex: 5,
      children: [],
    },
  ],
};

const frameworkMarkdown = `# 3.2 整体框架

PRISM-VQ 的整体框架将输入信号编码为连续表示，并通过向量量化模块获得离散的码本表示；随后，PRISM 模块在离散空间中建模长程依赖关系，从而提升模型的表达能力与生成质量。

## 编码与量化

给定输入序列 $x \\in \\mathbb{R}^{T \\times d}$，编码器 $E$ 将其映射到连续表示 $z$，再通过码本 $C \\in \\mathbb{R}^{K \\times h}$ 进行量化：

$$
\\hat{z}_t = \\operatorname{Quantize}(E(x_t)) = \\arg\\min_{c_k \\in C} \\lVert E(x_t)-c_k \\rVert_2
$$

量化后的表示会交给解码器重建输出。完整流程包括：

1. 使用编码器提取连续特征。
2. 在码本中找到最近的向量。
3. 使用 PRISM 模块建模序列关系。
4. 通过解码器得到重建结果。

> **笔记**：向量量化将连续空间映射到离散码本，可以提高模型的可解释性与生成稳定性，同时降低训练与推理成本。

| 模块 | 输入 | 输出 | 作用 |
| --- | --- | --- | --- |
| Encoder | 原始信号 | 连续特征 | 表征学习 |
| VQ | 连续特征 | 离散索引 | 信息压缩 |
| PRISM | 离散表示 | 上下文表示 | 长程建模 |
| Decoder | 上下文表示 | 重建信号 | 内容恢复 |

### 伪代码

\`inline code\` 可用于标记变量，完整流程如下：

\`\`\`python
z = encoder(x)                    # 编码器
z_hat, indices = vq(z, codebook) # 向量量化
h = prism(z_hat, mask)           # 上下文建模
x_hat = decoder(h)               # 解码器
return x_hat, indices
\`\`\`

进一步可参考 [VQ-VAE 论文](https://arxiv.org/abs/1711.00937)。

---

下一节将分析码本更新策略与承诺损失。`;

const defaultMarkdown = (title: string) => `# ${title}

这是 **${title}** 的学习内容示例。内容以 Markdown 保存，可以直接粘贴来自外部 AI 工具的结构化材料。

## 核心问题

- 这一节试图解决什么问题？
- 它与前后章节有什么联系？
- 哪些概念需要继续查证？

> 将阅读中的疑问记录到“素材”页签，稍后集中整理。`;

const prismIds = chapterTrees["prism-vq"].flatMap((node) => [
  node,
  ...node.children,
]);

export const chapterContents: Record<string, ChapterContent> =
  Object.fromEntries(
    prismIds.map((chapter) => [
      chapter.id,
      {
        id: chapter.id,
        title: chapter.title,
        content:
          chapter.id === "framework"
            ? frameworkMarkdown
            : defaultMarkdown(chapter.title),
        scratchpad: `## ${chapter.title} · 素材\n\n- 待核对的术语\n- 可补充的参考资料\n- 从外部 AI 对话中保留的原始片段`,
        updatedAt: "2026-07-15T09:42:00+08:00",
      },
    ]),
  );

export const readingProgress: Record<string, ReadingProgress> = {
  "prism-vq": {
    documentId: "prism-vq",
    chapterId: "framework",
    progress: 65,
    scrollPosition: 320,
    completedChapterIds: ["background", "architecture", "encoder"],
  },
};
