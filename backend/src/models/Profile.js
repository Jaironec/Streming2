const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Profile = sequelize.define('Profile', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  account_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'accounts',
      key: 'id'
    }
  },
  nombre_perfil: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'Perfil'
  },
  contraseña_perfil: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Contraseña específica del perfil si aplica'
  },
  estado: {
    type: DataTypes.ENUM('libre', 'asignado', 'bloqueado'),
    defaultValue: 'libre',
    allowNull: false
  },
  user_id_asignado: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  order_id_asignado: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'orders',
      key: 'id'
    }
  },
  fecha_asignacion: {
    type: DataTypes.DATE,
    allowNull: true
  },
  fecha_expiracion: {
    type: DataTypes.DATE,
    allowNull: true
  },
  ultimo_acceso: {
    type: DataTypes.DATE,
    allowNull: true
  },
  dispositivo_ultimo_acceso: {
    type: DataTypes.STRING(200),
    allowNull: true
  }
}, {
  tableName: 'profiles',
  timestamps: true,
  hooks: {
    beforeUpdate: (profile) => {
      if (profile.changed('estado') && profile.estado === 'asignado') {
        profile.fecha_asignacion = new Date();
      }
      if (profile.changed('estado') && profile.estado === 'libre') {
        profile.user_id_asignado = null;
        profile.order_id_asignado = null;
        profile.fecha_asignacion = null;
        profile.fecha_expiracion = null;
      }
    }
  }
});

// Instance methods
Profile.prototype.isExpired = function() {
  if (!this.fecha_expiracion) return false;
  return new Date() > this.fecha_expiracion;
};

Profile.prototype.daysUntilExpiration = function() {
  if (!this.fecha_expiracion) return null;
  const now = new Date();
  const diffTime = this.fecha_expiracion.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

Profile.prototype.canRenew = function() {
  if (this.estado !== 'asignado') return false;
  if (this.isExpired()) return false;
  
  // Permitir renovación si faltan 7 días o menos para vencer
  const daysUntilExp = this.daysUntilExpiration();
  return daysUntilExp !== null && daysUntilExp <= 7;
};

Profile.prototype.assignToUser = async function(userId, orderId, months) {
  this.estado = 'asignado';
  this.user_id_asignado = userId;
  this.order_id_asignado = orderId;
  this.fecha_asignacion = new Date();
  
  // Calcular fecha de expiración
  const fechaExpiracion = new Date();
  fechaExpiracion.setMonth(fechaExpiracion.getMonth() + months);
  this.fecha_expiracion = fechaExpiracion;
  
  await this.save();
  return this;
};

Profile.prototype.release = async function() {
  this.estado = 'libre';
  this.user_id_asignado = null;
  this.order_id_asignado = null;
  this.fecha_asignacion = null;
  this.fecha_expiracion = null;
  
  await this.save();
  return this;
};

// Class methods
Profile.findAvailableByService = function(service) {
  return this.findAll({
    where: { estado: 'libre' },
    include: [
      {
        model: sequelize.models.Account,
        as: 'account',
        where: { 
          servicio: service,
          estado: 'activo'
        }
      }
    ]
  });
};

Profile.findByUser = function(userId) {
  return this.findAll({
    where: { user_id_asignado: userId },
    include: [
      {
        model: sequelize.models.Account,
        as: 'account'
      },
      {
        model: sequelize.models.Order,
        as: 'order'
      }
    ],
    order: [['fecha_expiracion', 'ASC']]
  });
};

Profile.findExpired = function() {
  return this.findAll({
    where: {
      estado: 'asignado',
      fecha_expiracion: {
        [sequelize.Op.lt]: new Date()
      }
    }
  });
};

Profile.findExpiringSoon = function(days = 3) {
  const fechaLimite = new Date();
  fechaLimite.setDate(fechaLimite.getDate() + days);
  
  return this.findAll({
    where: {
      estado: 'asignado',
      fecha_expiracion: {
        [sequelize.Op.lte]: fechaLimite,
        [sequelize.Op.gt]: new Date()
      }
    },
    include: [
      {
        model: sequelize.models.User,
        as: 'user'
      }
    ]
  });
};

module.exports = Profile;
