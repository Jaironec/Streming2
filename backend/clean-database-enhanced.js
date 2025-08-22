const { Client } = require('pg');
require('dotenv').config();

console.log('🧹 LIMPIEZA MEJORADA DE BASE DE DATOS');
console.log('=' .repeat(50));

// Configuración de conexión
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'streaming_system',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '2514jajaJAJA',
  connectionTimeoutMillis: 30000,
  idleTimeoutMillis: 30000,
  max: 1
};

console.log('📋 Configuración de conexión:');
console.log(`  Host: ${config.host}`);
console.log(`  Puerto: ${config.port}`);
console.log(`  Base de datos: ${config.database}`);
console.log(`  Usuario: ${config.user}`);
console.log(`  Timeout conexión: ${config.connectionTimeoutMillis}ms`);

// Función para limpiar base de datos con reintentos
async function cleanDatabase() {
  let client = null;
  let retries = 3;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`\n🔄 Intento ${attempt}/${retries} de limpieza...`);
      
      // Crear nuevo cliente para cada intento
      client = new Client(config);
      
      // Conectar con timeout
      console.log('🔌 Conectando a la base de datos...');
      await client.connect();
      console.log('✅ Conexión establecida');
      
      // Verificar si la base de datos existe
      console.log('📋 Verificando base de datos...');
      const dbCheck = await client.query(`
        SELECT datname FROM pg_database WHERE datname = $1
      `, [config.database]);
      
      if (dbCheck.rows.length === 0) {
        console.log('❌ La base de datos no existe');
        return false;
      }
      
      // Obtener lista de tablas
      console.log('📊 Obteniendo lista de tablas...');
      const tablesResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `);
      
      if (tablesResult.rows.length === 0) {
        console.log('ℹ️  No hay tablas para eliminar');
        return true;
      }
      
      const tables = tablesResult.rows.map(row => row.table_name);
      console.log(`📋 Tablas encontradas: ${tables.length}`);
      tables.forEach(table => console.log(`   • ${table}`));
      
      // Deshabilitar restricciones de clave foránea temporalmente
      console.log('🔓 Deshabilitando restricciones de clave foránea...');
      await client.query('SET session_replication_role = replica;');
      
      // Eliminar tablas en orden correcto (evitar problemas de dependencias)
      const tableOrder = [
        'payments', 'orders', 'profiles', 'accounts', 'services', 'users'
      ];
      
      for (const tableName of tableOrder) {
        if (tables.includes(tableName)) {
          try {
            console.log(`🗑️  Eliminando tabla: ${tableName}`);
            await client.query(`DROP TABLE IF EXISTS "${tableName}" CASCADE`);
            console.log(`✅ Tabla ${tableName} eliminada`);
          } catch (tableError) {
            console.warn(`⚠️  No se pudo eliminar tabla ${tableName}:`, tableError.message);
          }
        }
      }
      
      // Eliminar cualquier otra tabla restante
      for (const table of tables) {
        if (!tableOrder.includes(table)) {
          try {
            console.log(`🗑️  Eliminando tabla restante: ${table}`);
            await client.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
            console.log(`✅ Tabla ${table} eliminada`);
          } catch (tableError) {
            console.warn(`⚠️  No se pudo eliminar tabla ${table}:`, tableError.message);
          }
        }
      }
      
      // Eliminar tipos ENUM personalizados
      console.log('🧹 Limpiando tipos ENUM...');
      try {
        await client.query(`
          DO $$ 
          DECLARE 
            r RECORD;
          BEGIN
            FOR r IN (SELECT typname FROM pg_type WHERE typtype = 'e') LOOP
              EXECUTE 'DROP TYPE IF EXISTS ' || quote_ident(r.typname) || ' CASCADE';
            END LOOP;
          END $$;
        `);
        console.log('✅ Tipos ENUM eliminados');
      } catch (enumError) {
        console.warn('⚠️  No se pudieron eliminar tipos ENUM:', enumError.message);
      }
      
      // Rehabilitar restricciones
      console.log('🔒 Rehabilitando restricciones...');
      await client.query('SET session_replication_role = DEFAULT;');
      
      // Verificar limpieza
      const finalCheck = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      `);
      
      if (finalCheck.rows.length === 0) {
        console.log('✅ Base de datos limpiada completamente');
        return true;
      } else {
        console.log(`⚠️  Quedaron ${finalCheck.rows.length} tablas`);
        finalCheck.rows.forEach(row => console.log(`   • ${row.table_name}`));
        return false;
      }
      
    } catch (error) {
      console.error(`❌ Error en intento ${attempt}:`, error.message);
      
      if (attempt < retries) {
        console.log(`⏳ Esperando 3 segundos antes del siguiente intento...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
    } finally {
      // Cerrar cliente si existe
      if (client) {
        try {
          await client.end();
          console.log('🔌 Cliente cerrado');
        } catch (closeError) {
          console.warn('⚠️  Error al cerrar cliente:', closeError.message);
        }
      }
    }
  }
  
  console.error('❌ Fallaron todos los intentos de limpieza');
  return false;
}

// Función principal
async function main() {
  try {
    console.log('🚀 Iniciando limpieza de base de datos...');
    
    const success = await cleanDatabase();
    
    if (success) {
      console.log('\n🎉 ¡LIMPIEZA COMPLETADA EXITOSAMENTE!');
      console.log('=' .repeat(50));
      console.log('📋 Próximos pasos:');
      console.log('1. Ejecutar: npm run setup');
      console.log('2. Ejecutar: npm run dev');
    } else {
      console.log('\n❌ La limpieza no se completó completamente');
      console.log('💡 Intenta ejecutar: npm run setup');
    }
    
  } catch (error) {
    console.error('❌ Error crítico en limpieza:', error.message);
    process.exit(1);
  }
}

// Ejecutar limpieza
main();
