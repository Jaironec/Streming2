const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Service = sequelize.define('Service', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  nombre: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  logo: {
    type: DataTypes.STRING(10),
    allowNull: false
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  precio_base: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0.01
    }
  },
  max_perfiles: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 4,
    validate: {
      min: 1,
      max: 10
    }
  },
  descuento_3_meses: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 10.00,
    validate: {
      min: 0,
      max: 100
    }
  },
  descuento_6_meses: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 20.00,
    validate: {
      min: 0,
      max: 100
    }
  },
  descuento_12_meses: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 35.00,
    validate: {
      min: 0,
      max: 100
    }
  },
  descuento_perfil_adicional: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 5.00,
    validate: {
      min: 0,
      max: 100
    }
  },
  estado: {
    type: DataTypes.ENUM('activo', 'inactivo'),
    defaultValue: 'activo',
    allowNull: false
  },
  popular: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'services',
  timestamps: true
});

module.exports = Service;
