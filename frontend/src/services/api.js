import axios from 'axios'
import { useAuthStore } from '@/store/authStore'

const BASE_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().getAccessToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ---------------------------------------------------------------------------
// Token-refresh interceptor
// ---------------------------------------------------------------------------
// `isRefreshing` and `failedQueue` are intentionally module-level so that
// multiple concurrent 401 responses share a single in-flight refresh rather
// than each triggering their own.  This is the standard pattern for axios
// token refresh and is safe because the module is a singleton in the bundle.
// ---------------------------------------------------------------------------
let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => (error ? reject(error) : resolve(token)))
  failedQueue = []
}

const PUBLIC_PATHS = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email', '/']

const forceLogout = () => {
  useAuthStore.getState().logout()
  const isPublic = PUBLIC_PATHS.some(
    (p) => window.location.pathname === p || window.location.pathname.startsWith('/register'),
  )
  if (!isPublic) window.location.href = '/login'
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config

    // Network error (no response) — do not log out
    if (!error.response) return Promise.reject(error)

    // Never retry the refresh endpoint itself to avoid infinite loops
    if (original.url?.includes('/auth/token/refresh/')) {
      forceLogout()
      return Promise.reject(error)
    }

    if (error.response.status !== 401 || original._retry) {
      return Promise.reject(error)
    }

    // Queue subsequent 401s while a refresh is already in flight
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      })
        .then((token) => {
          original.headers = original.headers || {}
          original.headers.Authorization = `Bearer ${token}`
          return api(original)
        })
        .catch((err) => Promise.reject(err))
    }

    original._retry = true
    isRefreshing = true

    const refreshToken = useAuthStore.getState().getRefreshToken()
    if (!refreshToken) {
      isRefreshing = false
      processQueue(error, null)
      forceLogout()
      return Promise.reject(error)
    }

    try {
      const { data } = await axios.post(`${BASE_URL}/auth/token/refresh/`, {
        refresh: refreshToken,
      })
      useAuthStore.getState().setTokens({ access: data.access })
      original.headers = original.headers || {}
      original.headers.Authorization = `Bearer ${data.access}`
      processQueue(null, data.access)
      return api(original)
    } catch (refreshError) {
      processQueue(refreshError, null)
      forceLogout()
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  },
)

export default api
