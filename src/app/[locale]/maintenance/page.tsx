// app/maintenance/page.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Site Under Maintenance | MySite',
  description:
    'We’re performing scheduled maintenance. Please check back soon.',
  robots: { index: false, follow: false },
};

export default function MaintenancePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-100 p-8 text-center">
      <h1 className="mb-4 font-bold text-4xl">We’ll be right back!</h1>

      <p className="mb-8 text-lg">
        Our site is currently undergoing scheduled maintenance.
        <br />
        We appreciate your patience—please try again in a little while.
      </p>

      <p className="text-gray-500 text-sm">
        &copy; {new Date().getFullYear()} Evame
      </p>
    </main>
  );
}
