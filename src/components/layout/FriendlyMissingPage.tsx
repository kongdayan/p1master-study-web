import { ArrowLeft, PartyPopper } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface FriendlyMissingPageProps {
  examId?: string | null;
  onGoHome: () => void;
}

export function FriendlyMissingPage({ examId, onGoHome }: FriendlyMissingPageProps) {
  const [seconds, setSeconds] = useState(6);

  useEffect(() => {
    if (seconds <= 0) {
      onGoHome();
      return;
    }
    const timer = window.setTimeout(() => setSeconds((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [onGoHome, seconds]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="max-w-lg text-center">
        <CardHeader>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-teal-50 text-teal-800">
            <PartyPopper className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl">这个考试我还没加入呢</CardTitle>
          <CardDescription className="text-base leading-7">
            你学得太快啦。{examId ? `我翻了翻书架，还没有找到「${examId}」。` : "这里暂时没有对应内容。"}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <p className="text-sm leading-6 text-slate-500">先回考题大全看看已经上线的题库，{seconds} 秒后自动带你回去。</p>
          <Button onClick={onGoHome}>
            <ArrowLeft className="h-4 w-4" />
            回到考题大全
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
