import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

function getCredentialsFromBase64() {
  const base64Credentials = process.env.GOOGLE_ANALYTICS_CREDENTIALS_BASE64;
  if (!base64Credentials) {
    throw new Error('GOOGLE_ANALYTICS_CREDENTIALS_BASE64 is not defined');
  }
  const decodedCredentials = Buffer.from(base64Credentials, 'base64').toString(
    'utf-8'
  );
  return JSON.parse(decodedCredentials);
}

async function fetchTotalViewsForPath(
  client: BetaAnalyticsDataClient,
  propertyId: string,
  path: string
): Promise<number> {
  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate: '420daysAgo', endDate: 'today' }],
    dimensions: [{ name: 'pagePath' }],
    metrics: [{ name: 'screenPageViews' }],
    dimensionFilter: {
      filter: {
        fieldName: 'pagePath',
        stringFilter: {
          matchType: 'CONTAINS',
          value: path,
        },
      },
    },
    limit: 1,
  });
  if (!response.rows || response.rows.length === 0) return 0;
  return Number(response.rows[0].metricValues?.[0].value || 0);
}

const prisma = new PrismaClient();

async function main() {
  const propertyId = process.env.GOOGLE_ANALYTICS_PROPERTY_ID;
  if (!propertyId) {
    throw new Error('GOOGLE_ANALYTICS_PROPERTY_ID is not defined');
  }
  const gaClient = new BetaAnalyticsDataClient({
    credentials: getCredentialsFromBase64(),
  });

  const excludeHandle = process.env.EXCLUDE_USER_HANDLE || 'evame';

  // すべてのページ (除外ユーザー以外) とそのオーナー(handle) を取得
  const pages = await prisma.page.findMany({
    where: {
      user: {
        handle: {
          not: excludeHandle,
        },
      },
    },
    select: {
      id: true,
      slug: true,
      user: {
        select: { handle: true },
      },
    },
  });

  console.log(`Found ${pages.length} pages. Fetching GA view counts...`);

  for (const page of pages) {
    const path = `/user/${page.user.handle}/page/${page.slug}`;
    try {
      const views = await fetchTotalViewsForPath(gaClient, propertyId, path);
      await prisma.pageView.upsert({
        where: { pageId: page.id },
        update: { count: views },
        create: { pageId: page.id, count: views },
      });
      console.log(`Updated page ${page.slug} (${page.id}) with ${views} views`);
    } catch (err) {
      console.error(`Failed to update page ${page.slug}:`, err);
    }
  }
}

main()
  .then(() => {
    console.log('Seeding completed.');
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
