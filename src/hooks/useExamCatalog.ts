import { useEffect, useState } from "react";
import { loadExamCatalog } from "@/services/examLoader";
import type { ExamCatalogData } from "@/types/exam";

export function useExamCatalog() {
  const [data, setData] = useState<ExamCatalogData | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    loadExamCatalog()
      .then((catalog) => {
        if (active) {
          setData(catalog);
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
  }, []);

  return { data, error, loading };
}
