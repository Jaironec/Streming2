const { sequelize } = require('./src/config/database');
const { User, Order, Payment, Account, Profile, Service } = require('./src/models');

async function setupDatabase() {
  try {
    console.log('🚀 Iniciando configuración completa de la base de datos...');
    
    // Conectar a la base de datos
    await sequelize.authenticate();
    console.log('✅ Conexión establecida con la base de datos.');
    
    // Sincronizar todos los modelos (crear tablas)
    console.log('🔧 Sincronizando modelos...');
    await sequelize.sync({ force: true }); // force: true elimina y recrea todas las tablas
    console.log('✅ Tablas creadas exitosamente.');
    
    // Crear servicios de streaming
    console.log('🌱 Creando servicios de streaming...');
    const services = [
      {
        nombre: 'Netflix',
        logo: 'netflix',
        descripcion: 'La plataforma de streaming más popular del mundo',
        precio_base: 15.99,
        max_perfiles: 4,
        descuento_3_meses: 10.00,
        descuento_6_meses: 20.00,
        descuento_12_meses: 35.00,
        descuento_perfil_adicional: 5.00,
        estado: 'activo',
        popular: true
      },
      {
        nombre: 'Disney+',
        logo: 'disney',
        descripcion: 'Contenido familiar de Disney, Pixar, Marvel y Star Wars',
        precio_base: 12.99,
        max_perfiles: 4,
        descuento_3_meses: 10.00,
        descuento_6_meses: 20.00,
        descuento_12_meses: 35.00,
        descuento_perfil_adicional: 5.00,
        estado: 'activo',
        popular: true
      },
      {
        nombre: 'HBO Max',
        logo: 'hbo',
        descripcion: 'Series y películas premium de HBO y Warner Bros',
        precio_base: 14.99,
        max_perfiles: 3,
        descuento_3_meses: 10.00,
        descuento_6_meses: 20.00,
        descuento_12_meses: 35.00,
        descuento_perfil_adicional: 5.00,
        estado: 'activo',
        popular: true
      },
      {
        nombre: 'Amazon Prime',
        logo: 'prime',
        descripcion: 'Streaming, envíos gratis y beneficios de Amazon',
        precio_base: 13.99,
        max_perfiles: 3,
        descuento_3_meses: 10.00,
        descuento_6_meses: 20.00,
        descuento_12_meses: 35.00,
        descuento_perfil_adicional: 5.00,
        estado: 'activo',
        popular: false
      },
      {
        nombre: 'Paramount+',
        logo: 'paramount',
        descripcion: 'Contenido de Paramount, CBS y Nickelodeon',
        precio_base: 11.99,
        max_perfiles: 3,
        descuento_3_meses: 10.00,
        descuento_6_meses: 20.00,
        descuento_12_meses: 35.00,
        descuento_perfil_adicional: 5.00,
        estado: 'activo',
        popular: false
      },
      {
        nombre: 'Apple TV+',
        logo: 'apple',
        descripcion: 'Contenido original de Apple',
        precio_base: 9.99,
        max_perfiles: 6,
        descuento_3_meses: 10.00,
        descuento_6_meses: 20.00,
        descuento_12_meses: 35.00,
        descuento_perfil_adicional: 5.00,
        estado: 'activo',
        popular: false
      }
    ];
    
    for (const serviceData of services) {
      await Service.create(serviceData);
      console.log(`✅ Servicio ${serviceData.nombre} creado con precio base $${serviceData.precio_base}`);
    }
    
    // Crear usuario admin
    console.log('👨‍💼 Creando usuario administrador...');
    const adminUser = await User.create({
      nombre: 'Administrador',
      email: 'admin@streamingpro.com',
      whatsapp: '+593964092002',
      password: 'admin123',
      rol: 'admin',
      estado: 'activo'
    });
    console.log('✅ Usuario admin creado:', adminUser.email);
    
    // Crear usuario de prueba
    console.log('👤 Creando usuario de prueba...');
    const testUser = await User.create({
      nombre: 'Usuario Test',
      email: 'test@example.com',
      whatsapp: '+593964092003',
      password: 'test123',
      rol: 'cliente',
      estado: 'activo'
    });
    console.log('✅ Usuario de prueba creado:', testUser.email);
    
    // Crear cuentas de streaming
    console.log('📺 Creando cuentas de streaming...');
    for (const service of services) {
      for (let i = 1; i <= 3; i++) {
        const account = await Account.create({
          servicio: service.nombre,
          email: `${service.nombre.toLowerCase().replace(/\s+/g, '')}${i}@streamingpro.com`,
          password: `password${i}`,
          estado: 'activo',
          perfiles_disponibles: service.max_perfiles,
          notas_admin: `Cuenta ${i} de ${service.nombre}`
        });

        // Crear perfiles para cada cuenta
        for (let j = 1; j <= service.max_perfiles; j++) {
          await Profile.create({
            account_id: account.id,
            nombre_perfil: `Perfil ${j}`,
            estado: 'libre'
          });
        }

        console.log(`✅ Cuenta ${service.nombre} ${i} creada con ${service.max_perfiles} perfiles`);
      }
    }
    
    console.log('\n🎉 Configuración de base de datos completada exitosamente!');
    console.log('\n📋 Credenciales de acceso:');
    console.log('👨‍💼 Admin: admin@streamingpro.com / admin123');
    console.log('👤 Usuario: test@example.com / test123');
    console.log('\n🔑 Todas las cuentas de streaming tienen contraseña: password1, password2, password3');
    console.log('\n💡 Ahora puedes ejecutar: npm run dev');
    
  } catch (error) {
    console.error('❌ Error al configurar la base de datos:', error);
    console.error('Detalles del error:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
    console.log('🔌 Conexión a la base de datos cerrada.');
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  setupDatabase();
}

module.exports = setupDatabase;
