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
      notEmpty: true
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
    defaultValue: 0
  },
  bloqueado_hasta: {
    type: DataTypes.DATE
  }
}, {
  tableName: 'users',
  timestamps: true,
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 12);
        user.password = await bcrypt.hash(user.password, salt);
      }
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

User.prototype.incrementLoginAttempts = async function() {
  this.intentos_login += 1;
  if (this.intentos_login >= 5) {
    // Bloquear por 30 minutos
    this.bloqueado_hasta = new Date(Date.now() + 30 * 60 * 1000);
  }
  await this.save();
};

User.prototype.resetLoginAttempts = async function() {
  this.intentos_login = 0;
  this.bloqueado_hasta = null;
  await this.save();
};

// Class methods
User.findByEmail = function(email) {
  return this.findOne({ where: { email } });
};

User.findByWhatsApp = function(whatsapp) {
  return this.findOne({ where: { whatsapp } });
};

module.exports = User;
