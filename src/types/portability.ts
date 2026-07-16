export interface ArchiveChapter {
  id: string;
  parentId: string | null;
  title: string;
  orderIndex: number;
  path: string;
  scratchpadPath: string;
}

export interface ArchiveMetadata {
  format: "alarkive";
  version: number;
  exportedAt: string;
  document: {
    id: string;
    title: string;
    description: string;
    tags: string[];
  };
  chapters: ArchiveChapter[];
  assets: string[];
}

export interface ImportInspection {
  kind: "markdown" | "alarkive-zip";
  title: string;
  chapterCount: number;
  tags: string[];
  warnings: string[];
}
