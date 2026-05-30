import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Flashcard } from "@/types/exam";

interface FlashcardsTabProps {
  cards: Flashcard[];
}

export function FlashcardsTab({ cards }: FlashcardsTabProps) {
  const [index, setIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const card = cards[index % cards.length];

  if (!card) return null;

  return (
    <Card className="mx-auto max-w-3xl">
      <CardHeader>
        <CardTitle>复习卡片 {index + 1} / {cards.length}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
          <p className="text-lg font-bold leading-8 text-slate-950">{card.question}</p>
          {showAnswer ? <p className="mt-4 leading-7 text-slate-700">{card.answer}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setShowAnswer((value) => !value)}>
            {showAnswer ? "隐藏答案" : "显示答案"}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setIndex((value) => (value + cards.length - 1) % cards.length);
              setShowAnswer(false);
            }}
          >
            上一张
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setIndex((value) => (value + 1) % cards.length);
              setShowAnswer(false);
            }}
          >
            下一张
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
