import Form from 'next/form';
import { useActionState } from 'react';
import { FcGoogle } from 'react-icons/fc';
import { signInWithGoogleAction } from '@/app/[locale]/auth-action';
import type { ActionResponse } from '@/app/types';
import { Button } from '@/components/ui/button';

export function GoogleForm({ redirectTo }: { redirectTo: string }) {
  const [, formAction, isPending] = useActionState<ActionResponse, FormData>(
    signInWithGoogleAction,
    { success: false }
  );
  return (
    <Form action={formAction} className="w-full ">
      <input name="redirectTo" type="hidden" value={redirectTo} />
      <Button
        className="h-12 w-full rounded-full text-md"
        disabled={isPending}
        variant="default"
      >
        <FcGoogle className="mr-2 h-6 w-6" />
        Google Login
      </Button>
    </Form>
  );
}
