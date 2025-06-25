import { Loader2, Trash } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect } from 'react';
import { toast } from 'sonner';
import type { ActionResponse } from '@/app/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { archivePageAction } from './action';

interface DeletePageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pageId: number;
}

export function DeletePageDialog({
  open,
  onOpenChange,
  pageId,
}: DeletePageDialogProps) {
  const [archiveState, archiveAction, isArchiving] = useActionState<
    ActionResponse,
    FormData
  >(archivePageAction, { success: false });
  const router = useRouter();
  useEffect(() => {
    if (archiveState.success) {
      toast.success(archiveState.message);
      onOpenChange(false);
      router.refresh();
    }
  }, [archiveState, onOpenChange, router]);
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Trash className="mr-2 h-4 w-4" />
            Delete Page
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. Are you sure you want to delete this
            page?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <div className="flex w-full items-center justify-between gap-2">
            <Button
              className="w-1/2"
              onClick={() => onOpenChange(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <form action={archiveAction} className="w-1/2">
              <input name="pageId" type="hidden" value={pageId} />
              <Button
                className="w-full"
                disabled={isArchiving}
                type="submit"
                variant="destructive"
              >
                {isArchiving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash className="mr-2 h-4 w-4" />
                )}
                Delete
              </Button>
            </form>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
