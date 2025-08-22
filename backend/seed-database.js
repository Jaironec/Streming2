const { sequelize } = require('./src/config/database');
const { User, Account, Profile } = require('./src/models');

async function seedDatabase() {
  try {
    console.log('🌱 Iniciando población de base de datos...');
    
    // Crear usuario admin
    const adminUser = await User.create({
      nombre: 'Administrador',
      email: 'admin@streamingpro.com',
      whatsapp: '1234567890',
      password: 'admin123',
      rol: 'admin',
      estado: 'activo'
    });
    console.log('✅ Usuario admin creado:', adminUser.email);

    // Crear usuario de prueba
    const testUser = await User.create({
      nombre: 'Usuario Test',
      email: 'test@example.com',
      whatsapp: '0987654321',
      password: 'test123',
      rol: 'cliente',
      estado: 'activo'
    });
    console.log('✅ Usuario de prueba creado:', testUser.email);

    // Crear cuentas de streaming
    const services = ['Netflix', 'Disney+', 'HBO Max', 'Amazon Prime', 'Paramount+', 'Apple TV+'];
    
    for (const service of services) {
      // Crear múltiples cuentas por servicio
      for (let i = 1; i <= 3; i++) {
        const account = await Account.create({
          servicio: service,
          email: `${service.toLowerCase().replace(/\s+/g, '')}${i}@streamingpro.com`,
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
