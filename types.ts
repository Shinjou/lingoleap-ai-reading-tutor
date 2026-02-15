
export enum AppView {
  HOME = 'HOME',
  LIBRARY = 'LIBRARY',
  TUTOR = 'TUTOR',
  REPORT = 'REPORT'
}

export interface Story {
  id: string;
  title: string;
  level: number;
  content: string[];
  thumbnail: string;
  category: 'Fable' | 'Science' | 'History' | 'Daily';
  filename: string;
}

export interface ReadingAttempt {
  storyId: string;
  accuracy: number;
  fluency: number;
  cpm: number;            // characters per minute (read-aloud speed)
  mispronouncedWords: string[];
  transcription: string;
  timestamp: number;
}

export interface LiveMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  type: 'transcription' | 'feedback' | 'evaluation';
}
