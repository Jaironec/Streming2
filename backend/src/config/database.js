const { Sequelize } = require('sequelize');
require('dotenv').config();

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
    
    // Configuración de pool de conexiones
    pool: {
      max: 10,           // Máximo número de conexiones en el pool
      min: 0,            // Mínimo número de conexiones en el pool
      acquire: 30000,    // Tiempo máximo para adquirir una conexión
      idle: 10000        // Tiempo máximo que una conexión puede estar inactiva
    },
    
    // Configuración de timezone
    timezone: process.env.CRON_TIMEZONE || '+00:00',
    
    // Configuración de Sequelize
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

// Función para obtener estadísticas de la base de datos
async function getDatabaseStats() {
  try {
    const stats = {
      tables: [],
      totalRecords: 0,
      size: '0 MB'
    };

    // Obtener información de las tablas
    const tables = await sequelize.query(
      "SELECT table_name, table_rows FROM information_schema.tables WHERE table_schema = 'public'",
      { type: Sequelize.QueryTypes.SELECT }
    );

    for (const table of tables) {
      const recordCount = await sequelize.query(
        `SELECT COUNT(*) as count FROM "${table.table_name}"`,
        { type: Sequelize.QueryTypes.SELECT }
      );
      
      stats.tables.push({
        name: table.table_name,
        records: parseInt(recordCount[0].count)
      });
      
      stats.totalRecords += parseInt(recordCount[0].count);
    }

    // Obtener tamaño de la base de datos
    const sizeResult = await sequelize.query(
      "SELECT pg_size_pretty(pg_database_size(current_database())) as size",
      { type: Sequelize.QueryTypes.SELECT }
    );
    
    stats.size = sizeResult[0].size;

    return stats;
  } catch (error) {
    console.error('❌ Error al obtener estadísticas de la base de datos:', error);
    return null;
  }
}

// Función para crear backup de la base de datos
async function createBackup() {
  try {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `./backups/backup-${timestamp}.sql`;
    
    const command = `PGPASSWORD="${process.env.DB_PASSWORD}" pg_dump -h ${process.env.DB_HOST} -U ${process.env.DB_USER} -d ${process.env.DB_NAME} > ${backupPath}`;
    
    await execAsync(command);
    console.log(`💾 Backup creado exitosamente: ${backupPath}`);
    
    return backupPath;
  } catch (error) {
    console.error('❌ Error al crear backup:', error);
    return null;
  }
}

// Función para restaurar backup
async function restoreBackup(backupPath) {
  try {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    const command = `PGPASSWORD="${process.env.DB_PASSWORD}" psql -h ${process.env.DB_HOST} -U ${process.env.DB_USER} -d ${process.env.DB_NAME} < ${backupPath}`;
    
    await execAsync(command);
    console.log(`🔄 Backup restaurado exitosamente desde: ${backupPath}`);
    
    return true;
  } catch (error) {
    console.error('❌ Error al restaurar backup:', error);
    return false;
  }
}

// Eventos de conexión
sequelize.addHook('beforeConnect', async (config) => {
  console.log('🔌 Intentando conectar a la base de datos...');
});

sequelize.addHook('afterConnect', async (connection) => {
  console.log('✅ Conexión establecida con la base de datos.');
});

// Manejo de errores de conexión
sequelize.addHook('afterDisconnect', async (connection) => {
  console.log('🔌 Conexión a la base de datos perdida.');
});

// Exportar funciones y instancia
module.exports = {
  sequelize,
  testConnection,
  syncModels,
  closeConnection,
  getDatabaseStats,
  createBackup,
  restoreBackup
};
