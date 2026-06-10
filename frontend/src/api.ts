/**
 * Returns the backend API base URL.
 * - In development: reads VITE_API_URL from .env (defaults to localhost:5000)
 * - In production (Vercel): reads from .env.production (Render URL baked in at build time)
 */
export const API_URL = import.meta.env.VITE_API_URL || 'https://mock-interview-platfrom.onrender.com';
