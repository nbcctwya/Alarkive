export interface ChapterNode {
  id: string;
  documentId: string;
  parentId: string | null;
  title: string;
  orderIndex: number;
  children: ChapterNode[];
}

export interface ChapterContent {
  id: string;
  title: string;
  content: string;
  scratchpad: string;
  updatedAt: string;
}
