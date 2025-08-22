const User = require('./User');
const Order = require('./Order');
const Payment = require('./Payment');
const Account = require('./Account');
const Profile = require('./Profile');
const Service = require('./Service');

// Definir asociaciones
User.hasMany(Order, { foreignKey: 'user_id', as: 'orders' });
Order.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(Payment, { foreignKey: 'admin_id', as: 'validatedPayments' });
Payment.belongsTo(User, { foreignKey: 'admin_id', as: 'admin' });

Order.hasOne(Payment, { foreignKey: 'order_id', as: 'payment' });
Payment.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });

Account.hasMany(Profile, { foreignKey: 'account_id', as: 'profiles' });
Profile.belongsTo(Account, { foreignKey: 'account_id', as: 'account' });

User.hasMany(Profile, { foreignKey: 'user_id_asignado', as: 'assignedProfiles' });
Profile.belongsTo(User, { foreignKey: 'user_id_asignado', as: 'user' });

Order.hasMany(Profile, { foreignKey: 'order_id_asignado', as: 'assignedProfiles' });
Profile.belongsTo(Order, { foreignKey: 'order_id_asignado', as: 'order' });

// Asociaciones para servicios
Service.hasMany(Order, { foreignKey: 'servicio', sourceKey: 'nombre', as: 'orders' });
Order.belongsTo(Service, { foreignKey: 'servicio', targetKey: 'nombre', as: 'service' });

module.exports = {
  User,
  Order,
  Payment,
  Account,
  Profile,
  Service
};
