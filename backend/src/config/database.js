const { Sequelize } = require('sequelize');
require('dotenv').config();

// Log de configuración solo en desarrollo
if (process.env.NODE_ENV === 'development') {
  console.log('🔧 Configuración de base de datos:');
  console.log('  Host:', process.env.DB_HOST || 'localhost');
  console.log('  Puerto:', process.env.DB_PORT || 5432);
  console.log('  Base de datos:', process.env.DB_NAME || 'streaming_system');
  console.log('  Usuario:', process.env.DB_USER || 'postgres');
  console.log('  Contraseña:', process.env.DB_PASSWORD ? '***' : 'No configurada');
}

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
    
    // Configuración de pool de conexiones optimizada para estabilidad
    pool: {
      max: 10,            // Aumentado para mejor rendimiento
      min: 2,             // Mínimo de conexiones activas
      acquire: 30000,     // Tiempo para adquirir conexión
      idle: 10000,        // Tiempo de inactividad
      evict: 60000        // Verificar conexiones cada minuto
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
      collate: 'utf8_general_ci',
      // Configuraciones adicionales para estabilidad
      statement_timeout: 30000,
      idle_in_transaction_session_timeout: 30000
    },
    
    // Configuraciones adicionales para estabilidad
    retry: {
      max: 3,
      timeout: 5000
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

// Eventos de conexión optimizados - Solo log en desarrollo
if (process.env.NODE_ENV === 'development') {
  sequelize.addHook('beforeConnect', async (config) => {
    console.log('🔌 Intentando conectar a la base de datos...');
  });

  sequelize.addHook('afterConnect', async (connection) => {
    console.log('✅ Conexión establecida con la base de datos.');
  });

  sequelize.addHook('afterDisconnect', async (connection) => {
    console.log('🔌 Conexión a la base de datos perdida.');
  });
}

// Exportar funciones y instancia
module.exports = {
  sequelize,
  testConnection,
  syncModels,
  closeConnection
};
