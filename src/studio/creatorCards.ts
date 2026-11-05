export const creatorCardArt: Record<string, string> = {
  'lesson-player':'/studio/lesson-player.svg',
  'social-post':'/studio/social-post.svg',
  'price-editor':'/studio/price-editor.svg',
};

export function cardArtUrl(id: string) {
  return creatorCardArt[id];
}
