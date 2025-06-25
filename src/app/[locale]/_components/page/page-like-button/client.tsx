'use client';

import { Heart } from 'lucide-react';
import { useActionState, useOptimistic } from 'react';
import { Button } from '@/components/ui/button';
import { type PageLikeButtonState, togglePageLikeAction } from './action';

type PageLikeButtonClientProps = {
  liked: boolean;
  likeCount: number;
  pageId: number;
  pageSlug: string;
  ownerHandle: string;
  showCount?: boolean;
  className?: string;
};

export function PageLikeButtonClient({
  liked,
  likeCount,
  pageId,
  pageSlug,
  ownerHandle,
  showCount,
  className = '',
}: PageLikeButtonClientProps) {
  const [state, formAction, isPending] = useActionState<
    PageLikeButtonState,
    FormData
  >(togglePageLikeAction, { success: false });

  const [optimisticLiked, updateOptimisticLiked] = useOptimistic(
    liked,
    (state, liked: boolean) => liked
  );

  const [optimisticCount, updateOptimisticCount] = useOptimistic(
    likeCount,
    (state, increment: boolean) => (increment ? state + 1 : state - 1)
  );
  const handleSubmit = async (formData: FormData) => {
    updateOptimisticLiked(!optimisticLiked);
    updateOptimisticCount(!optimisticLiked);
    formAction(formData);
  };
  return (
    <div className="flex items-center gap-2">
      <form action={handleSubmit}>
        <input name="pageId" type="hidden" value={pageId} />
        <input name="pageSlug" type="hidden" value={pageSlug} />
        <input name="ownerHandle" type="hidden" value={ownerHandle} />
        <Button
          aria-label="Like"
          className={`bg-background ${className}`}
          size="icon"
          type="submit"
          variant="ghost"
        >
          <Heart
            className={`h-5 w-5 rounded-full ${optimisticLiked ? 'text-red-500' : ''}`}
            fill={optimisticLiked ? 'currentColor' : 'none'}
          />
        </Button>
      </form>
      {showCount && (
        <span className="text-muted-foreground">{optimisticCount}</span>
      )}
    </div>
  );
}
