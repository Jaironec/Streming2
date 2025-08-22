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
  }
}, {
  tableName: 'orders',
  timestamps: true,
  hooks: {
    beforeCreate: (order) => {
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

module.exports = Order;
