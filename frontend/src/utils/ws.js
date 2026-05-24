/**
 * Returns the correct WebSocket base URL.
 * In production (Vercel → Railway), uses VITE_WS_URL env var.
 * In dev, uses localhost:8000.
 */
export const getWsUrl = (path) => {
  const base = import.meta.env.VITE_WS_URL || 'ws://localhost:8000'
  return `${base}${path}`
}
