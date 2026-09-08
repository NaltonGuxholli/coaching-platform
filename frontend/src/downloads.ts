import { clearSession, getToken } from './client';
const API_URL = (
  (import.meta.env.VITE_API_URL as string | undefined) ||
  (import.meta.env.DEV ? 'http://localhost:3000' : '/api')
).replace(/\/$/, '');
export async function downloadText(path: string, filename: string) {
  const token = getToken();
  const response = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (response.status === 401) {
    clearSession();
    window.location.assign('/login');
  }
  if (!response.ok) throw new Error(`Download failed (${response.status})`);
  const body = (await response.json()) as { csv?: string };
  const url = URL.createObjectURL(
    new Blob([body.csv || ''], { type: 'text/csv;charset=utf-8' }),
  );
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
