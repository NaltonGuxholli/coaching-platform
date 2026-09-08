import { useEffect, useState } from 'react';
import { api, del, get, patch, post, getUser } from '../client';
import type { AsyncState, RecordValue } from './model';
export { del, patch, post, getUser };
export function useData<T>(path: string): AsyncState<T> { const [data, setData] = useState<T | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [version, setVersion] = useState(0); useEffect(() => { const controller = new AbortController(); setLoading(true); get<T>(path, { signal: controller.signal }).then(setData).catch((reason) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Unable to load data'); }).finally(() => { if (!controller.signal.aborted) setLoading(false); }); return () => controller.abort(); }, [path, version]); return { data, loading, error, reload: () => setVersion((value) => value + 1) }; }
export async function mutate(path: string, body?: RecordValue) { return api(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }); }
export function formatDate(value?: string) { return value ? new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not available'; }
export function formatMoney(value: number | string | undefined, currency = 'EUR') { return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number(value || 0) / (Number(value) > 1000 ? 100 : 1)); }
