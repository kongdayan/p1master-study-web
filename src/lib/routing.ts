export type AppView = "catalog" | "practice" | "outline" | "map";

export interface AppRoute {
  examId: string | null;
  view: AppView;
  questionNumber: number | null;
}

const defaultRoute: AppRoute = {
  examId: null,
  view: "catalog",
  questionNumber: null
};

export function appPathname(pathname = window.location.pathname) {
  if (!pathname || pathname === "") return "/";
  return pathname.startsWith("/api/") ? "/" : pathname;
}

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
  const examId = params.get("exam");
  if (!examId || view === "catalog") return defaultRoute;
  return {
    examId,
    view: view === "outline" || view === "map" || view === "practice" ? view : defaultRoute.view,
    questionNumber: parseQuestionNumber(params.get("question"))
  };
}

export function buildRouteUrl(route: AppRoute) {
  const pathname = appPathname();
  if (route.view === "catalog" || !route.examId) return pathname;
  const params = new URLSearchParams();
  params.set("exam", route.examId);
  params.set("view", route.view);
  if (route.view === "practice" && route.questionNumber) params.set("question", String(route.questionNumber));
  return `${pathname}?${params.toString()}`;
}

export function currentAppReturnTo() {
  return buildRouteUrl(parseRoute());
}
