const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  servicio: {
    type: DataTypes.ENUM('Netflix', 'Disney+', 'HBO Max', 'Amazon Prime', 'Paramount+', 'Apple TV+'),
    allowNull: false
  },
  perfiles: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 6
    }
  },
  meses: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 24
    }
  },
  monto: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0.01
    }
  },
  estado: {
    type: DataTypes.ENUM('pendiente', 'validando', 'aprobado', 'rechazado', 'cancelado'),
    defaultValue: 'pendiente',
    allowNull: false
  },
  fecha_creacion: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false
  },
  fecha_vencimiento: {
    type: DataTypes.DATE,
    allowNull: true
  },
  fecha_aprobacion: {
    type: DataTypes.DATE,
    allowNull: true
  },
  admin_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  comentarios_admin: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  metodo_pago: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  referencia_pago: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  // Campos adicionales para mejor gestión
  codigo_orden: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    comment: 'Código único de orden para el cliente'
  },
  prioridad: {
    type: DataTypes.ENUM('baja', 'normal', 'alta', 'urgente'),
    defaultValue: 'normal',
    allowNull: false
  },
  tiempo_procesamiento: {
    type: DataTypes.INTEGER, // en minutos
    allowNull: true,
    comment: 'Tiempo estimado de procesamiento'
  },
  tags: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Tags para categorización y búsqueda'
  }
}, {
  tableName: 'orders',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['codigo_orden']
    },
    {
      fields: ['user_id']
    },
    {
      fields: ['servicio']
    },
    {
      fields: ['estado']
    },
    {
      fields: ['fecha_creacion']
    },
    {
      fields: ['fecha_vencimiento']
    },
    {
      fields: ['prioridad']
    }
  ],
  hooks: {
    beforeCreate: (order) => {
      // Generar código único de orden
      if (!order.codigo_orden) {
        order.codigo_orden = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
      }
      
      // Calcular tiempo de procesamiento estimado
      order.tiempo_procesamiento = order.calcularTiempoProcesamiento();
      
      if (order.estado === 'aprobado' && !order.fecha_aprobacion) {
        order.fecha_aprobacion = new Date();
      }
      
      // Calcular fecha de vencimiento si se aprueba
      if (order.estado === 'aprobado' && order.meses) {
        const fechaVencimiento = new Date();
        fechaVencimiento.setMonth(fechaVencimiento.getMonth() + order.meses);
        order.fecha_vencimiento = fechaVencimiento;
      }
    },
    beforeUpdate: (order) => {
      if (order.changed('estado') && order.estado === 'aprobado') {
        order.fecha_aprobacion = new Date();
        
        // Calcular fecha de vencimiento
        if (order.meses) {
          const fechaVencimiento = new Date();
          fechaVencimiento.setMonth(fechaVencimiento.getMonth() + order.meses);
          order.fecha_vencimiento = fechaVencimiento;
        }
      }
      
      // Actualizar tiempo de procesamiento si cambia el estado
      if (order.changed('estado')) {
        order.tiempo_procesamiento = order.calcularTiempoProcesamiento();
      }
    }
  }
});

// Instance methods
Order.prototype.isExpired = function() {
  if (!this.fecha_vencimiento) return false;
  return new Date() > this.fecha_vencimiento;
};

Order.prototype.daysUntilExpiration = function() {
  if (!this.fecha_vencimiento) return null;
  const now = new Date();
  const diffTime = this.fecha_vencimiento.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

Order.prototype.canRenew = function() {
  if (this.estado !== 'aprobado') return false;
  if (this.isExpired()) return false;
  
  // Permitir renovación si faltan 7 días o menos para vencer
  const daysUntilExp = this.daysUntilExpiration();
  return daysUntilExp !== null && daysUntilExp <= 7;
};

Order.prototype.calcularTiempoProcesamiento = function() {
  // Tiempo base según el servicio
  const tiemposBase = {
    'Netflix': 15,
    'Disney+': 20,
    'HBO Max': 25,
    'Amazon Prime': 30,
    'Paramount+': 20,
    'Apple TV+': 25
  };
  
  let tiempo = tiemposBase[this.servicio] || 30;
  
  // Ajustar según perfiles
  if (this.perfiles > 2) tiempo += 10;
  if (this.perfiles > 4) tiempo += 15;
  
  // Ajustar según meses
  if (this.meses > 6) tiempo += 5;
  if (this.meses > 12) tiempo += 10;
  
  // Ajustar según prioridad
  const ajustesPrioridad = {
    'baja': 0,
    'normal': 0,
    'alta': -5,
    'urgente': -10
  };
  
  tiempo += ajustesPrioridad[this.prioridad] || 0;
  
  return Math.max(tiempo, 5); // Mínimo 5 minutos
};

Order.prototype.getProcessingStatus = function() {
  if (this.estado === 'pendiente') return 'En espera de pago';
  if (this.estado === 'validando') return 'Validando comprobante';
  if (this.estado === 'aprobado') {
    if (this.isExpired()) return 'Expirada';
    const days = this.daysUntilExpiration();
    if (days <= 3) return `Vence en ${days} días`;
    if (days <= 7) return `Vence en ${days} días`;
    return 'Activa';
  }
  if (this.estado === 'rechazado') return 'Pago rechazado';
  if (this.estado === 'cancelado') return 'Cancelada';
  return 'Estado desconocido';
};

Order.prototype.calculateRenewalPrice = function() {
  if (!this.canRenew()) return null;
  
  // Precio base del servicio por mes
  const preciosBase = {
    'Netflix': 8.99,
    'Disney+': 7.99,
    'HBO Max': 9.99,
    'Amazon Prime': 12.99,
    'Paramount+': 4.99,
    'Apple TV+': 4.99
  };
  
  const precioBase = preciosBase[this.servicio] || 10.00;
  let precioRenovacion = precioBase * this.perfiles;
  
  // Descuento por renovación anticipada
  const daysUntilExp = this.daysUntilExpiration();
  if (daysUntilExp <= 3) precioRenovacion *= 0.95; // 5% descuento
  else if (daysUntilExp <= 7) precioRenovacion *= 0.98; // 2% descuento
  
  return Math.round(precioRenovacion * 100) / 100;
};

// Class methods
Order.findPendingOrders = function() {
  return this.findAll({
    where: { estado: 'pendiente' },
    order: [['fecha_creacion', 'ASC']]
  });
};

Order.findValidatingOrders = function() {
  return this.findAll({
    where: { estado: 'validando' },
    order: [['fecha_creacion', 'ASC']]
  });
};

Order.findExpiringOrders = function(days = 3) {
  const fechaLimite = new Date();
  fechaLimite.setDate(fechaLimite.getDate() + days);
  
  return this.findAll({
    where: {
      estado: 'aprobado',
      fecha_vencimiento: {
        [sequelize.Op.lte]: fechaLimite
      }
    },
    order: [['fecha_vencimiento', 'ASC']]
  });
};

Order.findByUser = function(userId) {
  return this.findAll({
    where: { user_id: userId },
    order: [['fecha_creacion', 'DESC']]
  });
};

Order.findByService = function(service) {
  return this.findAll({
    where: { servicio: service },
    order: [['fecha_creacion', 'DESC']]
  });
};

Order.findHighPriorityOrders = function() {
  return this.findAll({
    where: {
      prioridad: { [sequelize.Op.in]: ['alta', 'urgente'] },
      estado: { [sequelize.Op.in]: ['pendiente', 'validando'] }
    },
    order: [
      ['prioridad', 'DESC'],
      ['fecha_creacion', 'ASC']
    ]
  });
};

Order.getStats = async function() {
  const stats = await this.findAll({
    attributes: [
      'estado',
      'servicio',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      [sequelize.fn('SUM', sequelize.col('monto')), 'total_amount'],
      [sequelize.fn('AVG', sequelize.col('monto')), 'average_amount']
    ],
    group: ['estado', 'servicio'],
    raw: true
  });
  
  return stats;
};

Order.getRevenueStats = async function(period = 'month') {
  let dateFilter;
  const now = new Date();
  
  switch (period) {
    case 'day':
      dateFilter = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'week':
      dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      dateFilter = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'year':
      dateFilter = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      dateFilter = new Date(now.getFullYear(), now.getMonth(), 1);
  }
  
  const stats = await this.findAll({
    where: {
      estado: 'aprobado',
      fecha_aprobacion: { [sequelize.Op.gte]: dateFilter }
    },
    attributes: [
      [sequelize.fn('COUNT', sequelize.col('id')), 'total_orders'],
      [sequelize.fn('SUM', sequelize.col('monto')), 'total_revenue'],
      [sequelize.fn('AVG', sequelize.col('monto')), 'average_order']
    ],
    raw: true
  });
  
  return stats[0] || { total_orders: 0, total_revenue: 0, average_order: 0 };
};

module.exports = Order;
