'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  UserIcon, 
  ShoppingCartIcon, 
  ClockIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  EyeIcon,
  PlusIcon,
  LogoutIcon
} from '@heroicons/react/24/outline'
import { apiClient, isAuthenticated, clearSession } from '../lib/api'

interface Order {
  id: string
  servicio: string
  perfiles: number
  meses: number
  monto: number
  estado: string
  fecha_creacion: string
  fecha_vencimiento?: string
  payment?: {
    estado_final: string
    resultado_ocr?: any
  }
}

interface User {
  id: string
  nombre: string
  email: string
  whatsapp: string
  rol: string
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/auth/login')
      return
    }

    loadDashboard()
  }, [router])

  const loadDashboard = async () => {
    try {
      setIsLoading(true)
      
      // Cargar perfil del usuario
      const profileResponse = await apiClient.getProfile()
      setUser(profileResponse.user)
      
      // Cargar órdenes del usuario
      const ordersResponse = await apiClient.getOrders()
      setOrders(ordersResponse.orders)
      
    } catch (error: any) {
      setError(error.message || 'Error al cargar el dashboard')
      if (error.message?.includes('token')) {
        clearSession()
        router.push('/auth/login')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    clearSession()
    router.push('/')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800'
      case 'validando':
        return 'bg-blue-100 text-blue-800'
      case 'aprobado':
        return 'bg-green-100 text-green-800'
      case 'rechazado':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pendiente':
        return <ClockIcon className="h-5 w-5" />
      case 'validando':
        return <EyeIcon className="h-5 w-5" />
      case 'aprobado':
        return <CheckCircleIcon className="h-5 w-5" />
      case 'rechazado':
        return <XCircleIcon className="h-5 w-5" />
      default:
        return <ClockIcon className="h-5 w-5" />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Usuario no encontrado</p>
          <Link href="/auth/login" className="text-indigo-600 hover:text-indigo-500">
            Volver al login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <span className="text-2xl mr-3">🎬</span>
              <h1 className="text-2xl font-bold text-gray-900">Mi Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <UserIcon className="h-5 w-5 text-gray-400" />
                <span className="text-gray-700">{user.nombre}</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                <LogoutIcon className="h-5 w-5" />
                <span>Cerrar sesión</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ShoppingCartIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total de Órdenes
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {orders.length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ClockIcon className="h-6 w-6 text-yellow-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Pendientes
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {orders.filter(o => o.estado === 'pendiente').length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircleIcon className="h-6 w-6 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Aprobadas
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {orders.filter(o => o.estado === 'aprobado').length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <XCircleIcon className="h-6 w-6 text-red-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Rechazadas
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {orders.filter(o => o.estado === 'rechazado').length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Nueva Orden
          </Link>
        </div>

        {/* Orders List */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Historial de Órdenes
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Todas tus órdenes y su estado actual
            </p>
          </div>
          
          {orders.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCartIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No hay órdenes</h3>
              <p className="mt-1 text-sm text-gray-500">
                Comienza creando tu primera orden de streaming.
              </p>
              <div className="mt-6">
                <Link
                  href="/"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Crear Orden
                </Link>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {orders.map((order) => (
                <li key={order.id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <span className="text-2xl">
                            {order.servicio === 'Netflix' ? '🎬' : 
                             order.servicio === 'Disney+' ? '🏰' : 
                             order.servicio === 'HBO Max' ? '📺' : 
                             order.servicio === 'Amazon Prime' ? '📦' : '🎭'}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="flex items-center">
                            <p className="text-sm font-medium text-indigo-600 truncate">
                              {order.servicio}
                            </p>
                            <div className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.estado)}`}>
                              {getStatusIcon(order.estado)}
                              <span className="ml-1 capitalize">{order.estado}</span>
                            </div>
                          </div>
                          <div className="mt-1 flex items-center text-sm text-gray-500">
                            <span>{order.perfiles} perfil{order.perfiles > 1 ? 'es' : ''}</span>
                            <span className="mx-2">•</span>
                            <span>{order.meses} mes{order.meses > 1 ? 'es' : ''}</span>
                            <span className="mx-2">•</span>
                            <span>${order.monto}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right text-sm text-gray-500">
                        <p>Creada: {formatDate(order.fecha_creacion)}</p>
                        {order.fecha_vencimiento && (
                          <p>Vence: {formatDate(order.fecha_vencimiento)}</p>
                        )}
                      </div>
                    </div>
                    
                    {/* Payment Status */}
                    {order.payment && (
                      <div className="mt-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <span className="text-sm text-gray-500">Estado del pago:</span>
                            <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              order.payment.estado_final === 'aprobado' ? 'bg-green-100 text-green-800' :
                              order.payment.estado_final === 'rechazado' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {order.payment.estado_final}
                            </span>
                          </div>
                          
                          {order.estado === 'pendiente' && !order.payment.archivo_comprobante && (
                            <Link
                              href={`/orders/${order.id}/upload`}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
                            >
                              Subir Comprobante
                            </Link>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
