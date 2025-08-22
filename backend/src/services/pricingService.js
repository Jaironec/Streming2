class PricingService {
  constructor() {
    // Configuración de descuentos por meses
    this.discounts = {
      1: 0,    // 1 mes: sin descuento
      3: 0.10, // 3 meses: 10% descuento
      6: 0.20, // 6 meses: 20% descuento
      12: 0.35 // 12 meses: 35% descuento
    };

    // Precios base por servicio (por mes)
    this.basePrices = {
      'Netflix': 8.99,
      'Disney+': 7.99,
      'HBO Max': 9.99,
      'Amazon Prime': 12.99,
      'Paramount+': 4.99,
      'Apple TV+': 4.99
    };

    // Descuentos por número de perfiles
    this.profileDiscounts = {
      1: 0,    // 1 perfil: sin descuento
      2: 0.05, // 2 perfiles: 5% descuento
      3: 0.10, // 3 perfiles: 10% descuento
      4: 0.15  // 4 perfiles: 15% descuento
    };
  }

  // Calcular precio base por mes
  getBasePrice(service) {
    return this.basePrices[service] || 0;
  }

  // Calcular descuento por meses
  getMonthDiscount(months) {
    return this.discounts[months] || 0;
  }

  // Calcular descuento por perfiles
  getProfileDiscount(profiles) {
    return this.profileDiscounts[profiles] || 0;
  }

  // Calcular precio total con descuentos
  calculateTotalPrice(service, months, profiles) {
    const basePrice = this.getBasePrice(service);
    if (basePrice === 0) {
      throw new Error(`Servicio ${service} no encontrado`);
    }

    // Precio base por mes
    let monthlyPrice = basePrice;

    // Aplicar descuento por perfiles
    const profileDiscount = this.getProfileDiscount(profiles);
    monthlyPrice = monthlyPrice * (1 - profileDiscount);

    // Calcular precio total por meses
    let totalPrice = monthlyPrice * months;

    // Aplicar descuento por meses
    const monthDiscount = this.getMonthDiscount(months);
    totalPrice = totalPrice * (1 - monthDiscount);

    return {
      basePrice,
      monthlyPrice: monthlyPrice,
      totalPrice: Math.round(totalPrice * 100) / 100, // Redondear a 2 decimales
      monthDiscount: monthDiscount * 100,
      profileDiscount: profileDiscount * 100,
      savings: Math.round((basePrice * months - totalPrice) * 100) / 100
    };
  }

  // Obtener información de descuentos para mostrar al usuario
  getDiscountInfo(service, months, profiles) {
    const pricing = this.calculateTotalPrice(service, months, profiles);
    const baseTotal = this.basePrices[service] * months;

    return {
      service,
      months,
      profiles,
      basePrice: this.basePrices[service],
      baseTotal,
      finalPrice: pricing.totalPrice,
      savings: pricing.savings,
      savingsPercentage: Math.round((pricing.savings / baseTotal) * 100),
      discounts: {
        months: {
          applied: months > 1,
          percentage: pricing.monthDiscount,
          description: this.getMonthDiscountDescription(months)
        },
        profiles: {
          applied: profiles > 1,
          percentage: pricing.profileDiscount,
          description: this.getProfileDiscountDescription(profiles)
        }
      }
    };
  }

  // Descripción del descuento por meses
  getMonthDiscountDescription(months) {
    switch (months) {
      case 3:
        return 'Descuento por contrato de 3 meses';
      case 6:
        return 'Descuento por contrato de 6 meses';
      case 12:
        return 'Descuento por contrato anual';
      default:
        return 'Sin descuento por meses';
    }
  }

  // Descripción del descuento por perfiles
  getProfileDiscountDescription(profiles) {
    switch (profiles) {
      case 2:
        return 'Descuento por 2 perfiles';
      case 3:
        return 'Descuento por 3 perfiles';
      case 4:
        return 'Descuento por 4 perfiles';
      default:
        return 'Sin descuento por perfiles';
    }
  }

  // Obtener todos los planes disponibles con precios
  getAllPlans() {
    const plans = [];
    const services = Object.keys(this.basePrices);
    const monthOptions = [1, 3, 6, 12];
    const profileOptions = [1, 2, 3, 4];

    for (const service of services) {
      for (const months of monthOptions) {
        for (const profiles of profileOptions) {
          try {
            const pricing = this.calculateTotalPrice(service, months, profiles);
            plans.push({
              service,
              months,
              profiles,
              basePrice: this.basePrices[service],
              finalPrice: pricing.totalPrice,
              savings: pricing.savings,
              savingsPercentage: Math.round((pricing.savings / (this.basePrices[service] * months)) * 100),
              monthDiscount: pricing.monthDiscount,
              profileDiscount: pricing.profileDiscount,
              popular: months === 12 && profiles === 4, // Plan anual con 4 perfiles es popular
              bestValue: months === 12 && profiles === 1 // Plan anual con 1 perfil es mejor valor
            });
          } catch (error) {
            console.error(`Error calculando plan para ${service} - ${months} meses - ${profiles} perfiles:`, error);
          }
        }
      }
    }

    return plans.sort((a, b) => a.finalPrice - b.finalPrice);
  }

  // Obtener planes recomendados
  getRecommendedPlans() {
    const allPlans = this.getAllPlans();
    
    return {
      bestValue: allPlans.find(plan => plan.bestValue),
      mostPopular: allPlans.find(plan => plan.popular),
      cheapest: allPlans[0],
      mostExpensive: allPlans[allPlans.length - 1]
    };
  }

  // Validar si un precio es correcto
  validatePrice(service, months, profiles, expectedPrice) {
    try {
      const calculatedPrice = this.calculateTotalPrice(service, months, profiles);
      const tolerance = 0.01; // Tolerancia de 1 centavo
      
      return Math.abs(calculatedPrice.totalPrice - expectedPrice) <= tolerance;
    } catch (error) {
      return false;
    }
  }
}

// Singleton instance
const pricingService = new PricingService();

module.exports = pricingService;
