'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { apiClient } from '../../lib/api'

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    whatsapp: '',
    password: '',
    confirmPassword: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const validateForm = () => {
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden')
      return false
    }
    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return false
    }
    if (formData.whatsapp.length < 10) {
      setError('El número de WhatsApp debe tener al menos 10 dígitos')
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setSuccess('')

    if (!validateForm()) {
      setIsLoading(false)
      return
    }

    try {
      const response = await apiClient.register({
        nombre: formData.nombre,
        email: formData.email,
        whatsapp: formData.whatsapp,
        password: formData.password
      })
      
      if (response.token) {
        setSuccess('¡Registro exitoso! Redirigiendo al dashboard...')
        setTimeout(() => {
          router.push('/dashboard')
        }, 2000)
      }
    } catch (error: any) {
      setError(error.message || 'Error al registrar usuario')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 bg-indigo-600 rounded-full flex items-center justify-center">
            <span className="text-white text-xl font-bold">🎬</span>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Crea tu cuenta
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            ¿Ya tienes cuenta?{' '}
            <Link href="/auth/login" className="font-medium text-indigo-600 hover:text-indigo-500">
              Inicia sesión aquí
            </Link>
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              {error}
            </div>
          )}
          
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
              {success}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="nombre" className="block text-sm font-medium text-gray-700">
                Nombre completo
              </label>
              <input
                id="nombre"
                name="nombre"
                type="text"
                autoComplete="name"
                required
                value={formData.nombre}
                onChange={handleChange}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Tu nombre completo"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Correo electrónico
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="tu@email.com"
              />
            </div>

            <div>
              <label htmlFor="whatsapp" className="block text-sm font-medium text-gray-700">
                Número de WhatsApp
              </label>
              <input
                id="whatsapp"
                name="whatsapp"
                type="tel"
                autoComplete="tel"
                required
                value={formData.whatsapp}
                onChange={handleChange}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="1234567890"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Contraseña
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="appearance-none relative block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirmar contraseña
              </label>
              <div className="mt-1 relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="appearance-none relative block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creando cuenta...
                </div>
              ) : (
                'Crear cuenta'
              )}
            </button>
          </div>

          <div className="text-center text-sm text-gray-600">
            Al crear una cuenta, aceptas nuestros{' '}
            <Link href="/terms" className="text-indigo-600 hover:text-indigo-500">
              términos de servicio
            </Link>{' '}
            y{' '}
            <Link href="/privacy" className="text-indigo-600 hover:text-indigo-500">
              política de privacidad
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
