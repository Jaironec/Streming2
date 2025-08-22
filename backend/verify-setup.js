const { sequelize } = require('./src/config/database');
const { User, Order, Payment, Account, Profile, Service } = require('./src/models');

async function verifySetup() {
  try {
    console.log('🔍 Verificando configuración del sistema...\n');
    
    // 1. Probar conexión a la base de datos
    console.log('1️⃣ Probando conexión a la base de datos...');
    await sequelize.authenticate();
    console.log('✅ Conexión a la base de datos: OK');
    
    // 2. Verificar que las tablas existan
    console.log('\n2️⃣ Verificando existencia de tablas...');
    const tables = ['users', 'services', 'accounts', 'profiles', 'orders', 'payments'];
    
    for (const table of tables) {
      try {
        const result = await sequelize.query(
          `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '${table}')`,
          { type: sequelize.QueryTypes.SELECT }
        );
        const exists = result[0].exists;
        console.log(`   ${exists ? '✅' : '❌'} Tabla ${table}: ${exists ? 'EXISTE' : 'NO EXISTE'}`);
      } catch (error) {
        console.log(`   ❌ Error verificando tabla ${table}:`, error.message);
      }
    }
    
    // 3. Verificar usuarios
    console.log('\n3️⃣ Verificando usuarios...');
    try {
      const userCount = await User.count();
      console.log(`   📊 Total de usuarios: ${userCount}`);
      
      if (userCount > 0) {
        const adminUser = await User.findOne({ where: { rol: 'admin' } });
        if (adminUser) {
          console.log(`   👨‍💼 Usuario admin: ${adminUser.email} (${adminUser.estado})`);
        }
        
        const testUser = await User.findOne({ where: { rol: 'cliente' } });
        if (testUser) {
          console.log(`   👤 Usuario test: ${testUser.email} (${testUser.estado})`);
        }
      }
    } catch (error) {
      console.log('   ❌ Error verificando usuarios:', error.message);
    }
    
    // 4. Verificar servicios
    console.log('\n4️⃣ Verificando servicios...');
    try {
      const serviceCount = await Service.count();
      console.log(`   📊 Total de servicios: ${serviceCount}`);
      
      if (serviceCount > 0) {
        const services = await Service.findAll({ attributes: ['nombre', 'estado', 'popular'] });
        services.forEach(service => {
          console.log(`   📺 ${service.nombre}: ${service.estado} ${service.popular ? '(Popular)' : ''}`);
        });
      }
    } catch (error) {
      console.log('   ❌ Error verificando servicios:', error.message);
    }
    
    // 5. Verificar cuentas y perfiles
    console.log('\n5️⃣ Verificando cuentas y perfiles...');
    try {
      const accountCount = await Account.count();
      const profileCount = await Profile.count();
      console.log(`   📊 Total de cuentas: ${accountCount}`);
      console.log(`   📊 Total de perfiles: ${profileCount}`);
    } catch (error) {
      console.log('   ❌ Error verificando cuentas/perfiles:', error.message);
    }
    
    // 6. Probar métodos del modelo User
    console.log('\n6️⃣ Probando métodos del modelo User...');
    try {
      const testUser = await User.findOne();
      if (testUser) {
        console.log(`   🧪 Usuario de prueba: ${testUser.email}`);
        
        // Probar métodos
        try {
          const estaBloqueado = testUser.estaBloqueado();
          console.log(`   ✅ estaBloqueado(): ${estaBloqueado}`);
        } catch (error) {
          console.log(`   ❌ estaBloqueado(): ${error.message}`);
        }
        
        try {
          const isBlocked = testUser.isBlocked();
          console.log(`   ✅ isBlocked(): ${isBlocked}`);
        } catch (error) {
          console.log(`   ❌ isBlocked(): ${error.message}`);
        }
        
        try {
          const isValidPassword = await testUser.validatePassword('test123');
          console.log(`   ✅ validatePassword(): ${isValidPassword}`);
        } catch (error) {
          console.log(`   ❌ validatePassword(): ${error.message}`);
        }
      } else {
        console.log('   ⚠️ No hay usuarios para probar métodos');
      }
    } catch (error) {
      console.log('   ❌ Error probando métodos:', error.message);
    }
    
    // 7. Verificar configuración de Sequelize
    console.log('\n7️⃣ Verificando configuración de Sequelize...');
    console.log(`   🔧 Host: ${sequelize.config.host}`);
    console.log(`   🔧 Puerto: ${sequelize.config.port}`);
    console.log(`   🔧 Base de datos: ${sequelize.config.database}`);
    console.log(`   🔧 Usuario: ${sequelize.config.username}`);
    console.log(`   🔧 Dialecto: ${sequelize.config.dialect}`);
    
    // 8. Verificar variables de entorno críticas
    console.log('\n8️⃣ Verificando variables de entorno...');
    const envVars = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'JWT_SECRET'];
    envVars.forEach(envVar => {
      const value = process.env[envVar];
      if (value) {
        console.log(`   ✅ ${envVar}: ${envVar.includes('PASSWORD') ? '***' : value}`);
      } else {
        console.log(`   ❌ ${envVar}: NO CONFIGURADA`);
      }
    });
    
    console.log('\n🎉 Verificación completada!');
    
    // Resumen final
    console.log('\n📋 RESUMEN:');
    console.log('   Si ves ❌ en cualquier sección, ese es un problema que necesita atención.');
    console.log('   Si ves ⚠️, es una advertencia que podría causar problemas.');
    console.log('   Si todo está ✅, el sistema está listo para usar.');
    
    console.log('\n💡 Próximos pasos:');
    console.log('   1. Si todo está OK: npm run dev');
    console.log('   2. Si hay problemas: npm run clean && npm run setup');
    
  } catch (error) {
    console.error('❌ Error durante la verificación:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
    console.log('\n🔌 Conexión a la base de datos cerrada.');
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  verifySetup();
}

module.exports = verifySetup;
