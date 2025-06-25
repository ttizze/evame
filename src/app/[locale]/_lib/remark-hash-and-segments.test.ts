import { remark } from 'remark';
import type { VFile } from 'vfile';
import { describe, expect, it } from 'vitest';
import {
  remarkHashAndSegments,
  type SegmentDraft,
} from './remark-hash-and-segments';

describe('remarkHashAndSegments', () => {
  it('パラグラフや見出しがsegments化され、number/hash/textが正しく付与される', async () => {
    const md = 'Paragraph1\n\nParagraph2';
    const file = (await remark()
      .use(remarkHashAndSegments('Title'))
      .process(md)) as VFile & { data: { segments: SegmentDraft[] } };
    expect(file.data.segments).toMatchObject([
      { text: 'Title', number: 0, hash: expect.any(String) },
      { text: 'Paragraph1', number: 1, hash: expect.any(String) },
      { text: 'Paragraph2', number: 2, hash: expect.any(String) },
    ]);
  });

  it('同じテキストが複数回出てもhashが異なる', async () => {
    const md = '# Title\n\nSame\n\nSame';
    const file = (await remark()
      .use(remarkHashAndSegments('Title'))
      .process(md)) as VFile & { data: { segments: SegmentDraft[] } };
    const sameSegs = (file.data.segments as SegmentDraft[]).filter(
      (s: SegmentDraft) => s.text === 'Same'
    );
    expect(sameSegs.length).toBe(2);
    expect(sameSegs[0].hash).not.toBe(sameSegs[1].hash);
  });

  it('タイトルと本文で同じテキストでもhashが異なる', async () => {
    const md = '# Title\n\nTitle';
    const file = (await remark()
      .use(remarkHashAndSegments('Title'))
      .process(md)) as VFile & { data: { segments: SegmentDraft[] } };
    const titleSegs = (file.data.segments as SegmentDraft[]).filter(
      (s: SegmentDraft) => s.text === 'Title'
    );
    expect(titleSegs.length).toBe(3); // header, heading, paragraph
    expect(new Set(titleSegs.map((s: SegmentDraft) => s.hash)).size).toBe(3);
  });

  it('編集して入れ替わってもsegmentsはhashが維持される', async () => {
    const md1 = 'A\n\nB\n\nC';
    const file1 = (await remark()
      .use(remarkHashAndSegments())
      .process(md1)) as VFile & { data: { segments: SegmentDraft[] } };
    const map1 = new Map(
      (file1.data.segments as SegmentDraft[]).map((s: SegmentDraft) => [
        s.text,
        s.hash,
      ])
    );
    const md2 = 'A\n\nC\n\nB';
    const file2 = (await remark()
      .use(remarkHashAndSegments())
      .process(md2)) as VFile & { data: { segments: SegmentDraft[] } };
    const map2 = new Map(
      (file2.data.segments as SegmentDraft[]).map((s: SegmentDraft) => [
        s.text,
        s.hash,
      ])
    );
    for (const [text, hash] of map1.entries()) {
      expect(map2.get(text)).toBe(hash);
    }
    expect((file2.data.segments as SegmentDraft[]).length).toBe(
      (file1.data.segments as SegmentDraft[]).length
    );
  });

  it('リストやblockquoteもsegments化される', async () => {
    const md = '- item1\n- item2\n\n> quote';
    const file = (await remark()
      .use(remarkHashAndSegments())
      .process(md)) as VFile & { data: { segments: SegmentDraft[] } };
    const texts = (file.data.segments as SegmentDraft[]).map(
      (s: SegmentDraft) => s.text
    );
    expect(texts).toEqual(['item1', 'item2', 'quote']);
  });

  it('---(hr)やcode block, 空行はsegments化されない', async () => {
    const md = 'A\n\n---\n\nB\n\n    code block\n\nC\n\n\n';
    const file = (await remark()
      .use(remarkHashAndSegments())
      .process(md)) as VFile & { data: { segments: SegmentDraft[] } };
    const texts = (file.data.segments as SegmentDraft[]).map(
      (s: SegmentDraft) => s.text
    );
    expect(texts).toContain('A');
    expect(texts).toContain('B');
    expect(texts).toContain('C');
    expect(texts.some((t: string) => t.includes('code block'))).toBe(false);
    expect(texts.some((t: string) => t.includes('---'))).toBe(false);
  });

  it('table cellもsegments化される', async () => {
    const md = '| a | b |\n|---|---|\n| c | d |';
    const file = (await remark()
      .use(remarkHashAndSegments())
      .process(md)) as VFile & { data: { segments: SegmentDraft[] } };
    const texts = (file.data.segments as SegmentDraft[]).map(
      (t: SegmentDraft) => t.text
    );
    // セル内容が含まれているか部分一致で検証
    expect(texts.some((t: string) => t.includes('a'))).toBe(true);
    expect(texts.some((t: string) => t.includes('b'))).toBe(true);
    expect(texts.some((t: string) => t.includes('c'))).toBe(true);
    expect(texts.some((t: string) => t.includes('d'))).toBe(true);
  });

  it('imgはsegments化されない', async () => {
    const md = 'A\n\n![alt](image.png)\n\nB';
    const file = (await remark()
      .use(remarkHashAndSegments())
      .process(md)) as VFile & { data: { segments: SegmentDraft[] } };
    const texts = (file.data.segments as SegmentDraft[]).map(
      (s: SegmentDraft) => s.text
    );
    expect(texts).toContain('A');
    expect(texts).toContain('B');
    // 画像altやURLがsegmentに含まれないこと
    expect(texts.some((t: string) => t.includes('image.png'))).toBe(false);
    // alt属性もsegmentに含まれないこと（includeImageAlt: falseの効果）
    expect(texts.some((t: string) => t.includes('alt'))).toBe(false);
  });

  it('段落内の画像alt属性は翻訳対象にならない', async () => {
    const md = 'Text with ![important description](image.jpg) inline image.';
    const file = (await remark()
      .use(remarkHashAndSegments())
      .process(md)) as VFile & { data: { segments: SegmentDraft[] } };
    const texts = (file.data.segments as SegmentDraft[]).map(
      (s: SegmentDraft) => s.text
    );
    // テキスト部分は含まれる
    expect(texts.some((t: string) => t.includes('Text with'))).toBe(true);
    expect(texts.some((t: string) => t.includes('inline image'))).toBe(true);
    // alt属性は含まれない（includeImageAlt: falseの効果）
    expect(texts.some((t: string) => t.includes('important description'))).toBe(
      false
    );
    // 画像URLも含まれない
    expect(texts.some((t: string) => t.includes('image.jpg'))).toBe(false);
  });
});
