'use client'

import { useState, useEffect } from 'react'
import { 
  PlayIcon, 
  ShieldCheckIcon, 
  ClockIcon, 
  UserGroupIcon,
  CheckCircleIcon,
  StarIcon,
  TagIcon,
  UserIcon,
  ShoppingCartIcon
} from '@heroicons/react/24/outline'
import ServiceCard from '@/components/ServiceCard'
import CartModal from '@/components/CartModal'
import { useCartStore } from '@/store/cartStore'
import { isAuthenticated } from './lib/api'
import Link from 'next/link'

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
  },
  {
    id: 5,
    name: 'Paramount+',
    logo: '🎭',
    description: 'Contenido exclusivo de Paramount, CBS y más',
    price: 6.99,
    features: ['4K Ultra HD', '4 perfiles', 'Contenido deportivo', 'Noticias en vivo'],
    popular: false
  },
  {
    id: 6,
    name: 'Apple TV+',
    logo: '🍎',
    description: 'Contenido original de Apple con la mejor calidad',
    price: 5.99,
    features: ['4K Dolby Vision', '6 perfiles', 'Contenido familiar', 'Sin anuncios'],
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
  const [isAuthenticatedUser, setIsAuthenticatedUser] = useState(false)

  useEffect(() => {
    setIsAuthenticatedUser(isAuthenticated())
  }, [])

  const handleAddToCart = (service: any) => {
    const pricing = calculateDiscounts(service.price, selectedMonths, selectedProfiles);
    
    const item = {
      ...service,
      months: selectedMonths,
      profiles: selectedProfiles,
      pricing
    };
    
    addToCart(item);
    setIsCartOpen(true);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <span className="text-3xl mr-3">🎬</span>
              <h1 className="text-2xl font-bold text-gray-900">StreamingPro</h1>
            </div>
            
            <nav className="flex items-center space-x-6">
              {isAuthenticatedUser ? (
                <>
                  <Link
                    href="/dashboard"
                    className="flex items-center text-gray-700 hover:text-indigo-600 transition-colors"
                  >
                    <UserIcon className="h-5 w-5 mr-2" />
                    Mi Cuenta
                  </Link>
                  <Link
                    href="/admin"
                    className="flex items-center text-gray-700 hover:text-indigo-600 transition-colors"
                  >
                    <ShieldCheckIcon className="h-5 w-5 mr-2" />
                    Admin
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/auth/login"
                    className="text-gray-700 hover:text-indigo-600 transition-colors"
                  >
                    Iniciar Sesión
                  </Link>
                  <Link
                    href="/auth/register"
                    className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
                  >
                    Registrarse
                  </Link>
                </>
              )}
              
              <button
                onClick={() => setIsCartOpen(true)}
                className="relative flex items-center text-gray-700 hover:text-indigo-600 transition-colors"
              >
                <ShoppingCartIcon className="h-6 w-6" />
                {cartItems.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {cartItems.length}
                  </span>
                )}
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Acceso Premium a Streaming
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-indigo-100">
              Disfruta de Netflix, Disney+, HBO Max y más por una fracción del precio
            </p>
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              <div className="bg-white bg-opacity-20 rounded-lg px-6 py-3">
                <div className="text-2xl font-bold">🎯</div>
                <div className="text-sm">Precios Bajos</div>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg px-6 py-3">
                <div className="text-2xl font-bold">⚡</div>
                <div className="text-sm">Acceso Inmediato</div>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg px-6 py-3">
                <div className="text-2xl font-bold">🔒</div>
                <div className="text-sm">100% Seguro</div>
              </div>
              <div className="bg-white bg-opacity-20 rounded-lg px-6 py-3">
                <div className="text-2xl font-bold">📱</div>
                <div className="text-sm">WhatsApp</div>
              </div>
            </div>
            <div className="space-x-4">
              <Link
                href="#services"
                className="bg-white text-indigo-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors inline-block"
              >
                Ver Servicios
              </Link>
              {!isAuthenticatedUser && (
                <Link
                  href="/auth/register"
                  className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-indigo-600 transition-colors inline-block"
                >
                  Crear Cuenta
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              ¿Por qué elegirnos?
            </h2>
            <p className="text-xl text-gray-600">
              Ofrecemos la mejor experiencia en servicios de streaming
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-indigo-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <ClockIcon className="h-8 w-8 text-indigo-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Acceso Inmediato</h3>
              <p className="text-gray-600">Recibe tus credenciales por WhatsApp en minutos después de la aprobación</p>
            </div>
            
            <div className="text-center">
              <div className="bg-indigo-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <ShieldCheckIcon className="h-8 w-8 text-indigo-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">100% Seguro</h3>
              <p className="text-gray-600">Pagos verificados con OCR y validación manual para tu seguridad</p>
            </div>
            
            <div className="text-center">
              <div className="bg-indigo-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <UserGroupIcon className="h-8 w-8 text-indigo-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Múltiples Perfiles</h3>
              <p className="text-gray-600">Comparte con familia y amigos, hasta 6 perfiles por cuenta</p>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Nuestros Servicios
            </h2>
            <p className="text-xl text-gray-600">
              Selecciona el número de perfiles y meses para ver los precios
            </p>
          </div>

          {/* Configuration Controls */}
          <div className="flex flex-wrap justify-center gap-6 mb-12">
            <div className="text-center">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Número de Perfiles
              </label>
              <select
                value={selectedProfiles}
                onChange={(e) => setSelectedProfiles(Number(e.target.value))}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value={1}>1 Perfil</option>
                <option value={2}>2 Perfiles</option>
                <option value={3}>3 Perfiles</option>
                <option value={4}>4 Perfiles</option>
              </select>
            </div>
            
            <div className="text-center">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duración
              </label>
              <select
                value={selectedMonths}
                onChange={(e) => setSelectedMonths(Number(e.target.value))}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value={1}>1 Mes</option>
                <option value={3}>3 Meses</option>
                <option value={6}>6 Meses</option>
                <option value={12}>12 Meses</option>
              </select>
            </div>
          </div>

          {/* Services Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                selectedMonths={selectedMonths}
                selectedProfiles={selectedProfiles}
                onAddToCart={handleAddToCart}
                calculateDiscounts={calculateDiscounts}
              />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-indigo-600 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">
            ¿Listo para empezar?
          </h2>
          <p className="text-xl mb-8 text-indigo-100">
            Únete a miles de usuarios que ya disfrutan de streaming premium
          </p>
          <div className="space-x-4">
            {!isAuthenticatedUser ? (
              <>
                <Link
                  href="/auth/register"
                  className="bg-white text-indigo-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors inline-block"
                >
                  Crear Cuenta Gratis
                </Link>
                <Link
                  href="/auth/login"
                  className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-indigo-600 transition-colors inline-block"
                >
                  Iniciar Sesión
                </Link>
              </>
            ) : (
              <Link
                href="/dashboard"
                className="bg-white text-indigo-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors inline-block"
              >
                Ir a Mi Cuenta
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <span className="text-2xl mr-2">🎬</span>
                <span className="text-xl font-bold">StreamingPro</span>
              </div>
              <p className="text-gray-400">
                Tu destino para acceso premium a streaming a precios increíbles.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Servicios</h3>
              <ul className="space-y-2 text-gray-400">
                <li>Netflix</li>
                <li>Disney+</li>
                <li>HBO Max</li>
                <li>Amazon Prime</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Soporte</h3>
              <ul className="space-y-2 text-gray-400">
                <li>WhatsApp 24/7</li>
                <li>Centro de Ayuda</li>
                <li>FAQ</li>
                <li>Contacto</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-gray-400">
                <li>Términos de Servicio</li>
                <li>Política de Privacidad</li>
                <li>Reembolsos</li>
                <li>Garantías</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 StreamingPro. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>

      {/* Cart Modal */}
      <CartModal
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
      />
    </div>
  )
}
