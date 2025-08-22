// Configuración de la API
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// Tipos de datos
export interface User {
  id: string;
  nombre: string;
  email: string;
  whatsapp: string;
  rol: 'cliente' | 'admin';
  estado: 'activo' | 'suspendido' | 'eliminado';
  ultimo_acceso?: string;
  fecha_creacion: string;
}

export interface Order {
  id: string;
  servicio: 'Netflix' | 'Disney+' | 'HBO Max' | 'Amazon Prime' | 'Paramount+' | 'Apple TV+';
  perfiles: number;
  meses: number;
  monto: number;
  estado: 'pendiente' | 'validando' | 'aprobado' | 'rechazado' | 'cancelado';
  fecha_creacion: string;
  fecha_vencimiento?: string;
  fecha_aprobacion?: string;
  comentarios_admin?: string;
  payment?: Payment;
  profiles?: Profile[];
}

export interface Payment {
  id: string;
  order_id: string;
  archivo_comprobante: string;
  resultado_ocr?: any;
  validado_automatico: boolean;
  validado_admin: boolean;
  estado_final: 'pendiente' | 'aprobado' | 'rechazado';
  comentarios_admin?: string;
  fecha_validacion?: string;
}

export interface Profile {
  id: string;
  account_id: string;
  nombre_perfil: string;
  contraseña_perfil?: string;
  estado: 'libre' | 'asignado' | 'bloqueado';
  user_id_asignado?: string;
  order_id_asignado?: string;
  fecha_asignacion?: string;
  fecha_expiracion?: string;
}

export interface Account {
  id: string;
  servicio: string;
  email: string;
  password: string;
  estado: 'activo' | 'suspendido' | 'bloqueado';
  perfiles_disponibles: number;
}

export interface Pricing {
  basePrice: number;
  monthlyPrice: number;
  totalPrice: number;
  monthDiscount: number;
  profileDiscount: number;
  savings: number;
}

export interface Service {
  id: number;
  name: string;
  logo: string;
  description: string;
  price: number;
  features: string[];
  popular: boolean;
}

// Clase para manejar la API
class ApiClient {
  private baseUrl: string;
  private token: string | null;

  constructor() {
    this.baseUrl = API_BASE_URL;
    this.token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  }

  // Método para establecer el token
  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
    }
  }

  // Método para limpiar el token
  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
    }
  }

  // Método para obtener headers
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  // Método para hacer requests
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config: RequestInit = {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Métodos de autenticación
  async register(userData: {
    nombre: string;
    email: string;
    whatsapp: string;
    password: string;
  }): Promise<{ user: User; token: string; message: string; code: string }> {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async login(credentials: {
    email: string;
    password: string;
  }): Promise<{ user: User; token: string; message: string; code: string }> {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    
    if (response.token) {
      this.setToken(response.token);
    }
    
    return response;
  }

  async logout(): Promise<{ message: string; code: string }> {
    const response = await this.request('/auth/logout', {
      method: 'POST',
    });
    
    this.clearToken();
    return response;
  }

  async getProfile(): Promise<{ user: User; code: string }> {
    return this.request('/auth/profile');
  }

  async updateProfile(updates: {
    nombre?: string;
    whatsapp?: string;
  }): Promise<{ user: User; message: string; code: string }> {
    return this.request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async changePassword(passwords: {
    currentPassword: string;
    newPassword: string;
  }): Promise<{ message: string; code: string }> {
    return this.request('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify(passwords),
    });
  }

  // Métodos de órdenes
  async createOrder(orderData: {
    servicio: string;
    perfiles: number;
    meses: number;
  }): Promise<{
    message: string;
    order: Order;
    pricing: Pricing;
    code: string;
  }> {
    return this.request('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  }

  async getOrders(): Promise<{ orders: Order[]; code: string }> {
    return this.request('/orders');
  }

  async getOrder(orderId: string): Promise<{ order: Order; code: string }> {
    return this.request(`/orders/${orderId}`);
  }

  async uploadProof(
    orderId: string,
    proofFile: File
  ): Promise<{
    message: string;
    payment: Payment;
    order: Order;
    code: string;
  }> {
    const formData = new FormData();
    formData.append('archivo_comprobante', proofFile);

    return this.request(`/orders/${orderId}/upload-proof`, {
      method: 'PUT',
      headers: {}, // No incluir Content-Type para FormData
      body: formData,
    });
  }

  // Métodos de admin (solo para usuarios admin)
  async getDashboard(): Promise<{ stats: any; code: string }> {
    return this.request('/admin/dashboard');
  }

  async getAdminOrders(params?: {
    page?: number;
    limit?: number;
    estado?: string;
    servicio?: string;
  }): Promise<{
    orders: Order[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
    code: string;
  }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.estado) queryParams.append('estado', params.estado);
    if (params?.servicio) queryParams.append('servicio', params.servicio);

    const endpoint = `/admin/orders${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.request(endpoint);
  }

  async approveOrder(
    orderId: string,
    comentarios?: string
  ): Promise<{ message: string; order: Order; code: string }> {
    return this.request(`/admin/orders/${orderId}/approve`, {
      method: 'PUT',
      body: JSON.stringify({ comentarios_admin: comentarios }),
    });
  }

  async rejectOrder(
    orderId: string,
    comentarios: string
  ): Promise<{ message: string; order: Order; code: string }> {
    return this.request(`/admin/orders/${orderId}/reject`, {
      method: 'PUT',
      body: JSON.stringify({ comentarios_admin: comentarios }),
    });
  }

  async getPendingPayments(): Promise<{ payments: Payment[]; code: string }> {
    return this.request('/admin/payments');
  }

  // Métodos de WhatsApp
  async getWhatsAppStatus(): Promise<{
    status: string;
    isConnected: boolean;
    code: string;
  }> {
    return this.request('/whatsapp/status');
  }

  async sendWhatsAppMessage(data: {
    to: string;
    message: string;
  }): Promise<{ message: string; to: string; code: string }> {
    return this.request('/whatsapp/send-message', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async sendAccessCredentials(orderId: string): Promise<{
    message: string;
    successCount: number;
    totalProfiles: number;
    code: string;
  }> {
    return this.request('/whatsapp/send-access', {
      method: 'POST',
      body: JSON.stringify({ orderId }),
    });
  }

  async sendRenewalReminder(orderId: string): Promise<{
    message: string;
    orderId: string;
    code: string;
  }> {
    return this.request('/whatsapp/send-renewal-reminder', {
      method: 'POST',
      body: JSON.stringify({ orderId }),
    });
  }

  async sendPaymentRejected(data: {
    orderId: string;
    reason: string;
  }): Promise<{ message: string; orderId: string; code: string }> {
    return this.request('/whatsapp/send-payment-rejected', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Método para obtener estado de WhatsApp para una orden específica
  async getWhatsAppOrderStatus(orderId: string): Promise<{
    orderId: string;
    whatsappStatus: string;
    isConnected: boolean;
    userWhatsApp: string;
    code: string;
  }> {
    return this.request(`/whatsapp/orders/${orderId}/status`);
  }

  // Método para envío masivo de mensajes (solo admin)
  async sendBulkMessage(data: {
    message: string;
    filters?: {
      estado?: string;
      servicio?: string;
    };
  }): Promise<{
    message: string;
    totalUsers: number;
    successCount: number;
    failedCount: number;
    results: any[];
    code: string;
  }> {
    return this.request('/whatsapp/bulk-send', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Método para health check
  async healthCheck(): Promise<{
    status: string;
    timestamp: string;
    uptime: number;
    environment: string;
    database: string;
    whatsapp: string;
    cron: string;
  }> {
    return this.request('/health');
  }
}

// Instancia singleton del cliente API
export const apiClient = new ApiClient();

// Hook personalizado para usar la API en componentes React
export const useApi = () => {
  return apiClient;
};

// Función para verificar si el usuario está autenticado
export const isAuthenticated = (): boolean => {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem('token');
};

// Función para obtener el token
export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
};

// Función para limpiar la sesión
export const clearSession = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

// Función para manejar errores de API
export const handleApiError = (error: any): string => {
  if (error.message) {
    return error.message;
  }
  
  if (error.error) {
    return error.error;
  }
  
  return 'Ocurrió un error inesperado';
};

// Función para formatear respuestas de la API
export const formatApiResponse = <T>(response: any): T => {
  if (response.code && response.code.startsWith('SUCCESS')) {
    return response;
  }
  
  throw new Error(response.message || 'Respuesta de API inválida');
};
