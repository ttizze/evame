import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Prisma } from '@prisma/client';
import { PrismaClient } from '@prisma/client';
import fg from 'fast-glob';
import { customAlphabet } from 'nanoid';
import remarkParse from 'remark-parse';
import { unified } from 'unified';

const prisma = new PrismaClient();
const ROOT = './tipitaka2500/tipitaka';
const SYSTEM_UID = 'system';

// 子の並び順を簡単に付けるカウンタ
const orderCounter: Record<string, number> = {};

function nextOrder(key: string) {
  orderCounter[key] = (orderCounter[key] ?? 0) + 1;
  return orderCounter[key];
}

// Shared slug generator function
const generateSlug = () =>
  customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 12)();

async function createDirPage(
  userId: string,
  text: string,
  parentId: number | null
) {
  const slug = generateSlug();
  const { id } = await prisma.page.create({
    data: {
      parentId,
      slug,
      status: 'PUBLIC',
      sourceLocale: 'pi',
      mdastJson: {},
      order: nextOrder(String(parentId)),
      userId,
      pageSegments: {
        //TODO テキストのハッシュを指定する
        create: [{ number: 0, text, textAndOccurrenceHash: '' }],
      },
    },
  });
  return id;
}

async function seed() {
  const files = await fg('**/*.md', { cwd: ROOT, absolute: true });

  // ディレクトリ階層 → page.id をキャッシュ
  const dirMap = new Map<string, number>(); // key = relDir (without trailing slash)

  for (const absPath of files) {
    const relPath = path.relative(ROOT, absPath); // 2V/1/1.5/1.5.1/1.5.1.1.md
    const parts = relPath.split(path.sep);
    let parentId: number | null = null;
    let dirKey = '';
    const user = await prisma.user.findUnique({ where: { handle: 'evame' } });
    const userId = user?.id ?? SYSTEM_UID;

    // 1) 各ディレクトリをページとして生成
    for (let i = 0; i < parts.length - 1; i++) {
      dirKey = path.join(dirKey, parts[i]);
      if (!dirMap.has(dirKey)) {
        const id = await createDirPage(userId, parts[i], parentId);
        dirMap.set(dirKey, id);
      }
      parentId = dirMap.get(dirKey) ?? null;
    }

    // 2) ファイル本体
    const raw = await readFile(absPath, 'utf8');
    const h1 = raw.match(/^#\s+(.+?)$/m);
    const title = h1 ? h1[1].trim() : path.parse(absPath).name;

    const mdastJson = unified().use(remarkParse).parse(raw);

    await prisma.page.create({
      data: {
        parentId,
        order: nextOrder(String(parentId)),
        slug: generateSlug(),
        status: 'PUBLIC',
        sourceLocale: 'pi',
        mdastJson: mdastJson as unknown as Prisma.InputJsonValue,
        userId,
        pageSegments: {
          //TODO テキストのハッシュを指定する
          create: [{ number: 0, text: title, textAndOccurrenceHash: '' }],
        },
      },
    });
  }
  await prisma.$disconnect();
  console.log('✔︎ Tipiṭaka import finished');
}

seed().catch((e) => {
  console.error(e);
  prisma.$disconnect();
});
