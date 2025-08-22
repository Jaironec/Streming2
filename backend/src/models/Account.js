const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Account = sequelize.define('Account', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  servicio: {
    type: DataTypes.ENUM('Netflix', 'Disney+', 'HBO Max', 'Amazon Prime', 'Paramount+', 'Apple TV+'),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  estado: {
    type: DataTypes.ENUM('activo', 'suspendido', 'bloqueado'),
    defaultValue: 'activo',
    allowNull: false
  },
  fecha_creacion: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false
  },
  ultimo_acceso: {
    type: DataTypes.DATE,
    allowNull: true
  },
  perfiles_disponibles: {
    type: DataTypes.INTEGER,
    defaultValue: 4,
    validate: {
      min: 1,
      max: 6
    }
  },
  notas_admin: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'accounts',
  timestamps: true
});

// Instance methods
Account.prototype.isAvailable = function() {
  return this.estado === 'activo';
};

Account.prototype.getAvailableProfiles = async function() {
  const Profile = sequelize.models.Profile;
  return await Profile.count({
    where: {
      account_id: this.id,
      estado: 'libre'
    }
  });
};

// Class methods
Account.findAvailableByService = function(service) {
  return this.findAll({
    where: {
      servicio: service,
      estado: 'activo'
    },
    include: [
      {
        model: sequelize.models.Profile,
        as: 'profiles',
        where: { estado: 'libre' },
        required: false
      }
    ]
  });
};

Account.findByService = function(service) {
  return this.findAll({
    where: { servicio: service },
    include: [
      {
        model: sequelize.models.Profile,
        as: 'profiles'
      }
    ]
  });
};

module.exports = Account;
