import type { ExamData } from "@/types/exam";

export async function loadExamData(examId = "iiqe-paper1"): Promise<ExamData> {
  const response = await fetch(`/data/exams/${examId}/exam.json`);
  if (!response.ok) {
    throw new Error(`Unable to load exam data: ${response.status}`);
  }
  return (await response.json()) as ExamData;
}
