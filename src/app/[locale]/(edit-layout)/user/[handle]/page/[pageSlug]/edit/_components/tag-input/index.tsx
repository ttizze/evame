'use client';

import { X } from 'lucide-react';
import { useActionState, useRef, useState } from 'react';
import CreatableSelect from 'react-select/creatable';
import { cn } from '@/lib/utils';
import type { TagWithCount } from '../../_db/queries.server';
import { type EditPageTagsActionState, editPageTagsAction } from './action';

interface TagInputProps {
  initialTags: { id: number; name: string }[];
  allTagsWithCount: TagWithCount[];
  pageId: number | undefined;
}

export function TagInput({
  initialTags,
  allTagsWithCount,
  pageId,
}: TagInputProps) {
  const [tags, setTags] = useState<string[]>(
    initialTags.map((tag) => tag.name)
  );
  const formRef = useRef<HTMLFormElement>(null);

  const [editState, editAction, isPending] = useActionState<
    EditPageTagsActionState,
    FormData
  >(editPageTagsAction, { success: false });

  const handleCreateTag = (inputValue: string) => {
    if (tags.length < 5) {
      const updatedTags = [...tags, inputValue];
      setTags(updatedTags);
      setTimeout(() => {
        formRef.current?.requestSubmit();
      }, 0);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const updatedTags = tags.filter((tag) => tag !== tagToRemove);
    setTags(updatedTags);
    setTimeout(() => {
      formRef.current?.requestSubmit();
    }, 0);
  };

  return (
    <form action={editAction} ref={formRef}>
      <input name="pageId" type="hidden" value={pageId ?? ''} />
      <input
        data-testid="tags-input"
        name="tags"
        type="hidden"
        value={JSON.stringify(tags)}
      />

      <div className="flex flex-wrap items-center gap-2 pt-2 pb-3">
        {tags.map((tag) => (
          <div
            className={cn(
              'flex h-[32px] items-center gap-1 rounded-full bg-primary px-3 text-primary-foreground text-sm',
              isPending && 'cursor-not-allowed opacity-50'
            )}
            key={tag}
          >
            <button
              className="ml-1 hover:text-destructive"
              disabled={isPending}
              onClick={() => handleRemoveTag(tag)}
              type="button"
            >
              <X className="h-3 w-3" />
            </button>
            <span>{tag}</span>
          </div>
        ))}
        {tags.length < 5 && (
          <CreatableSelect
            classNames={{
              control: () =>
                cn(
                  'w-30 cursor-pointer rounded-full border border-border bg-transparent px-4 text-sm',
                  isPending || (!pageId && 'cursor-not-allowed opacity-50')
                ),
              valueContainer: () => 'w-full',
              placeholder: () => ' text-center flex items-center h-[32px]',
              input: () => 'm-0 p-0   h-[32px]',
              menu: () =>
                'bg-popover border border-border rounded-lg mt-2 w-50 rounded-sm min-w-60',
              option: (state) =>
                cn(
                  'w-40 cursor-pointer px-4 py-2',
                  state.isFocused && 'bg-accent'
                ),
            }}
            components={{
              DropdownIndicator: () => null,
              IndicatorSeparator: () => null,
            }}
            instanceId="tags-input"
            isClearable
            isDisabled={isPending || !pageId}
            onChange={(newValue) => {
              if (newValue?.value) {
                handleCreateTag(newValue.value);
              }
            }}
            options={allTagsWithCount
              .filter((tag) => !tags.includes(tag.name))
              .map((tag) => ({
                value: tag.name,
                label: `${tag.name} (${tag._count.pages})`,
              }))}
            placeholder="# Add tags"
            styles={{
              control: () => ({
                height: '32px',
              }),
            }}
            unstyled
            value={null}
          />
        )}
      </div>
      {!editState.success && editState.zodErrors?.tags && (
        <p className="text-red-500 text-sm">{editState.zodErrors.tags}</p>
      )}
      {!editState.success && editState.zodErrors?.pageId && (
        <p className="text-red-500 text-sm">Page not found</p>
      )}
    </form>
  );
}
