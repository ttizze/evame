// components/progress-badge.tsx
"use client";

import clsx from "clsx";
import type { Progress } from "@prisma/client";

interface ProgressBadgeProps {
  progress: Progress;
}

const COLOR_MAP: Record<Progress, string> = {
  IDEA: "bg-gray-200 text-gray-800",
  WIP: "bg-yellow-200 text-yellow-800",
  REVIEW: "bg-blue-200 text-blue-800",
  RELEASED: "bg-green-200 text-green-800",
  FROZEN: "bg-slate-400 text-white",
};

export function ProgressBadge({ progress }: ProgressBadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium",
        COLOR_MAP[progress],
      )}
    >
      {progress}
    </span>
  );
}
