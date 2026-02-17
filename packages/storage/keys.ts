export function originalKey(userId: string, assetId: string, ext: string): string {
  return `assets/original/${userId}/${assetId}.${ext}`;
}

export function optimizedKey(userId: string, assetId: string): string {
  return `assets/optimized/${userId}/${assetId}.webp`;
}

export function thumbKey(userId: string, assetId: string, version: number): string {
  return `assets/thumb/${userId}/${assetId}_v${version}.webp`;
}
