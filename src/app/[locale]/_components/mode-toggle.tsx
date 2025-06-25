'use client';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { forwardRef } from 'react';

export const ModeToggle = forwardRef<HTMLButtonElement, { showText?: boolean }>(
  (props, ref) => {
    const { showText = true } = props;
    const { theme, setTheme } = useTheme();
    const isLight = theme === 'light';

    function toggleTheme() {
      setTheme(isLight ? 'dark' : 'light');
    }

    return (
      <button
        className="flex w-full cursor-pointer items-center gap-2 px-4 py-3 text-sm hover:bg-accent hover:text-accent-foreground"
        onClick={toggleTheme}
        ref={ref}
        type="button"
      >
        <Sun
          className={`h-4 w-4 ${isLight ? 'rotate-0 scale-100 ' : 'hidden'}`}
        />
        <Moon
          className={`h-4 w-4 ${isLight ? 'hidden' : 'rotate-0 scale-100'}`}
        />
        {showText && <span>{isLight ? 'Light Theme' : 'Dark Theme'}</span>}
      </button>
    );
  }
);

ModeToggle.displayName = 'ModeToggle';
