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
}

export interface Account {
  id: string
  servicio: string
  email: string
  password: string
  estado: string
  perfiles_disponibles: number
  notas_admin?: string
}

export interface Service {
  id: string
  nombre: string
  logo: string
  descripcion?: string
  precio_base: number
  max_perfiles: number
  descuento_3_meses: number
  descuento_6_meses: number
  descuento_12_meses: number
  descuento_perfil_adicional: number
  estado: string
  popular: boolean
}

export interface Pricing {
  basePrice: number
  finalPrice: number
  savings: number
  monthDiscount: number
  profileDiscount: number
}

export interface ApiResponse<T> {
  data?: T
  message?: string
  code?: string
  error?: string
}

class ApiClient {
  private baseUrl: string
  private token: string | null

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
    this.token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  }

  private setToken(token: string) {
    this.token = token
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token)
    }
  }

  private clearToken() {
    this.token = null
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token')
    }
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

  // ===== AUTENTICACIÓN =====

  async register(userData: {
    nombre: string
    email: string
    whatsapp: string
    password: string
  }): Promise<{ user: User; token: string }> {
    const response = await this.request<{ user: User; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    })
    this.setToken(response.token)
    return response
  }

  async login(credentials: { email: string; password: string }): Promise<{ user: User; token: string }> {
    const response = await this.request<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    })
    this.setToken(response.token)
    return response
  }

  async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', { method: 'POST' })
    } finally {
      this.clearToken()
    }
  }

  async getProfile(): Promise<{ user: User }> {
    return this.request<{ user: User }>('/auth/profile')
  }

  async updateProfile(profileData: { nombre?: string; whatsapp?: string }): Promise<{ user: User }> {
    return this.request<{ user: User }>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    })
  }

  async changePassword(passwordData: {
    currentPassword: string
    newPassword: string
    confirmPassword: string
  }): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify(passwordData),
    })
  }

  // ===== ÓRDENES =====

  async createOrder(orderData: {
    servicio: string
    perfiles: number
    meses: number
  }): Promise<{ order: Order; pricing: Pricing }> {
    return this.request<{ order: Order; pricing: Pricing }>('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    })
  }

  async getOrders(): Promise<{ orders: Order[] }> {
    return this.request<{ orders: Order[] }>('/orders')
  }

  async getOrder(id: string): Promise<{ order: Order }> {
    return this.request<{ order: Order }>(`/orders/${id}`)
  }

  async uploadProof(orderId: string, proofData: { archivo_comprobante: string }): Promise<{
    message: string
    payment: Payment
    order: Order
  }> {
    return this.request<{
      message: string
      payment: Payment
      order: Order
    }>(`/orders/${orderId}/upload-proof`, {
      method: 'PUT',
      body: JSON.stringify(proofData),
    })
  }

  // ===== ADMIN =====

  async getDashboard(): Promise<{
    stats: {
      totalOrders: number
      pendingOrders: number
      approvedOrders: number
      rejectedOrders: number
      totalRevenue: number
      pendingPayments: number
    }
  }> {
    return this.request<{
      stats: {
        totalOrders: number
        pendingOrders: number
        approvedOrders: number
        rejectedOrders: number
        totalRevenue: number
        pendingPayments: number
      }
    }>('/admin/dashboard')
  }

  async getAdminOrders(params?: {
    page?: number
    limit?: number
    status?: string
  }): Promise<{
    orders: Order[]
    total: number
    totalPages: number
    currentPage: number
  }> {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.status) queryParams.append('status', params.status)

    const endpoint = `/admin/orders${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    return this.request<{
      orders: Order[]
      total: number
      totalPages: number
      currentPage: number
    }>(endpoint)
  }

  async approveOrder(orderId: string, comentarios?: string): Promise<{ message: string; order: Order }> {
    return this.request<{ message: string; order: Order }>(`/admin/orders/${orderId}/approve`, {
      method: 'PUT',
      body: JSON.stringify({ comentarios_admin: comentarios }),
    })
  }

  async rejectOrder(orderId: string, reason: string): Promise<{ message: string; order: Order }> {
    return this.request<{ message: string; order: Order }>(`/admin/orders/${orderId}/reject`, {
      method: 'PUT',
      body: JSON.stringify({ comentarios_admin: reason }),
    })
  }

  async getPayments(): Promise<{ payments: Payment[] }> {
    return this.request<{ payments: Payment[] }>('/admin/payments')
  }

  // ===== SERVICIOS =====

  async getServices(): Promise<{ services: Service[] }> {
    return this.request<{ services: Service[] }>('/admin/services')
  }

  async createService(serviceData: {
    nombre: string
    logo: string
    descripcion?: string
    precio_base: number
    max_perfiles: number
    descuento_3_meses: number
    descuento_6_meses: number
    descuento_12_meses: number
    descuento_perfil_adicional: number
  }): Promise<{ service: Service }> {
    return this.request<{ service: Service }>('/admin/services', {
      method: 'POST',
      body: JSON.stringify(serviceData),
    })
  }

  async updateService(serviceId: string, serviceData: Partial<Service>): Promise<{ service: Service }> {
    return this.request<{ service: Service }>(`/admin/services/${serviceId}`, {
      method: 'PUT',
      body: JSON.stringify(serviceData),
    })
  }

  // ===== CUENTAS =====

  async getAccounts(): Promise<{ accounts: Account[] }> {
    return this.request<{ accounts: Account[] }>('/admin/accounts')
  }

  async createAccount(accountData: {
    servicio: string
    email: string
    password: string
    perfiles_disponibles: number
    notas_admin?: string
  }): Promise<{ account: Account }> {
    return this.request<{ account: Account }>('/admin/accounts', {
      method: 'POST',
      body: JSON.stringify(accountData),
    })
  }

  // ===== WHATSAPP =====

  async getWhatsAppStatus(): Promise<{ status: string; isConnected: boolean }> {
    return this.request<{ status: string; isConnected: boolean }>('/whatsapp/status')
  }

  async sendMessage(phone: string, message: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('/whatsapp/send-message', {
      method: 'POST',
      body: JSON.stringify({ phone, message }),
    })
  }

  async sendAccess(phone: string, orderData: Order, credentials: any): Promise<{ message: string }> {
    return this.request<{ message: string }>('/whatsapp/send-access', {
      method: 'POST',
      body: JSON.stringify({ phone, orderData, credentials }),
    })
  }

  async sendRenewalReminder(phone: string, orderData: Order): Promise<{ message: string }> {
    return this.request<{ message: string }>('/whatsapp/send-renewal-reminder', {
      method: 'POST',
      body: JSON.stringify({ phone, orderData }),
    })
  }

  async sendPaymentRejected(phone: string, orderData: Order, reason: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('/whatsapp/send-payment-rejected', {
      method: 'POST',
      body: JSON.stringify({ phone, orderData, reason }),
    })
  }

  async getOrderStatus(orderId: string): Promise<{ status: string; details: any }> {
    return this.request<{ status: string; details: any }>(`/whatsapp/orders/${orderId}/status`)
  }

  async bulkSend(messages: Array<{ phone: string; message: string }>): Promise<{ results: any[] }> {
    return this.request<{ results: any[] }>('/whatsapp/bulk-send', {
      method: 'POST',
      body: JSON.stringify({ messages }),
    })
  }
}

// Instancia singleton del cliente API
export const apiClient = new ApiClient()

// Funciones de utilidad para autenticación
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

// Hook personalizado para usar la API en componentes React
export const useApi = () => {
  return {
    apiClient,
    isAuthenticated,
    clearSession,
    getToken,
  }
}
