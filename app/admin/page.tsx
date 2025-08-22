'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ChartBarIcon, 
  ShoppingCartIcon, 
  ClockIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  EyeIcon,
  UserIcon,
  ArrowRightOnRectangleIcon,
  DocumentTextIcon
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
  user: {
    nombre: string
    email: string
    whatsapp: string
  }
  payment?: {
    estado_final: string
    resultado_ocr?: any
    archivo_comprobante?: string
  }
}

interface DashboardStats {
  totalOrders: number
  pendingOrders: number
  approvedOrders: number
  rejectedOrders: number
  totalRevenue: number
  pendingPayments: number
}

export default function AdminPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
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
      
      // Cargar estadísticas del dashboard
      const dashboardResponse = await apiClient.getDashboard()
      setStats(dashboardResponse.stats)
      
      // Cargar órdenes
      const ordersResponse = await apiClient.getAdminOrders()
      setOrders(ordersResponse.orders)
      
    } catch (error: any) {
      setError(error.message || 'Error al cargar el dashboard')
      if (error.message?.includes('token') || error.message?.includes('admin')) {
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

  const openOrderModal = (order: Order) => {
    setSelectedOrder(order)
    setIsModalOpen(true)
  }

  const closeOrderModal = () => {
    setSelectedOrder(null)
    setIsModalOpen(false)
  }

  const handleApproveOrder = async (orderId: string) => {
    try {
      setActionLoading(orderId)
      await apiClient.approveOrder(orderId, 'Orden aprobada por administrador')
      // setSuccess('Orden aprobada exitosamente') // This state was not defined in the original file
      loadDashboard() // Recargar datos
    } catch (error: any) {
      setError(error.message || 'Error al aprobar la orden')
    } finally {
      setActionLoading(null)
    }
  }

  const handleRejectOrder = async (orderId: string, reason: string) => {
    try {
      setActionLoading(orderId)
      await apiClient.rejectOrder(orderId, reason)
      // setSuccess('Orden rechazada exitosamente') // This state was not defined in the original file
      loadDashboard() // Recargar datos
    } catch (error: any) {
      setError(error.message || 'Error al rechazar la orden')
    } finally {
      setActionLoading(null)
    }
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
          <p className="mt-4 text-gray-600">Cargando dashboard de administración...</p>
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
              <span className="text-2xl mr-3">👨‍💼</span>
              <h1 className="text-2xl font-bold text-gray-900">Panel de Administración</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <UserIcon className="h-5 w-5 text-gray-400" />
                <span className="text-gray-700">Administrador</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5" />
                <span>Cerrar sesión</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
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
                        {stats.totalOrders}
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
                        {stats.pendingOrders}
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
                        {stats.approvedOrders}
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
                        {stats.rejectedOrders}
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
                    <ChartBarIcon className="h-6 w-6 text-indigo-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Ingresos
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        ${stats.totalRevenue}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Orders List */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Gestión de Órdenes
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Revisa, aprueba o rechaza las órdenes pendientes
            </p>
          </div>
          
          {orders.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCartIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No hay órdenes</h3>
              <p className="mt-1 text-sm text-gray-500">
                No hay órdenes para revisar en este momento.
              </p>
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
                          <div className="mt-1 text-sm text-gray-500">
                            <span>Cliente: {order.user.nombre} ({order.user.email})</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="text-right text-sm text-gray-500">
                          <p>Creada: {formatDate(order.fecha_creacion)}</p>
                          {order.fecha_vencimiento && (
                            <p>Vence: {formatDate(order.fecha_vencimiento)}</p>
                          )}
                        </div>
                        
                        <button
                          onClick={() => openOrderModal(order)}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
                        >
                          <EyeIcon className="h-4 w-4 mr-1" />
                          Revisar
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Order Modal */}
      {isModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Revisar Orden - {selectedOrder.servicio}
                </h3>
                <button
                  onClick={closeOrderModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>

              {/* Order Details */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Cliente</p>
                    <p className="text-sm text-gray-900">{selectedOrder.user.nombre}</p>
                    <p className="text-xs text-gray-500">{selectedOrder.user.email}</p>
                    <p className="text-xs text-gray-500">{selectedOrder.user.whatsapp}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Servicio</p>
                    <p className="text-sm text-gray-900">{selectedOrder.servicio}</p>
                    <p className="text-xs text-gray-500">{selectedOrder.perfiles} perfil{selectedOrder.perfiles > 1 ? 'es' : ''} • {selectedOrder.meses} mes{selectedOrder.meses > 1 ? 'es' : ''}</p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <p className="text-sm font-medium text-gray-500">Total a Pagar</p>
                  <p className="text-2xl font-bold text-indigo-600">${selectedOrder.monto}</p>
                </div>

                {/* Payment Status */}
                {selectedOrder.payment && (
                  <div className="border-t pt-4">
                    <p className="text-sm font-medium text-gray-500 mb-2">Estado del Pago</p>
                    <div className="flex items-center space-x-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        selectedOrder.payment.estado_final === 'aprobado' ? 'bg-green-100 text-green-800' :
                        selectedOrder.payment.estado_final === 'rechazado' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {selectedOrder.payment.estado_final}
                      </span>
                      
                      {selectedOrder.payment.archivo_comprobante && (
                        <a
                          href={selectedOrder.payment.archivo_comprobante}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
                        >
                          <DocumentTextIcon className="h-4 w-4 mr-1" />
                          Ver Comprobante
                        </a>
                      )}
                    </div>

                    {/* OCR Results */}
                    {selectedOrder.payment.resultado_ocr && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-md">
                        <p className="text-sm font-medium text-gray-700 mb-2">Resultados del OCR:</p>
                        <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                          {JSON.stringify(selectedOrder.payment.resultado_ocr, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                {selectedOrder.estado === 'pendiente' && (
                  <div className="border-t pt-4 flex justify-end space-x-3">
                    <button
                      onClick={() => handleRejectOrder(selectedOrder.id, 'Pago rechazado por administrador')}
                      disabled={actionLoading === selectedOrder.id}
                      className="px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                    >
                      {actionLoading === selectedOrder.id ? 'Procesando...' : 'Rechazar'}
                    </button>
                    <button
                      onClick={() => handleApproveOrder(selectedOrder.id)}
                      disabled={actionLoading === selectedOrder.id}
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                      {actionLoading === selectedOrder.id ? 'Procesando...' : 'Aprobar'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
