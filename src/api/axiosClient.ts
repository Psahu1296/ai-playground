import axios from 'axios'
import type { InternalAxiosRequestConfig } from 'axios'
import { DHABA_API_KEY } from '../env'

// Strongly typed Dhaba Axios Client
export const dhabaAxios = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
})

// Strongly typed Research Axios Client (if they add key or standard requests)
export const researchAxios = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
})

// Helper to attach authorization dynamically using Axios headers setting
const attachDhabaHeaders = (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
  if (DHABA_API_KEY) {
    config.headers.set('X-API-Key', DHABA_API_KEY)
  } else {
    try {
      const raw = localStorage.getItem('dhaba_auth')
      if (raw) {
        const parsed = JSON.parse(raw) as { token?: string }
        if (parsed.token) {
          config.headers.set('Authorization', `Bearer ${parsed.token}`)
        }
      }
    } catch (e) {
      console.warn('Error reading dhaba authentication key', e)
    }
  }
  return config
}

dhabaAxios.interceptors.request.use(attachDhabaHeaders)
