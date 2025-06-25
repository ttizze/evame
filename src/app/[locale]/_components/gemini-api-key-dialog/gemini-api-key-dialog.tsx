'use client';
import { ArrowUpFromLine, ExternalLink, Loader2 } from 'lucide-react';
import { useActionState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  type GeminiApiKeyDialogState,
  updateGeminiApiKeyAction,
} from './action';

interface GeminiApiKeyDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GeminiApiKeyDialog({
  isOpen,
  onOpenChange,
}: GeminiApiKeyDialogProps) {
  const [state, formAction, isPending] = useActionState<
    GeminiApiKeyDialogState,
    FormData
  >(updateGeminiApiKeyAction, { success: false });

  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      onOpenChange(false);
    }
  }, [state.success, state.message, onOpenChange]);
  return (
    <Dialog onOpenChange={onOpenChange} open={isOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-center">Set Gemini API Key</DialogTitle>
        </DialogHeader>
        <div className="mb-4 text-center">
          <a
            className="inline-flex items-center gap-2 underline transition-colors hover:text-blue-500"
            href="https://aistudio.google.com/app/apikey"
            rel="noopener noreferrer"
            target="_blank"
          >
            <Button
              className="gap-2 shadow-md transition-shadow hover:shadow-lg"
              size="sm"
              variant="default"
            >
              <span className="">Get API Key at Google AI Studio</span>
              <ExternalLink className="h-4 w-4" />
            </Button>
          </a>
        </div>
        <form action={formAction}>
          <div className="flex items-center space-x-2">
            <Input
              className="grow"
              name="geminiApiKey"
              placeholder="Enter your Gemini API Key"
              required
              type="password"
            />
            <Button disabled={isPending} type="submit">
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUpFromLine className="h-4 w-4" />
              )}
            </Button>
          </div>
          {state.message && (
            <div className="mt-2 text-center text-red-500">{state.message}</div>
          )}
          <div className="mt-2 text-center text-red-500">
            {!state.success && state.zodErrors?.geminiApiKey}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
