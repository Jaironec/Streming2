const { sequelize } = require('./src/config/database');
const { Service } = require('./src/models');

async function seedServices() {
  try {
    console.log('🔌 Conectando a la base de datos...');
    await sequelize.authenticate();
    console.log('✅ Conexión establecida con la base de datos.');

    // Verificar si ya existen servicios
    const existingServices = await Service.count();
    if (existingServices > 0) {
      console.log('ℹ️  Ya existen servicios en la base de datos. Saltando...');
      return;
    }

    console.log('🌱 Poblando servicios de streaming...');

    const services = [
      {
        nombre: 'Netflix',
        logo: '🎬',
        descripcion: 'La plataforma de streaming más popular del mundo con contenido original y licenciado',
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
        logo: '🏰',
        descripcion: 'Contenido de Disney, Pixar, Marvel, Star Wars y National Geographic',
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
        logo: '📺',
        descripcion: 'Series y películas premium de HBO, Warner Bros y más',
        precio_base: 14.99,
        max_perfiles: 3,
        descuento_3_meses: 10.00,
        descuento_6_meses: 20.00,
        descuento_12_meses: 35.00,
        descuento_perfil_adicional: 5.00,
        estado: 'activo',
        popular: false
      },
      {
        nombre: 'Amazon Prime',
        logo: '📦',
        descripcion: 'Streaming, envíos gratis y beneficios Prime',
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
        logo: '🎭',
        descripcion: 'Contenido de Paramount, CBS, MTV, Nickelodeon y más',
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
        logo: '🍎',
        descripcion: 'Contenido original de Apple con series y películas exclusivas',
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
      const service = await Service.create(serviceData);
      console.log(`✅ Servicio ${service.nombre} creado con precio base $${service.precio_base}`);
    }

    console.log('\n🎉 Servicios de streaming creados exitosamente!');
    console.log('\n📋 Servicios disponibles:');
    
    const createdServices = await Service.findAll({
      order: [['nombre', 'ASC']]
    });

    createdServices.forEach(service => {
      console.log(`  ${service.logo} ${service.nombre} - $${service.precio_base}/mes`);
      console.log(`    Descuentos: 3m (${service.descuento_3_meses}%), 6m (${service.descuento_6_meses}%), 12m (${service.descuento_12_meses}%)`);
      console.log(`    Máx perfiles: ${service.max_perfiles}, Descuento perfil: ${service.descuento_perfil_adicional}%`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error al poblar servicios:', error);
  } finally {
    console.log('🔌 Cerrando conexión a la base de datos...');
    await sequelize.close();
    console.log('✅ Conexión cerrada.');
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  seedServices();
}

module.exports = seedServices;
