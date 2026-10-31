// Helpers for the sidebar navigation.

// True when the link points at the page that is open now.
// "/" only matches the home page; other links also match their sub-pages.
export function isActivePath(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}
