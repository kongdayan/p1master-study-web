import { Checkbox } from "@/components/ui/checkbox";
import type { ChecklistItem } from "@/types/exam";

interface ChecklistPanelProps {
  items: ChecklistItem[];
  checked: Record<string, boolean>;
  onChange: (id: string, checked: boolean) => void;
}

export function ChecklistPanel({ items, checked, onChange }: ChecklistPanelProps) {
  return (
    <div className="grid gap-2">
      {items.map((item) => (
        <label key={item.id} className="flex items-start gap-2 text-sm leading-6 text-slate-600">
          <Checkbox checked={Boolean(checked[item.id])} onCheckedChange={(value) => onChange(item.id, value === true)} />
          <span className={checked[item.id] ? "text-slate-400 line-through" : ""}>{item.title}</span>
        </label>
      ))}
    </div>
  );
}
