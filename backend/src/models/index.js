const User = require('./User');
const Order = require('./Order');
const Payment = require('./Payment');
const Account = require('./Account');
const Profile = require('./Profile');
const Service = require('./Service');

// Definir asociaciones principales con índices optimizados
User.hasMany(Order, { 
  foreignKey: 'user_id', 
  as: 'orders',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});
Order.belongsTo(User, { 
  foreignKey: 'user_id', 
  as: 'user',
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE'
});

// Asociación para pagos validados por admin
User.hasMany(Payment, { 
  foreignKey: 'admin_id', 
  as: 'validatedPayments',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE'
});
Payment.belongsTo(User, { 
  foreignKey: 'admin_id', 
  as: 'admin',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE'
});

// Asociación Order-Payment (1:1)
Order.hasOne(Payment, { 
  foreignKey: 'order_id', 
  as: 'payment',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});
Payment.belongsTo(Order, { 
  foreignKey: 'order_id', 
  as: 'order',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});

// Asociación Account-Profile (1:N)
Account.hasMany(Profile, { 
  foreignKey: 'account_id', 
  as: 'profiles',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});
Profile.belongsTo(Account, { 
  foreignKey: 'account_id', 
  as: 'account',
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE'
});

// Asociación User-Profile (perfiles asignados)
User.hasMany(Profile, { 
  foreignKey: 'user_id_asignado', 
  as: 'assignedProfiles',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE'
});
Profile.belongsTo(User, { 
  foreignKey: 'user_id_asignado', 
  as: 'user',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE'
});

// Asociación Order-Profile (perfiles asignados por orden)
Order.hasMany(Profile, { 
  foreignKey: 'order_id_asignado', 
  as: 'assignedProfiles',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE'
});
Profile.belongsTo(Order, { 
  foreignKey: 'order_id_asignado', 
  as: 'order',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE'
});

// Asociación Service-Order usando el nombre del servicio como referencia
// Esta asociación es más segura y no causa problemas de sincronización
// Comentada temporalmente para evitar errores de sintaxis
/*
Service.hasMany(Order, { 
  foreignKey: 'servicio', 
  sourceKey: 'nombre', 
  as: 'orders',
  constraints: false, // Evita problemas de sincronización
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE'
});

Order.belongsTo(Service, { 
  foreignKey: 'servicio', 
  targetKey: 'nombre', 
  as: 'service',
  constraints: false, // Evita problemas de sincronización
  onDelete: 'RESTRICT',
  onUpdate: 'CASCADE'
});
*/

// Función para sincronizar todos los modelos
async function syncAllModels(force = false) {
  try {
    await sequelize.sync({ force, alter: !force });
    console.log(`✅ Modelos sincronizados ${force ? '(force)' : '(alter)'}`);
    return true;
  } catch (error) {
    console.error('❌ Error al sincronizar modelos:', error);
    return false;
  }
}

// Función para verificar integridad de asociaciones
async function checkAssociations() {
  try {
    const models = { User, Order, Payment, Account, Profile, Service };
    const associations = [];
    
    for (const [modelName, model] of Object.entries(models)) {
      if (model.associations) {
        for (const [assocName, association] of Object.entries(model.associations)) {
          associations.push({
            model: modelName,
            association: assocName,
            type: association.associationType,
            target: association.target.name,
            foreignKey: association.foreignKey
          });
        }
      }
    }
    
    console.log(`✅ ${associations.length} asociaciones verificadas`);
    return associations;
  } catch (error) {
    console.error('❌ Error al verificar asociaciones:', error);
    return [];
  }
}

module.exports = {
  User,
  Order,
  Payment,
  Account,
  Profile,
  Service,
  syncAllModels,
  checkAssociations
};
