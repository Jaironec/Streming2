'use client'

import { Fragment, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon, TrashIcon, TagIcon } from '@heroicons/react/24/outline'
import { useCartStore, CartItem } from '@/store/cartStore'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'

interface CartModalProps {
  isOpen: boolean
  onClose: () => void
}

interface CheckoutForm {
  nombre: string
  email: string
  whatsapp: string
  comprobante: FileList
}

export default function CartModal({ isOpen, onClose }: CartModalProps) {
  const { cartItems, removeFromCart, clearCart, getTotalPrice, getOriginalTotalPrice, getTotalSavings } = useCartStore()
  const [isCheckout, setIsCheckout] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<CheckoutForm>()

  const handleCheckout = async (data: CheckoutForm) => {
    if (cartItems.length === 0) {
      toast.error('El carrito está vacío')
      return
    }

    setIsProcessing(true)
    
    try {
      // Simular envío de datos
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Aquí iría la lógica real de envío al backend
      console.log('Datos del checkout:', data)
      console.log('Items del carrito:', cartItems)
      
      toast.success('Orden enviada exitosamente')
      clearCart()
      reset()
      setIsCheckout(false)
      onClose()
    } catch (error) {
      toast.error('Error al procesar la orden')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRemoveItem = (id: number) => {
    removeFromCart(id)
    toast.success('Item removido del carrito')
  }

  const totalPrice = getTotalPrice()
  const originalTotalPrice = getOriginalTotalPrice()
  const totalSavings = getTotalSavings()
  const hasSavings = totalSavings > 0

  if (cartItems.length === 0 && !isCheckout) {
    return (
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={onClose}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <div className="text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                      <svg className="h-6 w-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                    </div>
                    <h3 className="mt-2 text-lg font-medium text-gray-900">Carrito Vacío</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Agrega algunos servicios de streaming a tu carrito para continuar.
                    </p>
                  </div>
                  <div className="mt-6">
                    <button
                      type="button"
                      className="w-full btn-primary"
                      onClick={onClose}
                    >
                      Continuar Comprando
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    )
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-xl transition-all">
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <Dialog.Title as="h3" className="text-lg font-medium text-gray-900">
                    {isCheckout ? 'Finalizar Compra' : 'Carrito de Compras'}
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {!isCheckout ? (
                  <div className="p-6">
                    <div className="space-y-4 mb-6">
                      {cartItems.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="text-2xl">{item.logo}</div>
                            <div>
                              <h4 className="font-medium text-gray-900">{item.name}</h4>
                              <p className="text-sm text-gray-600">
                                {item.profiles} perfil{item.profiles > 1 ? 'es' : ''} • {item.months} mes{item.months > 1 ? 'es' : ''}
                              </p>
                              {item.savings > 0 && (
                                <div className="flex items-center mt-1">
                                  <TagIcon className="h-3 w-3 text-green-600 mr-1" />
                                  <span className="text-xs text-green-600">
                                    Ahorras ${item.savings} ({item.savingsPercentage}%)
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="text-right">
                              {item.savings > 0 && (
                                <div className="text-sm text-gray-500 line-through">
                                  ${item.originalPrice.toFixed(2)}
                                </div>
                              )}
                              <span className="font-semibold text-primary-600">${item.totalPrice.toFixed(2)}</span>
                            </div>
                            <button
                              onClick={() => handleRemoveItem(item.id)}
                              className="text-red-500 hover:text-red-700 transition-colors"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Resumen de descuentos */}
                    {hasSavings && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <TagIcon className="h-5 w-5 text-green-600 mr-2" />
                            <span className="text-sm font-medium text-green-800">Resumen de Ahorros</span>
                          </div>
                          <span className="text-lg font-bold text-green-600">-${totalSavings.toFixed(2)}</span>
                        </div>
                        <div className="mt-2 text-sm text-green-700">
                          Precio original: ${originalTotalPrice.toFixed(2)} • Precio final: ${totalPrice.toFixed(2)}
                        </div>
                      </div>
                    )}

                    <div className="border-t border-gray-200 pt-4 mb-6">
                      <div className="space-y-2">
                        {hasSavings && (
                          <div className="flex justify-between items-center text-sm text-gray-600">
                            <span>Precio original:</span>
                            <span className="line-through">${originalTotalPrice.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center text-lg font-semibold">
                          <span>Total final:</span>
                          <span className="text-primary-600">${totalPrice.toFixed(2)}</span>
                        </div>
                        {hasSavings && (
                          <div className="text-sm text-green-600 text-right">
                            ¡Ahorras ${totalSavings.toFixed(2)}!
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex space-x-3">
                      <button
                        onClick={() => setIsCheckout(true)}
                        className="flex-1 btn-primary"
                      >
                        Proceder al Pago
                      </button>
                      <button
                        onClick={onClose}
                        className="btn-secondary"
                      >
                        Seguir Comprando
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit(handleCheckout)} className="p-6">
                    <div className="space-y-4 mb-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Nombre Completo *
                        </label>
                        <input
                          type="text"
                          {...register('nombre', { required: 'El nombre es requerido' })}
                          className="input-field"
                          placeholder="Tu nombre completo"
                        />
                        {errors.nombre && (
                          <p className="mt-1 text-sm text-red-600">{errors.nombre.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email *
                        </label>
                        <input
                          type="email"
                          {...register('email', { 
                            required: 'El email es requerido',
                            pattern: {
                              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                              message: 'Email inválido'
                            }
                          })}
                          className="input-field"
                          placeholder="tu@email.com"
                        />
                        {errors.email && (
                          <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          WhatsApp *
                        </label>
                        <input
                          type="tel"
                          {...register('whatsapp', { required: 'El WhatsApp es requerido' })}
                          className="input-field"
                          placeholder="+1234567890"
                        />
                        {errors.whatsapp && (
                          <p className="mt-1 text-sm text-red-600">{errors.whatsapp.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Comprobante de Pago *
                        </label>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          {...register('comprobante', { required: 'El comprobante es requerido' })}
                          className="input-field"
                        />
                        <p className="mt-1 text-sm text-gray-500">
                          Sube una imagen o PDF del comprobante de pago
                        </p>
                        {errors.comprobante && (
                          <p className="mt-1 text-sm text-red-600">{errors.comprobante.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-blue-800">
                            Información Importante
                          </h3>
                          <div className="mt-2 text-sm text-blue-700">
                            <ul className="list-disc list-inside space-y-1">
                              <li>Sube el comprobante de pago (transferencia, depósito, etc.)</li>
                              <li>Tu orden será procesada en 5-10 minutos</li>
                              <li>Recibirás los accesos por WhatsApp</li>
                              <li>El soporte está disponible 24/7</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex space-x-3">
                      <button
                        type="submit"
                        disabled={isProcessing}
                        className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isProcessing ? 'Procesando...' : 'Confirmar Orden'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsCheckout(false)}
                        className="btn-secondary"
                      >
                        Volver al Carrito
                      </button>
                    </div>
                  </form>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
