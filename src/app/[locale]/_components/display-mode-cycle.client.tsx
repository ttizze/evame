/* app/_components/display-mode-cycle.tsx */
'use client';
import { FileText } from 'lucide-react';
import { useDisplay } from '@/app/_context/display-provider';
import { Button } from '@/components/ui/button';

interface Props {
  afterClick?: () => void;
}

export function DisplayModeCycle({ afterClick }: Props) {
  const { mode, cycle, userLocale, sourceLocale } = useDisplay(); // mode: "user" | "source" | "both"

  const handleClick = () => {
    afterClick?.();
    cycle(); // ③ 状態変更
  };

  /* ボタン内部の表示内容 */
  const inner =
    mode === 'user' ? (
      <span>{userLocale.toUpperCase()}</span>
    ) : mode === 'source' ? (
      <FileText className="h-5 w-5" />
    ) : (
      <span className="flex scale-90 items-center gap-px">
        <span className="text-[10px] leading-none">
          {userLocale.toUpperCase()}
        </span>
        <span className="text-[10px] leading-none">/</span>
        <FileText className="h-3 w-3" />
      </span>
    );

  /* アクセシブルラベル */
  const label =
    mode === 'user'
      ? 'Currently: User language only (Click to change)'
      : mode === 'source'
        ? 'Currently: Source only (Click to change)'
        : 'Currently: Both languages (Click to change)';

  return (
    <Button
      aria-label={label}
      className="h-10 w-10 rounded-full border bg-background font-semibold text-xs"
      onClick={handleClick}
      size="icon"
      title={label}
      variant="ghost"
    >
      {inner}
    </Button>
  );
}
