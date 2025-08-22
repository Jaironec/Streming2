const { sequelize } = require('./src/config/database');
const { User, Account, Profile } = require('./src/models');

async function seedDatabase() {
  try {
    console.log('🌱 Iniciando población de base de datos...');
    
    // Verificar si el usuario admin ya existe
    let adminUser = await User.findOne({ where: { email: 'admin@streamingpro.com' } });
    if (!adminUser) {
      adminUser = await User.create({
        nombre: 'Administrador',
        email: 'admin@streamingpro.com',
        whatsapp: '0964092002',
        password: 'admin123',
        rol: 'admin',
        estado: 'activo'
      });
      console.log('✅ Usuario admin creado:', adminUser.email);
    } else {
      console.log('ℹ️ Usuario admin ya existe:', adminUser.email);
    }

    // Verificar si el usuario de prueba ya existe
    let testUser = await User.findOne({ where: { email: 'test@example.com' } });
    if (!testUser) {
      testUser = await User.create({
        nombre: 'Usuario Test',
        email: 'test@example.com',
        whatsapp: '0964092002',
        password: 'test123',
        rol: 'cliente',
        estado: 'activo'
      });
      console.log('✅ Usuario de prueba creado:', testUser.email);
    } else {
      console.log('ℹ️ Usuario de prueba ya existe:', testUser.email);
    }

    // Crear cuentas de streaming
    const services = ['Netflix', 'Disney+', 'HBO Max', 'Amazon Prime', 'Paramount+', 'Apple TV+'];
    
    for (const service of services) {
      // Crear múltiples cuentas por servicio
      for (let i = 1; i <= 3; i++) {
        const accountEmail = `${service.toLowerCase().replace(/\s+/g, '')}${i}@streamingpro.com`;
        
        // Verificar si la cuenta ya existe
        let account = await Account.findOne({ where: { email: accountEmail } });
        if (!account) {
          account = await Account.create({
            servicio: service,
            email: accountEmail,
            password: `password${i}`,
            estado: 'activo',
            perfiles_disponibles: 4,
            notas_admin: `Cuenta ${i} de ${service}`
          });

          // Crear perfiles para cada cuenta
          for (let j = 1; j <= 4; j++) {
            await Profile.create({
              account_id: account.id,
              nombre_perfil: `Perfil ${j}`,
              estado: 'libre'
            });
          }

          console.log(`✅ Cuenta ${service} ${i} creada con 4 perfiles`);
        } else {
          console.log(`ℹ️ Cuenta ${service} ${i} ya existe`);
        }
      }
    }

    console.log('\n🎉 Base de datos poblada exitosamente!');
    console.log('\n📋 Credenciales de acceso:');
    console.log('👨‍💼 Admin: admin@streamingpro.com / admin123');
    console.log('👤 Usuario: test@example.com / test123');
    console.log('\n🔑 Todas las cuentas de streaming tienen contraseña: password1, password2, password3');
    
  } catch (error) {
    console.error('❌ Error al poblar la base de datos:', error);
  } finally {
    await sequelize.close();
    console.log('🔌 Conexión a la base de datos cerrada.');
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
