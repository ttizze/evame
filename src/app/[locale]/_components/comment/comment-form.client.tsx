// components/CommentFormLayout.tsx
'use client';

import { useState } from 'react';
import { StartButton } from '@/app/[locale]/_components/start-button';
import { Editor } from '@/app/[locale]/(edit-layout)/user/[handle]/page/[pageSlug]/edit/_components/editor/editor';
import { Button } from '@/components/ui/button';

type Hidden = Record<string, string | number | undefined>;

interface Props {
  /** form の action 属性に渡す Server Action */
  action: (formData: FormData) => void;
  /** <input type="hidden"> にしたい name=value 一覧 */
  hidden: Hidden;
  /** ログイン中ハンドル（未ログインなら undefined） */
  currentHandle?: string;
  /** POST 中かどうか（isPending 相当） */
  isPending: boolean;
  /** content フィールドの Zod エラー (無ければ undefined) */
  errorMsg?: string[];
}

export function CommentForm({
  action,
  hidden,
  currentHandle,
  isPending,
  errorMsg,
}: Props) {
  const [content, setContent] = useState('');

  return (
    <>
      <form action={action} className="relative space-y-4">
        {/* hidden inputs */}
        {Object.entries(hidden).map(
          ([k, v]) =>
            v !== undefined && (
              <input key={k} name={k} type="hidden" value={v} />
            )
        )}

        <Editor
          className={`rounded-md border border-input px-2 ${
            currentHandle ? '' : 'bg-muted opacity-50'
          }`}
          defaultValue={content}
          name="content"
          onEditorUpdate={(ed) => setContent(ed?.getHTML() ?? '')}
          placeholder="Say Hello!"
        />

        {!currentHandle && (
          <StartButton className="-translate-x-1/2 -translate-y-1/2 absolute top-1/2 left-1/2" />
        )}

        <Button
          className={`w-full ${currentHandle ? '' : 'bg-muted opacity-50'}`}
          disabled={isPending || !currentHandle}
          type="submit"
        >
          {isPending ? 'posting' : 'post'}
        </Button>
      </form>

      {errorMsg && <p className="text-red-500 text-sm">{errorMsg}</p>}
    </>
  );
}
