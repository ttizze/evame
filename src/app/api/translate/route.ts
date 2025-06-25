import { after } from 'next/server';
import { translate } from '@/features/translate/lib/translate.server';

export async function POST(request: Request) {
  const data = await request.json();
  const response = Response.json({ success: true });
  after(async () => {
    await translate(data);
  });
  return response;
}
