import type { LucideIcon } from 'lucide-react';

interface PageListContainerProps {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
  showPagination?: boolean;
}

export function PageListContainer({
  title,
  icon: Icon,
  children,
  showPagination = false,
}: PageListContainerProps) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="mb-4 flex items-center gap-2 font-semibold text-2xl">
        <Icon className="h-4 w-4" />
        {title}
      </h2>
      {children}
    </div>
  );
}
