import { useMemo, useState } from "react";
import { RotateCcw, Search, ZoomIn, ZoomOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Chapter, KnowledgeGraphData } from "@/types/exam";

interface KnowledgeGraphProps {
  graph: KnowledgeGraphData;
  chapters: Chapter[];
}

export function KnowledgeGraph({ graph, chapters }: KnowledgeGraphProps) {
  const [selectedId, setSelectedId] = useState("root");
  const [activeChapter, setActiveChapter] = useState("all");
  const [query, setQuery] = useState("");
  const [scale, setScale] = useState(1);

  const chapterOrder = useMemo(() => chapters.slice().sort((a, b) => Number(a.id) - Number(b.id)), [chapters]);
  const nodeById = useMemo(() => new Map(graph.nodes.map((node) => [node.id, node])), [graph.nodes]);
  const neighbors = useMemo(() => {
    const map = new Map(graph.nodes.map((node) => [node.id, new Set<string>()]));
    graph.edges.forEach((edge) => {
      map.get(edge.source)?.add(edge.target);
      map.get(edge.target)?.add(edge.source);
    });
    return map;
  }, [graph.edges, graph.nodes]);

  const visibleIds = useMemo(() => {
    const term = query.trim().toLowerCase();
    return new Set(
      graph.nodes
        .filter((node) => {
          const detail = graph.details[node.id];
          const haystack = [
            node.label,
            node.sub,
            detail?.title,
            detail?.chapter,
            detail?.summary,
            ...(detail?.bullets || []),
            ...(detail?.mistakes || [])
          ]
            .join(" ")
            .toLowerCase();
          const chapterPass =
            activeChapter === "all" ||
            node.id === activeChapter ||
            node.group === activeChapter ||
            node.parent === activeChapter;
          return chapterPass && (!term || haystack.includes(term));
        })
        .map((node) => node.id)
    );
  }, [activeChapter, graph.details, graph.nodes, query]);

  const detail = graph.details[selectedId] || graph.details.root;
  const selectedNeighbors = neighbors.get(selectedId) || new Set<string>();

  function focusChapter(nodeId: string) {
    setActiveChapter(nodeId);
    setSelectedId(nodeId);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)_360px]">
      <aside className="grid gap-4 self-start">
        <Card>
          <CardHeader>
            <CardTitle>章节</CardTitle>
            <CardDescription>按章节筛选知识图谱。</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button
              variant={activeChapter === "all" ? "default" : "outline"}
              className="justify-start"
              onClick={() => setActiveChapter("all")}
            >
              全部知识点
            </Button>
            {chapterOrder.map((chapter) => (
              <Button
                key={chapter.id}
                variant={activeChapter === chapter.nodeId ? "default" : "outline"}
                className="h-auto justify-start whitespace-normal py-2 text-left"
                onClick={() => focusChapter(chapter.nodeId)}
              >
                <span>
                  {chapter.title}
                  <span className="block text-xs font-medium opacity-75">{chapter.weight} · {chapter.estimatedQuestions} 题</span>
                </span>
              </Button>
            ))}
          </CardContent>
        </Card>
      </aside>

      <section className="min-h-[620px] rounded-lg border border-slate-200 bg-white p-3">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              className="pl-9"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索：近因、代位、保险经纪..."
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" title="缩小" onClick={() => setScale((value) => Math.max(0.65, value - 0.12))}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" title="放大" onClick={() => setScale((value) => Math.min(1.45, value + 0.12))}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              title="重置"
              onClick={() => {
                setScale(1);
                setActiveChapter("all");
                setSelectedId("root");
                setQuery("");
              }}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <svg viewBox="0 0 900 620" className="h-[580px] w-full rounded-md bg-slate-50">
          <g transform="translate(450 310)">
            {graph.edges.map((edge, index) => {
              const source = nodeById.get(edge.source);
              const target = nodeById.get(edge.target);
              if (!source || !target) return null;
              const visible = visibleIds.has(edge.source) && visibleIds.has(edge.target);
              const focused = edge.source === selectedId || edge.target === selectedId;
              return (
                <line
                  key={`${edge.source}-${edge.target}-${index}`}
                  x1={source.x * scale}
                  y1={source.y * scale}
                  x2={target.x * scale}
                  y2={target.y * scale}
                  className="transition"
                  stroke={focused ? "#0f766e" : "#94a3b8"}
                  strokeWidth={focused ? 2.4 : 1.2}
                  opacity={visible ? (focused ? 0.9 : 0.35) : 0}
                />
              );
            })}
            {graph.nodes.map((node) => {
              const visible = visibleIds.has(node.id);
              const selected = selectedId === node.id;
              const focused = selected || selectedNeighbors.has(node.id);
              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x * scale} ${node.y * scale})`}
                  className="cursor-pointer"
                  opacity={visible ? (focused ? 1 : 0.5) : 0.08}
                  onMouseEnter={() => setSelectedId(node.id)}
                  onClick={() => setSelectedId(node.id)}
                >
                  <circle
                    r={(node.size || 20) * (selected ? 1.08 : 1)}
                    fill={node.type === "root" ? "#17212b" : "#fff"}
                    stroke={chapters.find((chapter) => chapter.nodeId === node.group)?.color || "#64748b"}
                    strokeWidth={selected ? 4 : 2}
                  />
                  <text textAnchor="middle" y={node.sub ? -4 : 4} className="select-none fill-slate-900 text-[12px] font-bold">
                    {node.label}
                  </text>
                  {node.sub ? (
                    <text textAnchor="middle" y={13} className="select-none fill-slate-500 text-[10px] font-semibold">
                      {node.sub}
                    </text>
                  ) : null}
                </g>
              );
            })}
          </g>
        </svg>
      </section>

      <aside className="grid gap-4 self-start">
        <Card>
          <CardHeader>
            <CardTitle>{detail.title}</CardTitle>
            <CardDescription>{detail.summary}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex flex-wrap gap-2">
              {detail.chapter ? <Badge>{detail.chapter}</Badge> : null}
              {detail.weight ? <Badge>权重 {detail.weight}</Badge> : null}
              {detail.frequency ? <Badge>{detail.frequency}</Badge> : null}
            </div>
            {detail.bullets?.length ? (
              <div>
                <h4 className="mb-2 text-sm font-bold text-slate-900">重点提纲</h4>
                <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-slate-600">
                  {detail.bullets.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {detail.mistakes?.length ? (
              <div>
                <h4 className="mb-2 text-sm font-bold text-slate-900">易错点</h4>
                <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-slate-600">
                  {detail.mistakes.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
