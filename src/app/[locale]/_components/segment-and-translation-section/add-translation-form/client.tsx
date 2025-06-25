'use client';
import { ArrowUpFromLine } from 'lucide-react';
import { useLocale } from 'next-intl';
import { useActionState } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { StartButton } from '@/app/[locale]/_components/start-button';
import type { TargetContentType } from '@/app/[locale]/(common-layout)/user/[handle]/page/[pageSlug]/constants';
import type { ActionResponse } from '@/app/types';
import { Button } from '@/components/ui/button';
import { addTranslationFormAction } from './action';

interface AddTranslationFormProps {
  segmentId: number;
  currentHandle: string | undefined;
  targetContentType: TargetContentType;
}

export function AddTranslationForm({
  segmentId,
  currentHandle,
  targetContentType,
}: AddTranslationFormProps) {
  const locale = useLocale();
  const [addTranslationState, addTranslationAction, isAddingTranslation] =
    useActionState<ActionResponse, FormData>(addTranslationFormAction, {
      success: false,
    });

  return (
    <span className="mt-4 block px-4">
      <form action={addTranslationAction}>
        <input
          name="targetContentType"
          type="hidden"
          value={targetContentType}
        />
        <input name="segmentId" type="hidden" value={segmentId} />
        <input name="locale" type="hidden" value={locale} />
        <span className="relative">
          <TextareaAutosize
            className={`mb-2 w-full resize-none overflow-hidden rounded-xl border border-gray-500 bg-background p-2 text-base! ${!currentHandle && 'bg-muted'}`}
            disabled={!currentHandle}
            minRows={3}
            name="text"
            placeholder="Or enter your translation..."
            required
          />
          {!currentHandle && (
            <StartButton className="-translate-x-1/2 -translate-y-1/2 absolute top-1/2 left-1/2 transform" />
          )}
        </span>
        <span className="flex items-center justify-end space-x-2">
          {!addTranslationState.success &&
            addTranslationState.zodErrors?.text && (
              <p className="text-red-500 text-sm">
                {addTranslationState.zodErrors.text}
              </p>
            )}
          <Button
            className="rounded-xl"
            disabled={isAddingTranslation || !currentHandle}
            type="submit"
          >
            <ArrowUpFromLine className="h-4 w-4" />
            Submit
          </Button>
        </span>
      </form>
    </span>
  );
}
