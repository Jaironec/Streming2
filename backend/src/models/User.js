const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  nombre: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 100]
    }
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
      notEmpty: true
    }
  },
  whatsapp: {
    type: DataTypes.STRING(20),
    allowNull: false,
    validate: {
      notEmpty: true,
      is: /^\+?[1-9]\d{1,14}$/ // Formato internacional
    }
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [6, 255]
    }
  },
  rol: {
    type: DataTypes.ENUM('cliente', 'admin'),
    defaultValue: 'cliente',
    allowNull: false
  },
  estado: {
    type: DataTypes.ENUM('activo', 'suspendido', 'eliminado'),
    defaultValue: 'activo',
    allowNull: false
  },
  ultimo_acceso: {
    type: DataTypes.DATE
  },
  intentos_login: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 10
    }
  },
  bloqueado_hasta: {
    type: DataTypes.DATE
  },
  // Campos adicionales para mejor gestión
  fecha_registro: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  ip_registro: {
    type: DataTypes.STRING(45), // Soporte para IPv6
    allowNull: true
  },
  dispositivo_registro: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  total_ordenes: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  total_gastado: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
    validate: {
      min: 0
    }
  }
}, {
  tableName: 'users',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['email']
    },
    {
      unique: true,
      fields: ['whatsapp']
    },
    {
      fields: ['rol']
    },
    {
      fields: ['estado']
    },
    {
      fields: ['ultimo_acceso']
    }
  ],
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 12);
        user.password = await bcrypt.hash(user.password, salt);
      }
      user.fecha_registro = new Date();
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 12);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  }
});

// Instance methods
User.prototype.validatePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

User.prototype.isBlocked = function() {
  if (!this.bloqueado_hasta) return false;
  return new Date() < this.bloqueado_hasta;
};

// Método en español para compatibilidad con las rutas
User.prototype.estaBloqueado = function() {
  return this.isBlocked();
};

User.prototype.incrementLoginAttempts = async function() {
  this.intentos_login += 1;
  if (this.intentos_login >= 5) {
    // Bloquear por 30 minutos
    this.bloqueado_hasta = new Date(Date.now() + 30 * 60 * 1000);
  }
  await this.save();
};

// Método en español para compatibilidad con las rutas
User.prototype.incrementarIntentosLogin = async function() {
  return await this.incrementLoginAttempts();
};

User.prototype.resetLoginAttempts = async function() {
  this.intentos_login = 0;
  this.bloqueado_hasta = null;
  await this.save();
};

// Método en español para compatibilidad con las rutas
User.prototype.resetearIntentosLogin = async function() {
  return await this.resetLoginAttempts();
};

// Métodos de negocio adicionales
User.prototype.updateLastAccess = async function(ip = null, device = null) {
  this.ultimo_acceso = new Date();
  if (ip) this.ip_registro = ip;
  if (device) this.dispositivo_registro = device;
  await this.save();
};

User.prototype.canPlaceOrder = function() {
  return this.estado === 'activo' && !this.isBlocked();
};

User.prototype.getOrderStats = async function() {
  const { Order } = require('./index');
  
  const stats = await Order.findAll({
    where: { user_id: this.id },
    attributes: [
      [sequelize.fn('COUNT', sequelize.col('id')), 'total_orders'],
      [sequelize.fn('SUM', sequelize.col('monto')), 'total_spent'],
      [sequelize.fn('AVG', sequelize.col('monto')), 'average_order']
    ],
    raw: true
  });
  
  return stats[0] || { total_orders: 0, total_spent: 0, average_order: 0 };
};

User.prototype.isVIP = function() {
  return this.total_ordenes >= 10 || this.total_gastado >= 1000;
};

// Class methods
User.findByEmail = function(email) {
  return this.findOne({ where: { email } });
};

User.findByWhatsApp = function(whatsapp) {
  return this.findOne({ where: { whatsapp } });
};

User.findActiveUsers = function() {
  return this.findAll({
    where: { estado: 'activo' },
    order: [['ultimo_acceso', 'DESC']]
  });
};

User.findVIPUsers = function() {
  return this.findAll({
    where: {
      estado: 'activo',
      [sequelize.Op.or]: [
        { total_ordenes: { [sequelize.Op.gte]: 10 } },
        { total_gastado: { [sequelize.Op.gte]: 1000 } }
      ]
    },
    order: [['total_gastado', 'DESC']]
  });
};

User.getStats = async function() {
  const stats = await this.findAll({
    attributes: [
      'rol',
      'estado',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count']
    ],
    group: ['rol', 'estado'],
    raw: true
  });
  
  return stats;
};

module.exports = User;
