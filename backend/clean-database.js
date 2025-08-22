const { sequelize } = require('./src/config/database');

async function cleanDatabase() {
  try {
    console.log('🧹 Iniciando limpieza de base de datos...');
    
    // Conectar a la base de datos
    await sequelize.authenticate();
    console.log('✅ Conexión establecida con la base de datos.');
    
    // Eliminar todas las tablas en orden correcto (por las foreign keys)
    console.log('🗑️ Eliminando tablas...');
    
    // Desactivar verificación de foreign keys temporalmente
    await sequelize.query('SET session_replication_role = replica;');
    
    // Eliminar tablas en orden
    const tables = [
      'profiles',
      'payments', 
      'orders',
      'accounts',
      'users',
      'services'
    ];
    
    for (const table of tables) {
      try {
        await sequelize.query(`DROP TABLE IF EXISTS "${table}" CASCADE;`);
        console.log(`✅ Tabla ${table} eliminada`);
      } catch (error) {
        console.log(`ℹ️ Tabla ${table} no existía o ya fue eliminada`);
      }
    }
    
    // Reactivar verificación de foreign keys
    await sequelize.query('SET session_replication_role = DEFAULT;');
    
    console.log('\n🎉 Base de datos limpiada exitosamente!');
    console.log('💡 Ahora puedes ejecutar seed-services.js y seed-database.js en orden');
    
  } catch (error) {
    console.error('❌ Error al limpiar la base de datos:', error);
  } finally {
    await sequelize.close();
    console.log('🔌 Conexión a la base de datos cerrada.');
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  cleanDatabase();
}

module.exports = cleanDatabase;
