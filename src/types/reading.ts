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
