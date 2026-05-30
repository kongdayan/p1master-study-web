export type ChoiceLetter = "A" | "B" | "C" | "D";

export interface ExamPassingRule {
  questions: number;
  durationMinutes: number;
  passingScorePercent: number;
  passingQuestions: number;
}

export interface ExamMeta {
  id: string;
  title: string;
  shortTitle: string;
  officialNameEn: string;
  officialNameZhHans: string;
  description: string;
  locale: string;
  passing: ExamPassingRule;
  sourceNotes: string[];
}

export interface Chapter {
  id: string;
  nodeId: string;
  title: string;
  shortTitle: string;
  weight: string;
  estimatedQuestions: string;
  priority: number;
  color: string;
  summary: string;
}

export interface KnowledgeNode {
  id: string;
  label: string;
  sub?: string;
  type: "root" | "chapter" | "topic" | "strategy";
  group: string;
  parent?: string;
  size?: number;
  x: number;
  y: number;
}

export interface KnowledgeEdge {
  source: string;
  target: string;
}

export interface KnowledgeDetail {
  title: string;
  chapter?: string;
  weight?: string;
  frequency?: string;
  summary: string;
  bullets?: string[];
  mistakes?: string[];
}

export interface KnowledgeGraphData {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  details: Record<string, KnowledgeDetail>;
}

export interface QuestionOption {
  letter: ChoiceLetter;
  text: string;
}

export interface Question {
  id: string;
  numericId: number;
  chapterId: string;
  ref: string;
  prompt: string;
  options: QuestionOption[];
  answer: ChoiceLetter;
  explanation?: string;
  tags: string[];
}

export interface Flashcard {
  id: string;
  question: string;
  answer: string;
}

export interface ChecklistItem {
  id: string;
  title: string;
}

export interface ExamData {
  schemaVersion: "exam-bank.v1";
  exam: ExamMeta;
  chapters: Chapter[];
  knowledge: KnowledgeGraphData;
  questions: Question[];
  flashcards: Flashcard[];
  checklist: ChecklistItem[];
}

export interface ExamCatalogItem {
  id: string;
  title: string;
  shortTitle: string;
  direction: string;
  description: string;
  questionCount: number;
  durationMinutes: number;
  passingQuestions: number;
  passingScorePercent: number;
  status: "available" | "coming-soon";
  defaultView: "practice" | "outline" | "map";
}

export interface ExamCatalogData {
  schemaVersion: "exam-catalog.v1";
  title: string;
  description: string;
  exams: ExamCatalogItem[];
}
