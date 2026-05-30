export type AppView = "practice" | "outline" | "map";

export interface AppRoute {
  examId: string;
  view: AppView;
  questionId: string | null;
}

const defaultRoute: AppRoute = {
  examId: "iiqe-paper1",
  view: "practice",
  questionId: null
};

export function parseRoute(search = window.location.search): AppRoute {
  const params = new URLSearchParams(search);
  const view = params.get("view");
  return {
    examId: params.get("exam") || defaultRoute.examId,
    view: view === "outline" || view === "map" || view === "practice" ? view : defaultRoute.view,
    questionId: params.get("question")
  };
}

export function buildRouteUrl(route: AppRoute) {
  const params = new URLSearchParams();
  params.set("exam", route.examId);
  params.set("view", route.view);
  if (route.view === "practice" && route.questionId) params.set("question", route.questionId);
  return `${window.location.pathname}?${params.toString()}`;
}
