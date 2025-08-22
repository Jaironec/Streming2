const { Sequelize } = require('sequelize');
require('dotenv').config();

// Log de configuración para debugging
console.log('🔧 Configuración de base de datos:');
console.log('  Host:', process.env.DB_HOST || 'localhost');
console.log('  Puerto:', process.env.DB_PORT || 5432);
console.log('  Base de datos:', process.env.DB_NAME || 'streaming_system');
console.log('  Usuario:', process.env.DB_USER || 'postgres');
console.log('  Contraseña:', process.env.DB_PASSWORD ? '***' : 'No configurada');

// Configuración de la base de datos
const sequelize = new Sequelize(
  process.env.DB_NAME || 'streaming_system',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || '2514jajaJAJA',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: process.env.DB_DIALECT || 'postgres',
    
    // Configuración de logging
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    
    // Configuración de pool de conexiones optimizada
    pool: {
      max: 5,            // Reducido para mejor estabilidad
      min: 0,            // Mínimo número de conexiones en el pool
      acquire: 60000,    // Aumentado para evitar timeouts
      idle: 30000        // Aumentado para mantener conexiones activas
    },
    
    // Configuración de timezone
    timezone: '+00:00',
    
    // Configuración de Sequelize optimizada
    define: {
      timestamps: true,      // Agregar createdAt y updatedAt automáticamente
      underscored: true,     // Usar snake_case para nombres de columnas
      freezeTableName: true, // No pluralizar nombres de tablas
      charset: 'utf8',
      collate: 'utf8_general_ci'
    },
    
    // Configuración de dialect específica para PostgreSQL
    dialectOptions: {
      ssl: process.env.NODE_ENV === 'production' ? {
        require: true,
        rejectUnauthorized: false
      } : false,
      charset: 'utf8',
      collate: 'utf8_general_ci'
    }
  }
);

// Función para probar la conexión
async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a la base de datos establecida exitosamente.');
    return true;
  } catch (error) {
    console.error('❌ No se pudo conectar a la base de datos:', error);
    return false;
  }
}

// Función para sincronizar modelos
async function syncModels(force = false) {
  try {
    if (force) {
      await sequelize.sync({ force: true });
      console.log('🔄 Modelos de base de datos sincronizados (force: true).');
    } else {
      await sequelize.sync({ alter: true });
      console.log('🔄 Modelos de base de datos sincronizados (alter: true).');
    }
    return true;
  } catch (error) {
    console.error('❌ Error al sincronizar modelos:', error);
    return false;
  }
}

// Función para cerrar la conexión
async function closeConnection() {
  try {
    await sequelize.close();
    console.log('🔌 Conexión a la base de datos cerrada.');
    return true;
  } catch (error) {
    console.error('❌ Error al cerrar la conexión:', error);
    return false;
  }
}

// Eventos de conexión optimizados
sequelize.addHook('beforeConnect', async (config) => {
  console.log('🔌 Intentando conectar a la base de datos...');
});

sequelize.addHook('afterConnect', async (connection) => {
  console.log('✅ Conexión establecida con la base de datos.');
});

// Manejo de errores de conexión mejorado
sequelize.addHook('afterDisconnect', async (connection) => {
  console.log('🔌 Conexión a la base de datos perdida.');
});

// Exportar funciones y instancia
module.exports = {
  sequelize,
  testConnection,
  syncModels,
  closeConnection
};
