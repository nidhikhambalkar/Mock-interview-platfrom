// types.ts
// Domain interfaces for WeIntern Mock Interview Platform

export type QuestionType = 'Technical' | 'Behavioral' | 'Situational';

export interface Question {
  id: number;
  question: string;
  type: QuestionType;
}

export interface Answer {
  question: string;
  question_type: QuestionType;
  user_answer: string;
}

export interface Session {
  id: string;
  user_id: string;
  domain: string;
  difficulty: string;
  communication_score: number;
  technical_score: number;
  confidence_score: number;
  overall_score: number;
  grade: 'Excellent' | 'Good' | 'Needs Practice';
  strength?: string;
  improvement?: string;
  created_at: string;
}

export interface ProgressData {
  name: string;
  date: string;
  score: number;
  domain: string;
}

export interface RadarData {
  subject: string;
  A: number;
  fullMark: number;
}

export interface DashboardStats {
  totalSessions: number;
  averageScore: number;
  averageCommunication: number;
  averageTechnical: number;
  averageConfidence: number;
  lastGrade: string;
  sessions: Session[];
  progressChart: ProgressData[];
  radarChart: RadarData[];
}
