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

    // Crear órdenes de prueba para demostrar el flujo
    console.log('📋 Creando órdenes de prueba...');

    // Orden 1: Pendiente de pago
    const order1 = await Order.create({
      user_id: testUser.id,
      servicio: 'Netflix',
      perfiles: 2,
      meses: 3,
      monto: 25.99,
      estado: 'pendiente',
      fecha_creacion: new Date(),
      codigo_orden: 'ORD-TEST-001',
      prioridad: 'normal'
    });

    // Orden 2: Validando (con comprobante subido)
    const order2 = await Order.create({
      user_id: testUser.id,
      servicio: 'Disney+',
      perfiles: 1,
      meses: 6,
      monto: 62.99,
      estado: 'validando',
      fecha_creacion: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 día atrás
      codigo_orden: 'ORD-TEST-002',
      prioridad: 'alta',
      comentarios_admin: 'Comprobante subido, pendiente de revisión'
    });

    // Orden 3: Aprobada
    const order3 = await Order.create({
      user_id: testUser.id,
      servicio: 'HBO Max',
      perfiles: 3,
      meses: 12,
      monto: 119.99,
      estado: 'aprobado',
      fecha_creacion: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 días atrás
      fecha_aprobacion: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 día atrás
      admin_id: adminUser.id,
      codigo_orden: 'ORD-TEST-003',
      prioridad: 'normal',
      comentarios_admin: 'Orden aprobada exitosamente',
      metodo_pago: 'Transferencia bancaria',
      referencia_pago: 'TRX-123456'
    });

    // Calcular fecha de vencimiento para orden aprobada
    order3.fecha_vencimiento = new Date(order3.fecha_aprobacion);
    order3.fecha_vencimiento.setMonth(order3.fecha_vencimiento.getMonth() + order3.meses);
    await order3.save();

    console.log('✅ Órdenes de prueba creadas:');
    console.log(`   - Orden 1: Netflix 2 perfiles, 3 meses - ${order1.estado}`);
    console.log(`   - Orden 2: Disney+ 1 perfil, 6 meses - ${order2.estado}`);
    console.log(`   - Orden 3: HBO Max 3 perfiles, 12 meses - ${order3.estado}`);

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
