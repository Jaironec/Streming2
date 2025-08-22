const { sequelize } = require('./src/config/database');

async function testDatabaseConnection() {
  try {
    console.log('🔌 Probando conexión a la base de datos...');
    
    // Intentar conectar
    await sequelize.authenticate();
    console.log('✅ Conexión exitosa a la base de datos!');
    
    // Obtener información de la base de datos
    const [results] = await sequelize.query('SELECT version()');
    console.log('📊 Versión de PostgreSQL:', results[0].version);
    
    // Cerrar conexión
    await sequelize.close();
    console.log('🔌 Conexión cerrada.');
    
  } catch (error) {
    console.error('❌ Error al conectar a la base de datos:', error.message);
    console.error('Detalles del error:', error);
    
    // Sugerencias de solución
    console.log('\n🔧 Posibles soluciones:');
    console.log('1. Verifica que PostgreSQL esté ejecutándose');
    console.log('2. Verifica las credenciales en el archivo .env');
    console.log('3. Verifica que la base de datos "streaming_system" exista');
    console.log('4. Verifica que el usuario "postgres" tenga permisos');
    
    process.exit(1);
  }
}

// Ejecutar test
testDatabaseConnection();
