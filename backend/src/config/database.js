const { Sequelize } = require('sequelize');
require('dotenv').config();

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

// ===== CONFIGURACIÓN DE LOGGING =====
const logConfig = () => {
  if (isProduction) return;
  
  console.log('🔧 Configuración de base de datos:');
  console.log('  Host:', process.env.DB_HOST || 'localhost');
  console.log('  Puerto:', process.env.DB_PORT || 5432);
  console.log('  Base de datos:', process.env.DB_NAME || 'streaming_system');
  console.log('  Usuario:', process.env.DB_USER || 'postgres');
  console.log('  Contraseña:', process.env.DB_PASSWORD ? '***' : 'No configurada');
  console.log('  Entorno:', NODE_ENV);
};

// ===== CONFIGURACIÓN DE POOL OPTIMIZADA =====
const getPoolConfig = () => {
  if (isProduction) {
    return {
      max: 20,            // Más conexiones para producción
      min: 5,             // Más conexiones mínimas
      acquire: 60000,     // Más tiempo para adquirir
      idle: 30000,        // Más tiempo de inactividad
      evict: 300000       // Verificar cada 5 minutos
    };
  }
  
  return {
    max: 10,            // Desarrollo: menos conexiones
    min: 2,             // Mínimo de conexiones activas
    acquire: 30000,     // Tiempo para adquirir conexión
    idle: 10000,        // Tiempo de inactividad
    evict: 60000        // Verificar conexiones cada minuto
  };
};

// ===== CONFIGURACIÓN DE SSL =====
const getSSLConfig = () => {
  if (isProduction) {
    return {
      require: true,
      rejectUnauthorized: false
    };
  }
  return false;
};

// ===== CONFIGURACIÓN DE TIMEOUTS =====
const getTimeoutConfig = () => {
  if (isProduction) {
    return {
      statement_timeout: 60000,        // 1 minuto en producción
      idle_in_transaction_session_timeout: 60000,
      lock_timeout: 30000,            // 30 segundos para locks
      deadlock_timeout: 1000          // 1 segundo para deadlocks
    };
  }
  
  return {
    statement_timeout: 30000,         // 30 segundos en desarrollo
    idle_in_transaction_session_timeout: 30000
  };
};

// Ejecutar logging de configuración
logConfig();

// ===== INSTANCIA DE SEQUELIZE =====
const sequelize = new Sequelize(
  process.env.DB_NAME || 'streaming_system',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || '2514jajaJAJA',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: process.env.DB_DIALECT || 'postgres',
    
    // ===== LOGGING INTELIGENTE =====
    logging: isProduction ? false : (msg) => {
      // Solo log de queries en desarrollo, no de conexión
      if (!msg.includes('Executing') && !msg.includes('Connection')) {
        console.log('📊 DB:', msg);
      }
    },
    
    // ===== POOL DE CONEXIONES OPTIMIZADO =====
    pool: getPoolConfig(),
    
    // ===== CONFIGURACIÓN DE TIMEZONE =====
    timezone: '+00:00',
    
    // ===== CONFIGURACIÓN DE SEQUELIZE =====
    define: {
      timestamps: true,      // createdAt y updatedAt automáticos
      underscored: true,     // snake_case para columnas
      freezeTableName: true, // No pluralizar tablas
      charset: 'utf8',
      collate: 'utf8_general_ci',
      // Configuraciones adicionales para estabilidad
      paranoid: false,       // No soft deletes por defecto
      version: false,        // No versionado automático
      // Evitar problemas con ENUMs en PostgreSQL
      enum: true
    },
    
    // ===== CONFIGURACIÓN DE DIALECTO POSTGRESQL =====
    dialectOptions: {
      ssl: getSSLConfig(),
      charset: 'utf8',
      collate: 'utf8_general_ci',
      // Timeouts optimizados
      ...getTimeoutConfig(),
      // Configuraciones adicionales para estabilidad
      application_name: 'streaming-system-backend',
      // Configuración de arrays y JSON
      array: true,
      json: true
    },
    
    // ===== CONFIGURACIÓN DE REINTENTOS =====
    retry: {
      max: isProduction ? 5 : 3,        // Más reintentos en producción
      timeout: isProduction ? 10000 : 5000,
      match: [
        /SequelizeConnectionError/,
        /SequelizeConnectionRefusedError/,
        /SequelizeHostNotFoundError/,
        /SequelizeHostNotReachableError/,
        /SequelizeInvalidConnectionError/,
        /SequelizeConnectionTimedOutError/,
        /SequelizeConnectionAcquireTimeoutError/,
        /SequelizeQueryError/
      ]
    },
    
    // ===== CONFIGURACIÓN DE TRANSACCIONES =====
    isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.READ_COMMITTED,
    
    // ===== CONFIGURACIÓN DE QUERIES =====
    query: {
      raw: false,           // Siempre retornar instancias de Sequelize
      nest: true,           // Anidar resultados de joins
      plain: false          // No retornar objetos planos por defecto
    }
  }
);

// ===== FUNCIONES DE UTILIDAD =====

// Función para probar la conexión con reintentos
async function testConnection(retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      await sequelize.authenticate();
      console.log('✅ Conexión a la base de datos establecida exitosamente.');
      return true;
    } catch (error) {
      console.error(`❌ Intento ${i + 1}/${retries} - No se pudo conectar:`, error.message);
      
      if (i === retries - 1) {
        console.error('❌ Fallaron todos los intentos de conexión');
        return false;
      }
      
      // Esperar antes del siguiente intento
      await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
    }
  }
  return false;
}

// Función para sincronizar modelos con validación
async function syncModels(force = false, alter = false) {
  try {
    if (force) {
      console.log('⚠️  Sincronizando modelos con force: true (CUIDADO: esto eliminará datos)');
      await sequelize.sync({ force: true });
      console.log('🔄 Modelos de base de datos sincronizados (force: true).');
    } else if (alter) {
      console.log('🔄 Sincronizando modelos con alter: true');
      await sequelize.sync({ alter: true });
      console.log('✅ Modelos de base de datos sincronizados (alter: true).');
    } else {
      console.log('🔄 Sincronizando modelos (solo verificación)');
      await sequelize.sync();
      console.log('✅ Modelos de base de datos verificados.');
    }
    return true;
  } catch (error) {
    console.error('❌ Error al sincronizar modelos:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    return false;
  }
}

// Función para cerrar la conexión de forma segura
async function closeConnection() {
  try {
    console.log('🔌 Cerrando conexiones de base de datos...');
    await sequelize.close();
    console.log('✅ Conexión a la base de datos cerrada correctamente.');
    return true;
  } catch (error) {
    console.error('❌ Error al cerrar la conexión:', error.message);
    return false;
  }
}

// Función para obtener estadísticas de conexión
async function getConnectionStats() {
  try {
    const pool = sequelize.connectionManager.pool;
    return {
      total: pool.size,
      idle: pool.idle,
      using: pool.using,
      pending: pool.pending
    };
  } catch (error) {
    return { error: error.message };
  }
}

// ===== HOOKS DE CONEXIÓN OPTIMIZADOS =====
if (!isProduction) {
  sequelize.addHook('beforeConnect', async (config) => {
    console.log('🔌 Intentando conectar a la base de datos...');
  });

  sequelize.addHook('afterConnect', async (connection) => {
    console.log('✅ Conexión establecida con la base de datos.');
  });

  sequelize.addHook('afterDisconnect', async (connection) => {
    console.log('🔌 Conexión a la base de datos perdida.');
  });

  sequelize.addHook('beforeQuery', async (options) => {
    if (options.sql && options.sql.length > 100) {
      console.log('📊 Query ejecutándose:', options.sql.substring(0, 100) + '...');
    }
  });
}

// ===== MANEJO DE ERRORES DE CONEXIÓN =====
sequelize.addHook('afterConnect', async (connection) => {
  // Configurar timeout de conexión
  connection.query('SET statement_timeout = 30000');
  connection.query('SET idle_in_transaction_session_timeout = 30000');
});

// ===== EXPORTAR FUNCIONES Y INSTANCIA =====
module.exports = {
  sequelize,
  testConnection,
  syncModels,
  closeConnection,
  getConnectionStats,
  // Configuraciones para uso externo
  config: {
    isProduction,
    pool: getPoolConfig(),
    ssl: getSSLConfig(),
    timeouts: getTimeoutConfig()
  }
};
