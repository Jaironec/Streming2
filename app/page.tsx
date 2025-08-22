'use client'

import { useState, useEffect } from 'react'
import { 
  PlayIcon, 
  ShieldCheckIcon, 
  ClockIcon, 
  UserGroupIcon,
  CheckCircleIcon,
  StarIcon,
  TagIcon
} from '@heroicons/react/24/outline'
import ServiceCard from '@/components/ServiceCard'
import CartModal from '@/components/CartModal'
import { useCartStore } from '@/store/cartStore'

const services = [
  {
    id: 1,
    name: 'Netflix',
    logo: '🎬',
    description: 'La mejor plataforma de streaming con contenido original exclusivo',
    price: 8.99,
    features: ['4K Ultra HD', '4 perfiles', 'Descargas offline', 'Sin anuncios'],
    popular: true
  },
  {
    id: 2,
    name: 'Disney+',
    logo: '🏰',
    description: 'Todo el universo Marvel, Star Wars y Disney en un solo lugar',
    price: 7.99,
    features: ['4K Ultra HD', '4 perfiles', 'Contenido familiar', 'Grupos de control parental'],
    popular: false
  },
  {
    id: 3,
    name: 'HBO Max',
    logo: '📺',
    description: 'Series y películas premium con la mejor calidad',
    price: 9.99,
    features: ['4K Ultra HD', '5 perfiles', 'Estrenos simultáneos', 'Contenido exclusivo'],
    popular: false
  },
  {
    id: 4,
    name: 'Amazon Prime',
    logo: '📦',
    description: 'Streaming + envíos gratis + música y más beneficios',
    price: 12.99,
    features: ['4K Ultra HD', '6 perfiles', 'Envíos gratis', 'Música incluida'],
    popular: false
  }
]

// Función para calcular descuentos
const calculateDiscounts = (basePrice: number, months: number, profiles: number) => {
  let monthlyPrice = basePrice;
  let totalPrice = basePrice * months;
  let savings = 0;
  
  // Descuento por perfiles
  if (profiles > 1) {
    const profileDiscount = (profiles - 1) * 0.05; // 5% por perfil adicional
    monthlyPrice = monthlyPrice * (1 - profileDiscount);
    totalPrice = monthlyPrice * months;
  }
  
  // Descuento por meses
  if (months === 3) {
    savings = totalPrice * 0.10; // 10% descuento
  } else if (months === 6) {
    savings = totalPrice * 0.20; // 20% descuento
  } else if (months === 12) {
    savings = totalPrice * 0.35; // 35% descuento
  }
  
  const finalPrice = totalPrice - savings;
  
  return {
    monthlyPrice: Math.round(monthlyPrice * 100) / 100,
    totalPrice: Math.round(totalPrice * 100) / 100,
    finalPrice: Math.round(finalPrice * 100) / 100,
    savings: Math.round(savings * 100) / 100,
    savingsPercentage: Math.round((savings / totalPrice) * 100)
  };
};

export default function Home() {
  const [selectedMonths, setSelectedMonths] = useState(1)
  const [selectedProfiles, setSelectedProfiles] = useState(1)
  const { addToCart, cartItems } = useCartStore()
  const [isCartOpen, setIsCartOpen] = useState(false)

  const handleAddToCart = (service: any) => {
    const pricing = calculateDiscounts(service.price, selectedMonths, selectedProfiles);
    
    const item = {
      ...service,
      months: selectedMonths,
      profiles: selectedProfiles,
      totalPrice: pricing.finalPrice,
      originalPrice: pricing.totalPrice,
      savings: pricing.savings,
      savingsPercentage: pricing.savingsPercentage
    }
    addToCart(item)
    setIsCartOpen(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <PlayIcon className="h-8 w-8 text-primary-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">StreamingPro</span>
            </div>
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => setIsCartOpen(true)}
                className="relative p-2 text-gray-600 hover:text-primary-600 transition-colors"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m6 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
                </svg>
                {cartItems.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {cartItems.length}
                  </span>
                )}
              </button>
              <button className="btn-primary">Iniciar Sesión</button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-r from-primary-600 to-primary-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Accesos Premium de Streaming
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-primary-100 max-w-3xl mx-auto">
            Disfruta de Netflix, Disney+, HBO Max y más plataformas premium con precios increíbles y activación instantánea
          </p>
          
          {/* Banner de descuentos */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-12 max-w-4xl mx-auto">
            <div className="flex items-center justify-center mb-4">
              <TagIcon className="h-8 w-8 text-yellow-300 mr-3" />
              <h3 className="text-2xl font-bold text-yellow-300">¡Descuentos Especiales!</h3>
            </div>
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-3xl font-bold text-yellow-300">10%</div>
                <div className="text-sm">3 meses</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-yellow-300">20%</div>
                <div className="text-sm">6 meses</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-yellow-300">35%</div>
                <div className="text-sm">12 meses</div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            <div className="flex items-center space-x-2">
              <CheckCircleIcon className="h-6 w-6 text-success-400" />
              <span>Activación en 5 minutos</span>
            </div>
            <div className="flex items-center space-x-2">
              <ShieldCheckIcon className="h-6 w-6 text-success-400" />
              <span>100% Seguro</span>
            </div>
            <div className="flex items-center space-x-2">
              <ClockIcon className="h-6 w-6 text-success-400" />
              <span>Soporte 24/7</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              ¿Por qué elegirnos?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Ofrecemos la mejor experiencia en streaming con precios competitivos y servicio de calidad
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <StarIcon className="h-8 w-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Calidad Premium</h3>
              <p className="text-gray-600">Accesos a cuentas premium con la mejor calidad de video disponible</p>
            </div>
            
            <div className="text-center">
              <div className="bg-success-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldCheckIcon className="h-8 w-8 text-success-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">100% Seguro</h3>
              <p className="text-gray-600">Transacciones seguras y cuentas verificadas para tu tranquilidad</p>
            </div>
            
            <div className="text-center">
              <div className="bg-warning-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <ClockIcon className="h-8 w-8 text-warning-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Activación Rápida</h3>
              <p className="text-gray-600">Recibe tus accesos en menos de 5 minutos después del pago</p>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Nuestros Servicios
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Elige el plan que mejor se adapte a tus necesidades con descuentos especiales
            </p>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl p-6 mb-8 shadow-sm border border-gray-200">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número de Perfiles
                </label>
                <select 
                  value={selectedProfiles} 
                  onChange={(e) => setSelectedProfiles(Number(e.target.value))}
                  className="input-field"
                >
                  <option value={1}>1 Perfil</option>
                  <option value={2}>2 Perfiles</option>
                  <option value={3}>3 Perfiles</option>
                  <option value={4}>4 Perfiles</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duración en Meses
                </label>
                <select 
                  value={selectedMonths} 
                  onChange={(e) => setSelectedMonths(Number(e.target.value))}
                  className="input-field"
                >
                  <option value={1}>1 Mes</option>
                  <option value={3}>3 Meses (10% descuento)</option>
                  <option value={6}>6 Meses (20% descuento)</option>
                  <option value={12}>12 Meses (35% descuento)</option>
                </select>
              </div>
            </div>
            
            {/* Información de descuentos */}
            {selectedMonths > 1 && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center">
                  <TagIcon className="h-5 w-5 text-green-600 mr-2" />
                  <span className="text-sm font-medium text-green-800">
                    ¡Descuento aplicado! {selectedMonths === 3 ? '10%' : selectedMonths === 6 ? '20%' : '35%'} de descuento por contrato de {selectedMonths} meses
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Services Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((service) => (
              <ServiceCard 
                key={service.id}
                service={service}
                selectedMonths={selectedMonths}
                selectedProfiles={selectedProfiles}
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Cart Modal */}
      <CartModal 
        isOpen={isCartOpen} 
        onClose={() => setIsCartOpen(false)} 
      />
    </div>
  )
}
