export function buildNextLink(currentUrl: string, nextId: string, perPage: number) {
  const url = new URL(currentUrl ?? '', 'http://local');
  url.searchParams.set('startid', nextId);
  url.searchParams.set('per_page', String(perPage));
  return url.pathname + (url.search ? url.search : '');
}
