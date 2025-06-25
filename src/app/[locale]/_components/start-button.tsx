import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/routing';
import { cn } from '@/lib/utils';

interface StartButtonProps {
  className?: string;
  text?: string;
  icon?: React.ReactNode;
}

export function StartButton({
  className,
  text = 'Start',
  icon,
}: StartButtonProps) {
  return (
    <Link
      aria-label="Get started by logging in to your account"
      href="/auth/login"
    >
      <Button
        className={cn(
          'relative rounded-full',

          /* ── 内側ハイライト ::before ── */
          'before:absolute before:inset-0 before:rounded-full ',
          'before:bg-[linear-gradient(145deg,rgba(255,255,255,0.35)_0%,rgba(255,255,255,0.05)_40%,transparent_80%)]',

          /* ── 外周グロー ::after（ダーク限定で発光） ── */
          'after:absolute after:inset-0 after:rounded-full',
          'after:opacity-100 after:shadow-[0_0_20px_4px_rgba(255,255,255,0.12)]',

          className
        )}
        size="lg"
        variant="default"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="sr-only">login and start</span>
          {text}
        </div>
      </Button>
    </Link>
  );
}
