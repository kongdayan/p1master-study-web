import { useEffect, useState } from "react";
import { loadExamData } from "@/services/examLoader";
import type { ExamData } from "@/types/exam";

export function useExamData(examId = "iiqe-paper1") {
  const [data, setData] = useState<ExamData | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    loadExamData(examId)
      .then((examData) => {
        if (active) {
          setData(examData);
          setError(null);
        }
      })
      .catch((caught: Error) => {
        if (active) setError(caught);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [examId]);

  return { data, error, loading };
}
