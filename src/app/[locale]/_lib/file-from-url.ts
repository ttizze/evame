export async function fileFromUrl(url: string): Promise<File> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch failed: ${url}`);
  const blob = await res.blob();
  const ext = url.split('.').pop()?.split('?')[0] ?? 'png';
  return new File([blob], `remote.${ext}`, {
    type: blob.type || `image/${ext}`,
  });
}
// S3 / R2 など
