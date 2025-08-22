const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  order_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'orders',
      key: 'id'
    }
  },
  archivo_comprobante: {
    type: DataTypes.STRING(500),
    allowNull: false,
    comment: 'Ruta del archivo en el servidor'
  },
  resultado_ocr: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Resultado del procesamiento OCR: {monto, fecha, cuenta, confianza}'
  },
  validado_automatico: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Si fue validado automáticamente por OCR'
  },
  validado_admin: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Si fue validado manualmente por admin'
  },
  estado_final: {
    type: DataTypes.ENUM('pendiente', 'aprobado', 'rechazado'),
    defaultValue: 'pendiente',
    allowNull: false
  },
  comentarios_admin: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  fecha_validacion: {
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
  }
}, {
  tableName: 'payments',
  timestamps: true,
  hooks: {
    beforeUpdate: (payment) => {
      if (payment.changed('estado_final') && payment.estado_final !== 'pendiente') {
        payment.fecha_validacion = new Date();
      }
    }
  }
});

// Instance methods
Payment.prototype.isValidated = function() {
  return this.validado_automatico || this.validado_admin;
};

Payment.prototype.getValidationSource = function() {
  if (this.validado_automatico) return 'OCR Automático';
  if (this.validado_admin) return 'Admin Manual';
  return 'Pendiente';
};

// Class methods
Payment.findByOrder = function(orderId) {
  return this.findOne({
    where: { order_id: orderId },
    order: [['createdAt', 'DESC']]
  });
};

Payment.findPendingPayments = function() {
  return this.findAll({
    where: { estado_final: 'pendiente' },
    include: [
      {
        model: sequelize.models.Order,
        as: 'order',
        include: [
          {
            model: sequelize.models.User,
            as: 'user'
          }
        ]
      }
    ],
    order: [['createdAt', 'ASC']]
  });
};

module.exports = Payment;
