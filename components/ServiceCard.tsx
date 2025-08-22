'use client'

import { StarIcon, TagIcon } from '@heroicons/react/24/solid'
import { CartItem } from '@/store/cartStore'

interface ServiceCardProps {
  service: {
    id: number
    name: string
    logo: string
    description: string
    price: number
    features: string[]
    popular: boolean
  }
  selectedMonths: number
  selectedProfiles: number
  onAddToCart: (item: CartItem) => void
}

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

export default function ServiceCard({ 
  service, 
  selectedMonths, 
  selectedProfiles, 
  onAddToCart 
}: ServiceCardProps) {
  const pricing = calculateDiscounts(service.price, selectedMonths, selectedProfiles);
  const hasDiscount = pricing.savings > 0;

  return (
    <div className="card relative group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      {service.popular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <span className="bg-gradient-to-r from-primary-500 to-primary-600 text-white px-4 py-1 rounded-full text-sm font-medium flex items-center">
            <StarIcon className="h-4 w-4 mr-1" />
            Más Popular
          </span>
        </div>
      )}
      
      <div className="text-center mb-6">
        <div className="text-4xl mb-4">{service.logo}</div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">{service.name}</h3>
        <p className="text-gray-600 text-sm">{service.description}</p>
      </div>
      
      <div className="mb-6">
        <div className="text-center mb-4">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <span className="text-3xl font-bold text-primary-600">${pricing.finalPrice}</span>
            {hasDiscount && (
              <span className="text-sm text-gray-500 line-through">${pricing.totalPrice}</span>
            )}
          </div>
          <span className="text-gray-500">total por {selectedMonths} mes{selectedMonths > 1 ? 'es' : ''}</span>
          
          {/* Badge de descuento */}
          {hasDiscount && (
            <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              <TagIcon className="h-4 w-4 mr-1" />
              Ahorras ${pricing.savings} ({pricing.savingsPercentage}%)
            </div>
          )}
        </div>
        
        <div className="space-y-2 mb-4">
          {service.features.map((feature, index) => (
            <div key={index} className="flex items-center text-sm text-gray-600">
              <svg className="h-4 w-4 text-success-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {feature}
            </div>
          ))}
        </div>
        
        <div className="bg-gray-50 rounded-lg p-3 mb-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Precio base:</span>
              <span className="font-medium">${service.price}/mes</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Perfiles:</span>
              <span className="font-medium">{selectedProfiles}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Meses:</span>
              <span className="font-medium">{selectedMonths}</span>
            </div>
            
            {/* Mostrar descuentos aplicados */}
            {selectedProfiles > 1 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Descuento perfiles:</span>
                <span className="font-medium">-{((selectedProfiles - 1) * 5)}%</span>
              </div>
            )}
            
            {selectedMonths > 1 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Descuento meses:</span>
                <span className="font-medium">
                  -{selectedMonths === 3 ? '10' : selectedMonths === 6 ? '20' : '35'}%
                </span>
              </div>
            )}
            
            <div className="border-t border-gray-200 mt-2 pt-2">
              <div className="flex justify-between font-semibold">
                <span>Total final:</span>
                <span className="text-primary-600">${pricing.finalPrice}</span>
              </div>
              {hasDiscount && (
                <div className="text-xs text-green-600 text-right">
                  Ahorras ${pricing.savings}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <button
        onClick={() => onAddToCart({
          ...service,
          months: selectedMonths,
          profiles: selectedProfiles,
          totalPrice: pricing.finalPrice,
          originalPrice: pricing.totalPrice,
          savings: pricing.savings,
          savingsPercentage: pricing.savingsPercentage
        })}
        className="w-full btn-primary group-hover:bg-primary-700 transition-colors duration-200"
      >
        Agregar al Carrito
      </button>
    </div>
  )
}
