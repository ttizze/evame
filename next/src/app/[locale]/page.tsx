import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';

import { signIn } from "@/auth"

export default function HomePage() {
  const t = useTranslations('HomePage');
  return (
    <div>
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <Link href="/about">{t('about')}</Link>

      <form
        action={async () => {
          "use server"
          await signIn("google")
        }}
      >
        <button type="submit">Signin with Google</button>
      </form>
      <form
      action={async (formData) => {
        "use server"
        await signIn("resend", formData)
      }}
    >
      <input type="text" name="email" placeholder="Email" />
        <button type="submit">Signin with Resend</button>
      </form>
    </div>
  );
}