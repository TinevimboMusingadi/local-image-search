/** API base URL: empty = same origin (backend serves frontend); file: = Electron. */
export const API_BASE =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' && window.location?.protocol === 'file:'
    ? 'http://127.0.0.1:8000'
    : '');
