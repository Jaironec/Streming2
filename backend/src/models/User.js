const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    comment: 'Identificador único del usuario'
  },
  nombre: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'El nombre no puede estar vacío'
      },
      len: {
        args: [2, 100],
        msg: 'El nombre debe tener entre 2 y 100 caracteres'
      },
      is: {
        args: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/,
        msg: 'El nombre solo puede contener letras y espacios'
      }
    },
    comment: 'Nombre completo del usuario'
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: {
      msg: 'Este email ya está registrado'
    },
    validate: {
      isEmail: {
        msg: 'Formato de email inválido'
      },
      notEmpty: {
        msg: 'El email no puede estar vacío'
      },
      len: {
        args: [5, 100],
        msg: 'El email debe tener entre 5 y 100 caracteres'
      }
    },
    comment: 'Email único del usuario para autenticación'
  },
  whatsapp: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: {
      msg: 'Este número de WhatsApp ya está registrado'
    },
    validate: {
      notEmpty: {
        msg: 'El número de WhatsApp no puede estar vacío'
      },
      is: {
        args: /^\+?[1-9]\d{1,14}$/,
        msg: 'Formato de WhatsApp inválido. Debe ser un número internacional válido'
      }
    },
    comment: 'Número de WhatsApp único para notificaciones'
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'La contraseña no puede estar vacía'
      },
      len: {
        args: [8, 255],
        msg: 'La contraseña debe tener al menos 8 caracteres'
      },
      is: {
        args: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        msg: 'La contraseña debe contener al menos una minúscula, una mayúscula, un número y un carácter especial'
      }
    },
    comment: 'Contraseña hasheada del usuario'
  },
  rol: {
    type: DataTypes.ENUM('cliente', 'admin'),
    defaultValue: 'cliente',
    allowNull: false,
    validate: {
      isIn: {
        args: [['cliente', 'admin']],
        msg: 'El rol debe ser cliente o admin'
      }
    },
    comment: 'Rol del usuario en el sistema'
  },
  estado: {
    type: DataTypes.ENUM('activo', 'suspendido', 'eliminado'),
    defaultValue: 'activo',
    allowNull: false,
    validate: {
      isIn: {
        args: [['activo', 'suspendido', 'eliminado']],
        msg: 'El estado debe ser activo, suspendido o eliminado'
      }
    },
    comment: 'Estado actual de la cuenta del usuario'
  },
  ultimo_acceso: {
    type: DataTypes.DATE,
    comment: 'Fecha y hora del último acceso al sistema'
  },
  intentos_login: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: {
        args: 0,
        msg: 'Los intentos de login no pueden ser negativos'
      },
      max: {
        args: 10,
        msg: 'Los intentos de login no pueden exceder 10'
      }
    },
    comment: 'Número de intentos fallidos de login'
  },
  bloqueado_hasta: {
    type: DataTypes.DATE,
    comment: 'Fecha y hora hasta la cual la cuenta está bloqueada'
  },
  fecha_registro: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    comment: 'Fecha y hora de registro en el sistema'
  },
  ip_registro: {
    type: DataTypes.STRING(45), // Soporte para IPv6
    allowNull: true,
    validate: {
      isIP: {
        msg: 'IP de registro inválida'
      }
    },
    comment: 'Dirección IP desde la cual se registró'
  },
  dispositivo_registro: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: 'Información del dispositivo de registro'
  },
  total_ordenes: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: {
        args: 0,
        msg: 'El total de órdenes no puede ser negativo'
      }
    },
    comment: 'Total de órdenes realizadas por el usuario'
  },
  total_gastado: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
    validate: {
      min: {
        args: 0,
        msg: 'El total gastado no puede ser negativo'
      }
    },
    comment: 'Total gastado en todas las órdenes'
  }
}, {
  tableName: 'users',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['email'],
      name: 'users_email_unique'
    },
    {
      unique: true,
      fields: ['whatsapp'],
      name: 'users_whatsapp_unique'
    },
    {
      fields: ['rol'],
      name: 'users_rol_index'
    },
    {
      fields: ['estado'],
      name: 'users_estado_index'
    },
    {
      fields: ['ultimo_acceso'],
      name: 'users_ultimo_acceso_index'
    },
    {
      fields: ['fecha_registro'],
      name: 'users_fecha_registro_index'
    }
  ],
  hooks: {
    beforeCreate: async (user) => {
      try {
        if (user.password) {
          const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
          const salt = await bcrypt.genSalt(saltRounds);
          user.password = await bcrypt.hash(user.password, salt);
        }
        user.fecha_registro = new Date();
        
        // Normalizar email
        if (user.email) {
          user.email = user.email.toLowerCase().trim();
        }
        
        // Normalizar nombre
        if (user.nombre) {
          user.nombre = user.nombre.trim().replace(/\s+/g, ' ');
        }
        
        // Normalizar WhatsApp
        if (user.whatsapp) {
          user.whatsapp = user.whatsapp.trim();
          if (!user.whatsapp.startsWith('+')) {
            user.whatsapp = '+' + user.whatsapp;
          }
        }
      } catch (error) {
        throw new Error(`Error al procesar datos del usuario: ${error.message}`);
      }
    },
    beforeUpdate: async (user) => {
      try {
        if (user.changed('password')) {
          const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
          const salt = await bcrypt.genSalt(saltRounds);
          user.password = await bcrypt.hash(user.password, salt);
        }
        
        // Normalizar campos si han cambiado
        if (user.changed('email')) {
          user.email = user.email.toLowerCase().trim();
        }
        
        if (user.changed('nombre')) {
          user.nombre = user.nombre.trim().replace(/\s+/g, ' ');
        }
        
        if (user.changed('whatsapp')) {
          user.whatsapp = user.whatsapp.trim();
          if (!user.whatsapp.startsWith('+')) {
            user.whatsapp = '+' + user.whatsapp;
          }
        }
      } catch (error) {
        throw new Error(`Error al actualizar usuario: ${error.message}`);
      }
    },
    beforeValidate: (user) => {
      // Validaciones adicionales antes de la validación de Sequelize
      if (user.nombre) {
        user.nombre = user.nombre.trim();
      }
      if (user.email) {
        user.email = user.email.trim();
      }
      if (user.whatsapp) {
        user.whatsapp = user.whatsapp.trim();
      }
    }
  }
});

// ===== MÉTODOS DE INSTANCIA =====

// Validar contraseña
User.prototype.validatePassword = async function(password) {
  try {
    if (!password) return false;
    return await bcrypt.compare(password, this.password);
  } catch (error) {
    console.error('Error al validar contraseña:', error);
    return false;
  }
};

// Verificar si está bloqueado
User.prototype.isBlocked = function() {
  if (!this.bloqueado_hasta) return false;
  return new Date() < this.bloqueado_hasta;
};

// Método en español para compatibilidad
User.prototype.estaBloqueado = function() {
  return this.isBlocked();
};

// Obtener tiempo restante de bloqueo
User.prototype.getBlockTimeRemaining = function() {
  if (!this.isBlocked()) return 0;
  const now = new Date();
  const remaining = this.bloqueado_hasta - now;
  return Math.ceil(remaining / (1000 * 60)); // En minutos
};

// Incrementar intentos de login
User.prototype.incrementLoginAttempts = async function() {
  try {
    this.intentos_login += 1;
    
    if (this.intentos_login >= 5) {
      // Bloquear por 30 minutos
      this.bloqueado_hasta = new Date(Date.now() + 30 * 60 * 1000);
      console.log(`🔒 Usuario ${this.email} bloqueado por 30 minutos`);
    }
    
    await this.save();
    return this.intentos_login;
  } catch (error) {
    console.error('Error al incrementar intentos de login:', error);
    throw error;
  }
};

// Método en español para compatibilidad
User.prototype.incrementarIntentosLogin = async function() {
  return await this.incrementLoginAttempts();
};

// Resetear intentos de login
User.prototype.resetLoginAttempts = async function() {
  try {
    this.intentos_login = 0;
    this.bloqueado_hasta = null;
    await this.save();
    return true;
  } catch (error) {
    console.error('Error al resetear intentos de login:', error);
    throw error;
  }
};

// Método en español para compatibilidad
User.prototype.resetearIntentosLogin = async function() {
  return await this.resetLoginAttempts();
};

// Actualizar último acceso
User.prototype.updateLastAccess = async function(ip = null, device = null) {
  try {
    this.ultimo_acceso = new Date();
    if (ip) this.ip_registro = ip;
    if (device) this.dispositivo_registro = device;
    await this.save();
    return true;
  } catch (error) {
    console.error('Error al actualizar último acceso:', error);
    throw error;
  }
};

// Verificar si puede realizar órdenes
User.prototype.canPlaceOrder = function() {
  return this.estado === 'activo' && !this.isBlocked();
};

// Obtener estadísticas de órdenes
User.prototype.getOrderStats = async function() {
  try {
    const { Order } = require('./index');
    
    const stats = await Order.findAll({
      where: { user_id: this.id },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'total_orders'],
        [sequelize.fn('SUM', sequelize.col('monto')), 'total_spent'],
        [sequelize.fn('AVG', sequelize.col('monto')), 'average_order'],
        [sequelize.fn('MAX', sequelize.col('monto')), 'highest_order'],
        [sequelize.fn('MIN', sequelize.col('monto')), 'lowest_order']
      ],
      raw: true
    });
    
    return stats[0] || { 
      total_orders: 0, 
      total_spent: 0, 
      average_order: 0,
      highest_order: 0,
      lowest_order: 0
    };
  } catch (error) {
    console.error('Error al obtener estadísticas de órdenes:', error);
    return { 
      total_orders: 0, 
      total_spent: 0, 
      average_order: 0,
      highest_order: 0,
      lowest_order: 0
    };
  }
};

// Verificar si es usuario VIP
User.prototype.isVIP = function() {
  return this.total_ordenes >= 10 || this.total_gastado >= 1000;
};

// Obtener nivel de usuario
User.prototype.getUserLevel = function() {
  if (this.isVIP()) return 'VIP';
  if (this.total_ordenes >= 5) return 'Regular';
  if (this.total_ordenes >= 1) return 'Nuevo';
  return 'Sin órdenes';
};

// ===== MÉTODOS DE CLASE =====

// Buscar por email
User.findByEmail = function(email) {
  if (!email) throw new Error('Email es requerido');
  return this.findOne({ 
    where: { email: email.toLowerCase().trim() },
    attributes: { exclude: ['password'] }
  });
};

// Buscar por WhatsApp
User.findByWhatsApp = function(whatsapp) {
  if (!whatsapp) throw new Error('WhatsApp es requerido');
  let normalizedWhatsApp = whatsapp.trim();
  if (!normalizedWhatsApp.startsWith('+')) {
    normalizedWhatsApp = '+' + normalizedWhatsApp;
  }
  return this.findOne({ 
    where: { whatsapp: normalizedWhatsApp },
    attributes: { exclude: ['password'] }
  });
};

// Buscar usuarios activos
User.findActiveUsers = function() {
  return this.findAll({
    where: { estado: 'activo' },
    order: [['ultimo_acceso', 'DESC']],
    attributes: { exclude: ['password'] }
  });
};

// Buscar usuarios VIP
User.findVIPUsers = function() {
  return this.findAll({
    where: {
      estado: 'activo',
      [sequelize.Op.or]: [
        { total_ordenes: { [sequelize.Op.gte]: 10 } },
        { total_gastado: { [sequelize.Op.gte]: 1000 } }
      ]
    },
    order: [['total_gastado', 'DESC']],
    attributes: { exclude: ['password'] }
  });
};

// Obtener estadísticas generales
User.getStats = async function() {
  try {
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
  } catch (error) {
    console.error('Error al obtener estadísticas de usuarios:', error);
    return [];
  }
};

// Buscar usuarios por criterios
User.searchUsers = function(criteria = {}) {
  const where = {};
  
  if (criteria.rol) where.rol = criteria.rol;
  if (criteria.estado) where.estado = criteria.estado;
  if (criteria.search) {
    where[sequelize.Op.or] = [
      { nombre: { [sequelize.Op.iLike]: `%${criteria.search}%` } },
      { email: { [sequelize.Op.iLike]: `%${criteria.search}%` } },
      { whatsapp: { [sequelize.Op.iLike]: `%${criteria.search}%` } }
    ];
  }
  
  return this.findAll({
    where,
    order: [['created_at', 'DESC']],
    attributes: { exclude: ['password'] },
    limit: criteria.limit || 50,
    offset: criteria.offset || 0
  });
};

module.exports = User;
