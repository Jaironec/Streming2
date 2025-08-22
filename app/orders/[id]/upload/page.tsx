'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeftIcon, 
  CloudArrowUpIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'
import { apiClient, isAuthenticated } from '@/lib/api'

interface Order {
  id: string
  servicio: string
  perfiles: number
  meses: number
  monto: number
  estado: string
  fecha_creacion: string
}

export default function UploadProofPage() {
  const [order, setOrder] = useState<Order | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const router = useRouter()
  const params = useParams()
  const orderId = params.id as string

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/auth/login')
      return
    }

    loadOrder()
  }, [orderId, router])

  const loadOrder = async () => {
    try {
      setIsLoading(true)
      const response = await apiClient.getOrder(orderId)
      setOrder(response.order)
    } catch (error: any) {
      setError(error.message || 'Error al cargar la orden')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileSelect = (file: File) => {
    // Validar tipo de archivo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      setError('Solo se permiten archivos JPG, PNG y PDF')
      return
    }

    // Validar tamaño (10MB máximo)
    if (file.size > 10 * 1024 * 1024) {
      setError('El archivo debe ser menor a 10MB')
      return
    }

    setSelectedFile(file)
    setError('')
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile || !order) return

    try {
      setIsUploading(true)
      setError('')
      setSuccess('')

      const response = await apiClient.uploadProof(orderId, selectedFile)
      
      setSuccess('¡Comprobante subido exitosamente! El sistema lo está procesando.')
      
      // Redirigir al dashboard después de 2 segundos
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
      
    } catch (error: any) {
      setError(error.message || 'Error al subir el comprobante')
    } finally {
      setIsUploading(false)
    }
  }

  const removeFile = () => {
    setSelectedFile(null)
    setError('')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando orden...</p>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Orden no encontrada</p>
          <Link href="/dashboard" className="text-indigo-600 hover:text-indigo-500">
            Volver al dashboard
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
          <div className="flex items-center py-6">
            <Link
              href="/dashboard"
              className="flex items-center text-gray-500 hover:text-gray-700 mr-4"
            >
              <ArrowLeftIcon className="h-5 w-5 mr-2" />
              Volver
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Subir Comprobante de Pago</h1>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Order Summary */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Resumen de la Orden
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl mb-2">
                  {order.servicio === 'Netflix' ? '🎬' : 
                   order.servicio === 'Disney+' ? '🏰' : 
                   order.servicio === 'HBO Max' ? '📺' : 
                   order.servicio === 'Amazon Prime' ? '📦' : '🎭'}
                </div>
                <p className="text-sm font-medium text-gray-500">Servicio</p>
                <p className="text-lg font-semibold text-gray-900">{order.servicio}</p>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-2">👥</div>
                <p className="text-sm font-medium text-gray-500">Perfiles</p>
                <p className="text-lg font-semibold text-gray-900">{order.perfiles}</p>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-2">📅</div>
                <p className="text-sm font-medium text-gray-500">Duración</p>
                <p className="text-lg font-semibold text-gray-900">{order.meses} mes{order.meses > 1 ? 'es' : ''}</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 text-center">
              <p className="text-sm font-medium text-gray-500">Total a Pagar</p>
              <p className="text-3xl font-bold text-indigo-600">${order.monto}</p>
            </div>
          </div>
        </div>

        {/* Upload Form */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Subir Comprobante de Pago
            </h3>
            
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                {error}
              </div>
            )}
            
            {success && (
              <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* File Upload Area */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comprobante de Pago
                </label>
                
                {!selectedFile ? (
                  <div
                    className={`border-2 border-dashed rounded-lg p-6 text-center ${
                      dragActive 
                        ? 'border-indigo-400 bg-indigo-50' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="mt-4">
                      <p className="text-sm text-gray-600">
                        Arrastra y suelta tu archivo aquí, o{' '}
                        <label className="text-indigo-600 hover:text-indigo-500 cursor-pointer">
                          <span>selecciona un archivo</span>
                          <input
                            type="file"
                            className="sr-only"
                            accept=".jpg,.jpeg,.png,.pdf"
                            onChange={handleFileInput}
                          />
                        </label>
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        JPG, PNG o PDF hasta 10MB
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="border border-gray-300 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <DocumentTextIcon className="h-8 w-8 text-gray-400 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                          <p className="text-sm text-gray-500">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={removeFile}
                        className="text-red-600 hover:text-red-800"
                      >
                        <XCircleIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-800 mb-2">
                  📋 Instrucciones para el comprobante:
                </h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Asegúrate de que el monto coincida con ${order.monto}</li>
                  <li>• La fecha debe ser reciente</li>
                  <li>• El comprobante debe ser legible y completo</li>
                  <li>• Formatos aceptados: JPG, PNG, PDF</li>
                </ul>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end space-x-3">
                <Link
                  href="/dashboard"
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cancelar
                </Link>
                <button
                  type="submit"
                  disabled={!selectedFile || isUploading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Subiendo...
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="h-5 w-5 mr-2" />
                      Subir Comprobante
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
