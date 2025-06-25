'use client';

import { Loader2, SaveIcon } from 'lucide-react';
import { useActionState, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { GeminiApiKeyDialog } from '@/app/[locale]/_components/gemini-api-key-dialog/gemini-api-key-dialog';
import type { SanitizedUser } from '@/app/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { type UserEditState, userEditAction } from './user-edit-action';

interface SettingsFormProps {
  currentUser: SanitizedUser;
}

export function SettingsForm({ currentUser }: SettingsFormProps) {
  const [showHandleInput, setShowHandleInput] = useState(false);
  const [isApiKeyDialogOpen, setIsApiKeyDialogOpen] = useState(false);

  const [editState, editAction, isEditPending] = useActionState<
    UserEditState,
    FormData
  >(userEditAction, {
    success: true,
    data: {
      name: currentUser.name,
    },
  });

  useEffect(() => {
    if (editState.success && editState.message) {
      toast.success(editState.message);
    } else if (
      !editState.success &&
      editState.message &&
      !editState.zodErrors
    ) {
      toast.error(editState.message);
    }
  }, [editState]);

  return (
    <form action={editAction} className="space-y-4">
      <input name="name" type="hidden" value={currentUser.name} />
      {currentUser.profile && (
        <input name="profile" type="hidden" value={currentUser.profile} />
      )}
      {currentUser.twitterHandle && (
        <input
          name="twitterHandle"
          type="hidden"
          value={currentUser.twitterHandle}
        />
      )}

      <div className="space-y-4">
        <div>
          <Label className="mb-2 block font-medium text-base" htmlFor="handle">
            Handle
          </Label>
          <div className="space-y-3 rounded-lg bg-gray-50 p-4 dark:bg-gray-900/50">
            <div className="flex items-center justify-between">
              <code className="rounded-md border border-gray-200 bg-white px-3 py-1.5 font-mono text-sm dark:border-gray-700 dark:bg-gray-800">
                evame.tech/user/{currentUser.handle}
              </code>
              <Button
                onClick={() => setShowHandleInput(!showHandleInput)}
                type="button"
                variant="outline"
              >
                {showHandleInput ? 'Cancel' : 'Edit'}
              </Button>
            </div>

            {showHandleInput && (
              <div className="space-y-3">
                <div className="space-y-1 text-amber-500 text-sm">
                  <p>⚠️ Important: Changing your handle will:</p>
                  <ul className="list-inside list-disc space-y-1 pl-4">
                    <li>Update all URLs of your page</li>
                    <li>Break existing links to your page</li>
                    <li>Allow your current handle to be claimed by others</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <Label className="font-medium text-sm" htmlFor="handle-input">
                    New handle
                  </Label>
                  <div className="flex items-center gap-2">
                    <code className="text-gray-600 text-sm dark:text-gray-400">
                      evame.tech/user/
                    </code>
                    <Input
                      className="max-w-[200px] flex-1"
                      defaultValue={currentUser.handle}
                      id="handle-input"
                      maxLength={25}
                      minLength={3}
                      name="handle"
                      placeholder="your-handle"
                      required
                    />
                  </div>
                  {!editState.success && editState.zodErrors?.handle && (
                    <p className="text-red-500 text-sm">
                      {editState.zodErrors.handle}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="font-medium text-base">Gemini API Key</Label>
        <Button
          className="w-full"
          onClick={() => setIsApiKeyDialogOpen(true)}
          type="button"
          variant="outline"
        >
          Set API Key
        </Button>
      </div>
      <GeminiApiKeyDialog
        isOpen={isApiKeyDialogOpen}
        onOpenChange={setIsApiKeyDialogOpen}
      />

      <Button className="h-10 w-full" disabled={isEditPending} type="submit">
        {isEditPending ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : (
          <span className="flex items-center gap-2">
            <SaveIcon className="h-6 w-6" />
            Save
          </span>
        )}
      </Button>
    </form>
  );
}
