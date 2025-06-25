import {
  CheckCircle2,
  Hourglass,
  Languages,
  LinkIcon,
  Loader2,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import type { TranslationJobForToast } from '@/app/types/translation-job';
import { Progress } from '@/components/ui/progress';

const statusIcon = (status: string) => {
  switch (status) {
    case 'PENDING':
      return (
        <Hourglass className="h-4 w-4 animate-bounce text-muted-foreground" />
      );
    case 'IN_PROGRESS':
      return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    case 'COMPLETED':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'FAILED':
      return <XCircle className="h-4 w-4 text-red-500" />;
    default:
      return null;
  }
};

export const JobsView = ({ jobs }: { jobs: TranslationJobForToast[] }) => (
  <div className="w-64 py-2">
    <p className="mb-2 flex items-center font-medium text-sm">
      <Languages className="mr-2 h-4 w-4" />
      Translation Jobs
    </p>
    {jobs.map((j) => (
      <div className="mb-2 last:mb-0" key={j.locale}>
        <span className="flex items-center gap-2">
          {statusIcon(j.status)}
          <Link
            className="flex min-w-[48px] cursor-pointer items-center capitalize hover:underline"
            href={`/${j.locale}/user/${j.page.user.handle}/page/${j.page.slug}`}
          >
            <LinkIcon className="mr-1 h-4 w-4" />
            {j.locale}
          </Link>
          <Progress
            className="mx-2 h-2 flex-1"
            value={j.progress ?? (j.status === 'COMPLETED' ? 100 : 0)}
          />
        </span>
        {j.error && <p className="mt-1 text-red-500 text-xs">{j.error}</p>}
      </div>
    ))}
  </div>
);
