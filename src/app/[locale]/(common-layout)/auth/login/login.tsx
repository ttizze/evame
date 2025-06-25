'use client';
import { CheckCircle } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useActionState } from 'react';
import {
  type SignInWithResendState,
  signInWithResendAction,
} from '@/app/[locale]/auth-action';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Link } from '@/i18n/routing';
import { GoogleForm } from './_components/google-form';

export function Login() {
  const pathname = usePathname();
  const [state, formAction, isPending] = useActionState<
    SignInWithResendState,
    FormData
  >(signInWithResendAction, { success: false });

  return (
    <div className="container mx-auto max-w-md py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-center font-bold text-2xl">
            Login to Evame
            <CardDescription className="mt-2 flex flex-col items-center">
              Evame is multilingual blog platform.
              <Link className="underline" href="/about">
                Learn more
              </Link>
            </CardDescription>
          </CardTitle>
        </CardHeader>
        <CardContent className="rounded-full">
          <GoogleForm redirectTo={pathname} />
          <Separator className="my-4" />
          <div className="my-2 text-center text-gray-500 text-sm">
            Or continue with email
          </div>
          <form action={formAction}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  autoComplete="email"
                  className="rounded-lg"
                  name="email"
                  type="email"
                />
                {!state.success && state.zodErrors?.email && (
                  <p className="text-red-500 text-sm">
                    {state.zodErrors.email}
                  </p>
                )}
              </div>
              <Button className="w-full rounded-full" disabled={isPending}>
                Send Email
              </Button>
            </div>
            {state.success && (
              <div className="mt-4 space-y-3 p-4 text-center">
                <div className="flex items-center justify-center gap-2 ">
                  <CheckCircle className="h-5 w-5" />
                  <p className="font-medium">Email sent successfully!</p>
                </div>
                <p className="text-slate-600 text-sm">
                  Please check your email.
                </p>
              </div>
            )}
          </form>
          <div className="my-2 text-center text-gray-500 text-sm">
            Login means you agree to our{' '}
            <Link className="underline" href="/terms">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link className="underline" href="/privacy">
              Privacy Policy
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
