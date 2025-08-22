const jwt = require('jsonwebtoken');
const { sequelize } = require('./src/config/database');
const { User } = require('./src/models');

async function verifyToken(token) {
  try {
    console.log('🔍 Verificando token JWT...\n');
    
    if (!token) {
      console.log('❌ No se proporcionó token');
      return;
    }
    
    // Decodificar token sin verificar (para ver el contenido)
    const decodedWithoutVerification = jwt.decode(token);
    console.log('📋 Contenido del token (sin verificar):');
    console.log('   - userId:', decodedWithoutVerification?.userId);
    console.log('   - email:', decodedWithoutVerification?.email);
    console.log('   - rol:', decodedWithoutVerification?.rol);
    console.log('   - iat:', decodedWithoutVerification?.iat);
    console.log('   - exp:', decodedWithoutVerification?.exp);
    
    // Verificar si el token ha expirado
    const now = Math.floor(Date.now() / 1000);
    if (decodedWithoutVerification?.exp && decodedWithoutVerification.exp < now) {
      console.log('❌ Token expirado');
      console.log('   - Tiempo actual:', now);
      console.log('   - Tiempo de expiración:', decodedWithoutVerification.exp);
      console.log('   - Diferencia:', now - decodedWithoutVerification.exp, 'segundos');
      return;
    }
    
    // Verificar token con la clave secreta
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('✅ Token verificado correctamente');
      console.log('   - userId:', decoded.userId);
      console.log('   - email:', decoded.email);
      console.log('   - rol:', decoded.rol);
      
      // Verificar si el usuario existe en la base de datos
      console.log('\n🔍 Verificando usuario en la base de datos...');
      await sequelize.authenticate();
      console.log('✅ Conexión a la base de datos establecida');
      
      const user = await User.findByPk(decoded.userId);
      if (user) {
        console.log('✅ Usuario encontrado en la base de datos');
        console.log('   - ID:', user.id);
        console.log('   - Email:', user.email);
        console.log('   - Rol:', user.rol);
        console.log('   - Estado:', user.estado);
        console.log('   - Intentos login:', user.intentos_login);
        console.log('   - Bloqueado hasta:', user.bloqueado_hasta);
        
        // Verificar si está bloqueado
        try {
          const estaBloqueado = user.estaBloqueado();
          console.log('   - ¿Está bloqueado?:', estaBloqueado);
        } catch (error) {
          console.log('   - Error al verificar bloqueo:', error.message);
        }
      } else {
        console.log('❌ Usuario NO encontrado en la base de datos');
        console.log('   - ID buscado:', decoded.userId);
      }
      
    } catch (verifyError) {
      console.log('❌ Error al verificar token:', verifyError.message);
      
      if (verifyError.name === 'JsonWebTokenError') {
        console.log('   - El token es inválido');
      } else if (verifyError.name === 'TokenExpiredError') {
        console.log('   - El token ha expirado');
      }
    }
    
  } catch (error) {
    console.error('❌ Error general:', error.message);
  } finally {
    await sequelize.close();
    console.log('\n🔌 Conexión a la base de datos cerrada');
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  const token = process.argv[2];
  if (!token) {
    console.log('❌ Uso: node verify-token.js <token>');
    console.log('   Ejemplo: node verify-token.js eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
    process.exit(1);
  }
  verifyToken(token);
}

module.exports = verifyToken;
