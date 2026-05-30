export type AppView = "practice" | "outline" | "map";

export interface AppRoute {
  examId: string;
  view: AppView;
  questionNumber: number | null;
}

const defaultRoute: AppRoute = {
  examId: "iiqe-paper1",
  view: "practice",
  questionNumber: null
};

function parseQuestionNumber(value: string | null) {
  if (!value) return null;
  const normalized = value.trim().replace(/^q-/i, "");
  if (!/^\d+$/.test(normalized)) return null;
  const number = Number(normalized);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

export function parseRoute(search = window.location.search): AppRoute {
  const params = new URLSearchParams(search);
  const view = params.get("view");
  return {
    examId: params.get("exam") || defaultRoute.examId,
    view: view === "outline" || view === "map" || view === "practice" ? view : defaultRoute.view,
    questionNumber: parseQuestionNumber(params.get("question"))
  };
}

export function buildRouteUrl(route: AppRoute) {
  const params = new URLSearchParams();
  params.set("exam", route.examId);
  params.set("view", route.view);
  if (route.view === "practice" && route.questionNumber) params.set("question", String(route.questionNumber));
  return `${window.location.pathname}?${params.toString()}`;
}
