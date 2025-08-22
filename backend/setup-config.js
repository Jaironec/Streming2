#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🚀 CONFIGURACIÓN AUTOMÁTICA - Streaming System');
console.log('================================================\n');

async function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setupConfiguration() {
  try {
    console.log('📋 PASO 1: VERIFICAR POSTGRESQL');
    console.log('Asegúrate de que PostgreSQL esté instalado y ejecutándose.\n');
    
    const postgresRunning = await question('¿PostgreSQL está ejecutándose? (s/n): ');
    if (postgresRunning.toLowerCase() !== 's') {
      console.log('\n❌ Por favor instala y ejecuta PostgreSQL primero.');
      console.log('📖 Guía: https://www.postgresql.org/download/\n');
      return;
    }

    console.log('\n📋 PASO 2: CONFIGURACIÓN DE BASE DE DATOS');
    const dbHost = await question('Host de PostgreSQL (default: localhost): ') || 'localhost';
    const dbPort = await question('Puerto de PostgreSQL (default: 5432): ') || '5432';
    const dbName = await question('Nombre de la base de datos (default: streaming_system): ') || 'streaming_system';
    const dbUser = await question('Usuario de PostgreSQL (default: postgres): ') || 'postgres';
    const dbPassword = await question('Contraseña de PostgreSQL: ');

    if (!dbPassword) {
      console.log('\n❌ La contraseña de PostgreSQL es obligatoria.');
      return;
    }

    console.log('\n📋 PASO 3: GENERAR CLAVE SECRETA JWT');
    const jwtSecret = crypto.randomBytes(32).toString('hex');
    console.log(`✅ Clave JWT generada: ${jwtSecret}`);

    console.log('\n📋 PASO 4: CONFIGURACIÓN DE CARPETAS');
    const uploadPath = await question('Carpeta para uploads (default: ./uploads): ') || './uploads';
    const whatsappPath = await question('Carpeta para sesiones WhatsApp (default: ./whatsapp-sessions): ') || './whatsapp-sessions';

    console.log('\n📋 PASO 5: CONFIGURACIÓN DE WHATSAPP');
    const whatsappEnabled = await question('¿Habilitar integración WhatsApp? (s/n, default: s): ') || 's';

    console.log('\n📋 PASO 6: CONFIGURACIÓN DE OCR');
    const ocrConfidence = await question('Umbral de confianza OCR (0.0-1.0, default: 0.6): ') || '0.6';
    const ocrRetries = await question('Máximo de reintentos OCR (default: 3): ') || '3';

    console.log('\n📋 PASO 7: CONFIGURACIÓN DE SEGURIDAD');
    const corsOrigin = await question('Origen CORS (default: http://localhost:3000): ') || 'http://localhost:3000';
    const bcryptRounds = await question('Rondas de encriptación (default: 12): ') || '12';

    // Crear contenido del archivo .env
    const envContent = `# ========================================
# CONFIGURACIÓN OBLIGATORIA DEL SISTEMA
# ========================================

# Server Configuration
PORT=3001
NODE_ENV=development

# ========================================
# BASE DE DATOS - POSTGRESQL (OBLIGATORIO)
# ========================================
DB_HOST=${dbHost}
DB_PORT=${dbPort}
DB_NAME=${dbName}
DB_USER=${dbUser}
DB_PASSWORD=${dbPassword}

# ========================================
# AUTENTICACIÓN JWT (OBLIGATORIO)
# ========================================
JWT_SECRET=${jwtSecret}
JWT_EXPIRES_IN=7d

# ========================================
# CONFIGURACIÓN DE ARCHIVOS (OBLIGATORIO)
# ========================================
UPLOAD_PATH=${uploadPath}
MAX_FILE_SIZE=10485760

# ========================================
# WHATSAPP - VENOM BOT (OBLIGATORIO)
# ========================================
WHATSAPP_SESSION_PATH=${whatsappPath}

# ========================================
# OCR - TESSERACT (OBLIGATORIO)
# ========================================
TESSERACT_LANG=spa+eng
OCR_CONFIDENCE_THRESHOLD=${ocrConfidence}
OCR_MAX_RETRIES=${ocrRetries}
OCR_TIMEOUT=30000
AMOUNT_TOLERANCE=0.01

# ========================================
# RATE LIMITING (OBLIGATORIO)
# ========================================
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# ========================================
# SEGURIDAD (OBLIGATORIO)
# ========================================
BCRYPT_ROUNDS=${bcryptRounds}
CORS_ORIGIN=${corsOrigin}

# ========================================
# LOGGING (OPCIONAL)
# ========================================
LOG_LEVEL=info

# ========================================
# LÓGICA DE NEGOCIO (OPCIONAL)
# ========================================
VIP_ORDERS_THRESHOLD=10
VIP_SPENDING_THRESHOLD=1000
RENEWAL_REMINDER_DAYS=3
PROFILE_EXPIRATION_CHECK_INTERVAL=3600000
`;

    // Crear archivo .env
    const envPath = path.join(__dirname, '.env');
    fs.writeFileSync(envPath, envContent);
    console.log('\n✅ Archivo .env creado exitosamente');

    // Crear carpetas necesarias
    const folders = [
      uploadPath.replace('./', ''),
      whatsappPath.replace('./', ''),
      'logs'
    ];

    console.log('\n📁 Creando carpetas necesarias...');
    for (const folder of folders) {
      const folderPath = path.join(__dirname, folder);
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
        console.log(`✅ Carpeta creada: ${folder}`);
      } else {
        console.log(`ℹ️  Carpeta ya existe: ${folder}`);
      }
    }

    console.log('\n📋 PASO 8: INSTALAR DEPENDENCIAS');
    console.log('Ejecutando npm install...');
    
    const { execSync } = require('child_process');
    try {
      execSync('npm install', { stdio: 'inherit' });
      console.log('✅ Dependencias instaladas exitosamente');
    } catch (error) {
      console.log('❌ Error al instalar dependencias. Ejecuta manualmente: npm install');
    }

    console.log('\n📋 PASO 9: CONFIGURAR BASE DE DATOS');
    console.log('Ejecutando npm run setup...');
    
    try {
      execSync('npm run setup', { stdio: 'inherit' });
      console.log('✅ Base de datos configurada exitosamente');
    } catch (error) {
      console.log('❌ Error al configurar base de datos. Ejecuta manualmente: npm run setup');
    }

    console.log('\n🎉 ¡CONFIGURACIÓN COMPLETADA!');
    console.log('================================');
    console.log('\n📋 RESUMEN DE CONFIGURACIÓN:');
    console.log(`   • Base de datos: ${dbHost}:${dbPort}/${dbName}`);
    console.log(`   • Usuario: ${dbUser}`);
    console.log(`   • JWT Secret: ${jwtSecret.substring(0, 16)}...`);
    console.log(`   • Uploads: ${uploadPath}`);
    console.log(`   • WhatsApp: ${whatsappPath}`);
    console.log(`   • OCR Confianza: ${ocrConfidence}`);
    console.log(`   • CORS Origin: ${corsOrigin}`);

    console.log('\n🚀 PRÓXIMOS PASOS:');
    console.log('1. Verificar configuración: npm run verify');
    console.log('2. Iniciar servidor: npm run dev');
    console.log('3. Probar API: http://localhost:3001/health');

    console.log('\n🔐 CREDENCIALES DE PRUEBA:');
    console.log('   • Admin: admin@streamingpro.com / admin123');
    console.log('   • Cliente: test@example.com / test123');

    console.log('\n📖 DOCUMENTACIÓN: CONFIGURACION-COMPLETA.md');

  } catch (error) {
    console.error('\n❌ Error durante la configuración:', error.message);
  } finally {
    rl.close();
  }
}

// Ejecutar configuración
setupConfiguration();
