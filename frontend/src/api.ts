/**
 * Returns the backend API base URL.
 * - In development: reads VITE_API_URL from .env (defaults to localhost:5000)
 * - In production (Vercel): reads from .env.production (Render URL baked in at build time)
 */
export const API_URL = import.meta.env.VITE_API_URL || 'https://mock-interview-platfrom.onrender.com';

export async function fetchJson(input: RequestInfo, init?: RequestInit) {
	// Log request details to help diagnose cases where HTML is returned instead of JSON
	try {
		console.debug('fetchJson request', { url: String(input), init: init ?? {} });
	} catch (e) {
		// ignore logging errors
	}

	const res = await fetch(input, init);
	const text = await res.text();
	const ct = res.headers.get('content-type') || '';

	if (!res.ok) {
		console.error('fetchJson error', { url: String(input), status: res.status, body: text });
		throw new Error(`Fetch failed ${res.status}: ${text}`);
	}

	if (!ct.includes('application/json')) {
		console.error('fetchJson unexpected content-type', { url: String(input), contentType: ct, body: text });
		throw new Error('Expected JSON response but received non-JSON body');
	}

	try {
		return JSON.parse(text);
	} catch (e) {
		console.error('fetchJson JSON parse error', { url: String(input), body: text, err: e });
		throw e;
	}
}
