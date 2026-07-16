export interface DocumentSummary {
  id: string;
  title: string;
  description: string;
  tags: string[];
  chapterTitles?: string[];
  chapterCount: number;
  progress: number;
  updatedAt: string;
  lastReadAt: string | null;
}

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

export interface ReadingProgress {
  documentId: string;
  chapterId: string;
  progress: number;
  scrollPosition: number;
  completedChapterIds: string[];
}

export interface ChapterReadingState {
  chapterId: string;
  scrollPosition: number;
  completed: boolean;
  updatedAt: string;
}
