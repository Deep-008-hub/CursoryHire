import axios from 'axios'

const isLocalhost = window.location.hostname === 'localhost'

const BASE_URL = isLocalhost 
  ? '/api'  
  : 'https://cursoryhire-production.up.railway.app'

const api = axios.create({ baseURL: BASE_URL })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ch_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('ch_token')
      localStorage.removeItem('ch_user')
      window.location.href = '/'
    }
    return Promise.reject(err)
  }
)

export default api