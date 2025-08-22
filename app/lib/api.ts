// API Client para el frontend
export interface User {
  id: string
  nombre: string
  email: string
  whatsapp: string
  rol: string
  estado: string
}

export interface Order {
  id: string
  servicio: string
  perfiles: number
  meses: number
  monto: number
  estado: string
  fecha_creacion: string
  fecha_vencimiento?: string
}

export interface Payment {
  id: string
  order_id: string
  archivo_comprobante?: string
  resultado_ocr?: any
  validado_automatico: boolean
  validado_admin: boolean
  estado_final: string
  comentarios_admin?: string
  fecha_validacion?: string
  admin_id?: string
}

export interface Profile {
  id: string
  account_id: string
  nombre_perfil: string
  contraseña_perfil?: string
  estado: string
  user_id_asignado?: string
  order_id_asignado?: string
  fecha_asignacion?: string
  fecha_expiracion?: string
  ultimo_acceso?: string
  dispositivo_ultimo_acceso?: string
}

export interface Account {
  id: string
  servicio: string
  email: string
  password: string
  estado: string
  fecha_creacion: string
  ultimo_acceso?: string
  perfiles_disponibles: number
  notas_admin?: string
}

export interface Pricing {
  basePrice: number
  monthlyPrice: number
  totalPrice: number
  finalPrice: number
  savings: number
  savingsPercentage: number
}

export interface Service {
  id: number
  name: string
  logo: string
  description: string
  price: number
  features: string[]
  popular: boolean
}

class ApiClient {
  private baseUrl: string
  private token: string | null

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
    this.token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      if (error instanceof Error) {
        throw error
      }
      throw new Error('Network error')
    }
  }

  // Authentication
  async register(data: {
    nombre: string
    email: string
    whatsapp: string
    password: string
  }): Promise<{ token: string; user: User }> {
    const response = await this.request<{ token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    
    this.token = response.token
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', response.token)
    }
    
    return response
  }

  async login(data: { email: string; password: string }): Promise<{ token: string; user: User }> {
    const response = await this.request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    
    this.token = response.token
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', response.token)
    }
    
    return response
  }

  async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', { method: 'POST' })
    } catch (error) {
      // Ignore errors on logout
    } finally {
      this.token = null
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token')
      }
    }
  }

  async getProfile(): Promise<{ user: User }> {
    return this.request<{ user: User }>('/auth/profile')
  }

  async updateProfile(data: Partial<User>): Promise<{ user: User }> {
    return this.request<{ user: User }>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async changePassword(data: { currentPassword: string; newPassword: string }): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  // Orders
  async createOrder(data: {
    servicio: string
    perfiles: number
    meses: number
  }): Promise<{ order: Order }> {
    return this.request<{ order: Order }>('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getOrders(): Promise<{ orders: Order[] }> {
    return this.request<{ orders: Order[] }>('/orders')
  }

  async getOrder(id: string): Promise<{ order: Order }> {
    return this.request<{ order: Order }>(`/orders/${id}`)
  }

  async uploadProof(orderId: string, file: File): Promise<{ message: string }> {
    const formData = new FormData()
    formData.append('archivo_comprobante', file)

    const url = `${this.baseUrl}/orders/${orderId}/upload-proof`
    const headers: HeadersInit = {}
    
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`
    }

    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
    }

    return await response.json()
  }

  // Admin
  async getDashboard(): Promise<{ stats: any }> {
    return this.request<{ stats: any }>('/admin/dashboard')
  }

  async getAdminOrders(): Promise<{ orders: Order[] }> {
    return this.request<{ orders: Order[] }>('/admin/orders')
  }

  async approveOrder(orderId: string, comment?: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/admin/orders/${orderId}/approve`, {
      method: 'PUT',
      body: JSON.stringify({ comentarios_admin: comment }),
    })
  }

  async rejectOrder(orderId: string, comment?: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/admin/orders/${orderId}/reject`, {
      method: 'PUT',
      body: JSON.stringify({ comentarios_admin: comment }),
    })
  }

  async getPendingPayments(): Promise<{ payments: Payment[] }> {
    return this.request<{ payments: Payment[] }>('/admin/payments')
  }

  // WhatsApp
  async getWhatsAppStatus(): Promise<{ status: string; connected: boolean }> {
    return this.request<{ status: string; connected: boolean }>('/whatsapp/status')
  }

  async sendWhatsAppMessage(data: { to: string; message: string }): Promise<{ message: string }> {
    return this.request<{ message: string }>('/whatsapp/send-message', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async sendAccess(data: { orderId: string; message: string }): Promise<{ message: string }> {
    return this.request<{ message: string }>('/whatsapp/send-access', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async sendRenewalReminder(data: { orderId: string; message: string }): Promise<{ message: string }> {
    return this.request<{ message: string }>('/whatsapp/send-renewal-reminder', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async sendPaymentRejected(data: { orderId: string; message: string }): Promise<{ message: string }> {
    return this.request<{ message: string }>('/whatsapp/send-payment-rejected', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getOrderWhatsAppStatus(orderId: string): Promise<{ status: string; lastMessage?: string }> {
    return this.request<{ status: string; lastMessage?: string }>(`/whatsapp/orders/${orderId}/status`)
  }

  async bulkSend(data: { orders: string[]; message: string }): Promise<{ message: string; sent: number; failed: number }> {
    return this.request<{ message: string; sent: number; failed: number }>('/whatsapp/bulk-send', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }
}

// Singleton instance
export const apiClient = new ApiClient()

// Utility functions
export const isAuthenticated = (): boolean => {
  if (typeof window === 'undefined') return false
  return !!localStorage.getItem('token')
}

export const clearSession = (): void => {
  if (typeof window === 'undefined') return
  localStorage.removeItem('token')
}

export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('token')
}

// React hook for API client
export const useApi = () => {
  return apiClient
}
