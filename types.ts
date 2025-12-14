
export interface Sentence {
  id: number;
  korean: string;
  english: string;
}

export interface Chapter {
  id: number;
  title: string;
  range: [number, number];
}

export interface UserProgress {
  chapterKnownIds: Record<number, number[]>; 
  failCounts: Record<number, number>; 
  bookmarks: Set<number>;
}

export enum ViewMode {
  HOME = 'HOME',
  STUDY = 'STUDY',
  BOOKMARKS = 'BOOKMARKS'
}
