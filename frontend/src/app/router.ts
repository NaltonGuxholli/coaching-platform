export function navigate(path: string) { window.history.pushState({}, '', path); window.dispatchEvent(new PopStateEvent('popstate')); }
export function currentPath() { return window.location.pathname.replace(/\/$/, '') || '/'; }
