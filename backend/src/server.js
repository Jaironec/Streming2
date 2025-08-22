const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { sequelize } = require('./config/database');
// Importar todos los modelos para establecer asociaciones
require('./models/index');

const authRoutes = require('./routes/auth');
const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');
const whatsappRoutes = require('./routes/whatsapp');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { auditLogger, autoAudit } = require('./middleware/auditLogger');

// Importar servicios
const cronService = require('./services/cronService');
const whatsappService = require('./services/whatsappService');

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ===== CONFIGURACIÓN DE SEGURIDAD =====
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// ===== RATE LIMITING INTELIGENTE =====
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // 100 requests por ventana
  message: {
    error: 'Demasiadas solicitudes desde esta IP',
    message: 'Intenta de nuevo más tarde',
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: Math.ceil(parseInt(process.env.RATE_LIMIT_WINDOW_MS) / 1000 / 60)
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
  keyGenerator: (req) => {
    // Usar IP + User-Agent para mejor identificación
    return req.ip + ':' + (req.get('User-Agent') || 'unknown');
  }
});

// Aplicar rate limiting solo a rutas de API
app.use('/api/', limiter);

// ===== CONFIGURACIÓN CORS OPTIMIZADA =====
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.CORS_ORIGIN || 'http://localhost:3000',
      'http://localhost:3000',
      'https://localhost:3000'
    ];
    
    // Permitir requests sin origin (mobile apps, Postman, etc.)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Origen no permitido por CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'X-API-Key',
    'Accept',
    'Origin'
  ],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: 86400 // 24 horas
};

app.use(cors(corsOptions));

// ===== MIDDLEWARE DE PARSING OPTIMIZADO =====
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      res.status(400).json({
        error: 'JSON inválido',
        message: 'El cuerpo de la solicitud no es un JSON válido',
        code: 'INVALID_JSON'
      });
      throw new Error('JSON inválido');
    }
  }
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb',
  parameterLimit: 1000
}));

// ===== COMPRESIÓN INTELIGENTE =====
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// ===== LOGGING ESTRUCTURADO =====
if (NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  // Logging de producción más detallado
  app.use(morgan('combined', {
    skip: (req, res) => res.statusCode < 400,
    stream: {
      write: (message) => {
        console.log(message.trim());
      }
    }
  }));
}

// ===== SISTEMA DE AUDITORÍA =====
// Hacer disponible el auditLogger en la app
app.locals.auditLogger = auditLogger;

// Aplicar auditoría automática a todas las rutas de API
app.use('/api/', autoAudit);

// ===== MIDDLEWARE DE LOGGING PERSONALIZADO =====
app.use((req, res, next) => {
  req.startTime = Date.now();
  
  // Log de inicio de request
  if (NODE_ENV === 'development') {
    console.log(`📥 ${req.method} ${req.path} - ${new Date().toISOString()}`);
  }
  
  // Log de fin de request
  res.on('finish', () => {
    const duration = Date.now() - req.startTime;
    const status = res.statusCode;
    const method = req.method;
    const path = req.path;
    
    if (NODE_ENV === 'development') {
      const statusColor = status >= 400 ? '🔴' : status >= 300 ? '🟡' : '🟢';
      console.log(`${statusColor} ${method} ${path} - ${status} (${duration}ms)`);
    }
    
    // Log de errores en producción
    if (NODE_ENV === 'production' && status >= 400) {
      console.error(`❌ ${method} ${path} - ${status} (${duration}ms) - ${req.ip}`);
    }
  });
  
  next();
});

// ===== ENDPOINT DE SALUD MEJORADO =====
app.get('/health', async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Verificar conexión de base de datos
    const dbStatus = await sequelize.authenticate()
      .then(() => 'Connected')
      .catch(() => 'Disconnected');
    
    // Verificar servicios
    const whatsappStatus = whatsappService.isConnected ? 'Connected' : 'Disconnected';
    const cronStatus = 'Active';
    
    // Obtener estadísticas de auditoría
    const auditStats = auditLogger.getAuditStats();
    
    const responseTime = Date.now() - startTime;
    
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      services: {
        database: dbStatus,
        whatsapp: whatsappStatus,
        cron: cronStatus,
        audit: 'Active'
      },
      performance: {
        responseTime: `${responseTime}ms`,
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version
      },
      audit: {
        queueSize: auditStats.queueSize,
        isProcessing: auditStats.isProcessing,
        batchSize: auditStats.batchSize
      },
      endpoints: {
        auth: '/api/auth',
        orders: '/api/orders',
        admin: '/api/admin',
        whatsapp: '/api/whatsapp'
      }
    });
  } catch (error) {
    res.status(200).json({
      status: 'DEGRADED',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: NODE_ENV,
      error: error.message,
      services: {
        database: 'Unknown',
        whatsapp: 'Unknown',
        cron: 'Unknown',
        audit: 'Unknown'
      }
    });
  }
});

// ===== RUTAS DE LA API =====
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/whatsapp', whatsappRoutes);

// ===== MANEJADOR 404 =====
app.use('*', notFoundHandler);

// ===== MANEJADOR DE ERRORES =====
app.use(errorHandler);

// ===== INICIALIZACIÓN DEL SERVIDOR =====
async function startServer() {
  try {
    console.log('🚀 Iniciando servidor de Streaming System...');
    console.log(`🌍 Entorno: ${NODE_ENV}`);
    console.log(`🔧 Puerto: ${PORT}`);
    
    // ===== VERIFICAR CONEXIÓN DE BASE DE DATOS =====
    await sequelize.authenticate();
    console.log('✅ Conexión a la base de datos establecida exitosamente.');
    
    // ===== SINCRONIZAR MODELOS EN DESARROLLO =====
    if (NODE_ENV === 'development') {
      try {
        // Usar force: true para recrear las tablas desde cero
        await sequelize.sync({ force: true });
        console.log('✅ Modelos de base de datos sincronizados (force: true).');
        console.log('📊 Tablas disponibles: users, orders, payments, accounts, profiles, services');
      } catch (syncError) {
        console.warn('⚠️  Error en sync, intentando con alter: false:', syncError.message);
        try {
          await sequelize.sync({ alter: false });
          console.log('✅ Modelos de base de datos sincronizados (alter: false).');
        } catch (finalError) {
          console.error('❌ Error crítico en sincronización:', finalError.message);
          throw finalError;
        }
      }
    }
    
    // ===== INICIALIZAR SERVICIO DE WHATSAPP =====
    let whatsappStatus = 'Not Available';
    try {
      await whatsappService.initialize();
      whatsappStatus = 'Initialized';
      console.log('✅ Servicio de WhatsApp inicializado.');
    } catch (error) {
      console.warn('⚠️  No se pudo inicializar WhatsApp:', error.message);
      console.log('ℹ️  El servidor continuará sin WhatsApp. Puedes configurarlo más tarde.');
    }
    
    // ===== CONFIGURAR TAREAS PROGRAMADAS =====
    let cronStatus = 'Not Available';
    try {
      cronService.setupCronJobs();
      cronStatus = 'Active';
      console.log('✅ Tareas programadas configuradas.');
    } catch (error) {
      console.warn('⚠️  No se pudieron configurar las tareas programadas:', error.message);
      console.log('ℹ️  El servidor continuará sin tareas automáticas.');
    }
    
    // ===== INICIALIZAR SISTEMA DE AUDITORÍA =====
    console.log('✅ Sistema de auditoría inicializado.');
    auditLogger.logSystemAction('STARTUP', {
      port: PORT,
      environment: NODE_ENV,
      timestamp: new Date().toISOString()
    });
    
    // ===== INICIAR SERVIDOR =====
    const server = app.listen(PORT, () => {
      console.log('\n🎉 ¡SERVIDOR INICIADO EXITOSAMENTE!');
      console.log('=' .repeat(50));
      console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`);
      console.log(`📱 Frontend: http://localhost:3000`);
      console.log(`🔧 Backend API: http://localhost:${PORT}/api`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
      console.log(`💾 Base de datos: PostgreSQL conectada`);
      console.log(`🤖 WhatsApp: ${whatsappStatus}`);
      console.log(`⏰ Cron Jobs: ${cronStatus}`);
      console.log(`📊 Auditoría: Activa`);
      console.log('=' .repeat(50));
      console.log(`⏰ Iniciado: ${new Date().toLocaleString()}`);
      console.log(`🌍 Entorno: ${NODE_ENV}`);
      console.log(`🔒 Modo: ${NODE_ENV === 'production' ? 'Producción' : 'Desarrollo'}`);
    });
    
    // ===== CONFIGURAR TIMEOUTS DEL SERVIDOR =====
    server.timeout = 30000; // 30 segundos
    server.keepAliveTimeout = 65000; // 65 segundos
    server.headersTimeout = 66000; // 66 segundos
    
  } catch (error) {
    console.error('❌ Error crítico al iniciar el servidor:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// ===== VERIFICACIÓN PERIÓDICA DE CONEXIÓN =====
async function checkDatabaseConnection() {
  try {
    await sequelize.authenticate();
    return true;
  } catch (error) {
    console.error('❌ Error de conexión a la base de datos:', error.message);
    return false;
  }
}

// Verificar conexión cada 30 segundos
setInterval(async () => {
  const isConnected = await checkDatabaseConnection();
  if (!isConnected) {
    console.log('🔄 Reintentando conexión a la base de datos...');
    try {
      await sequelize.authenticate();
      console.log('✅ Conexión a la base de datos restaurada.');
    } catch (error) {
      console.error('❌ No se pudo restaurar la conexión:', error.message);
    }
  }
}, 30000);

// ===== MANEJO GRACIOSO DE CIERRE =====
async function gracefulShutdown(signal) {
  console.log(`\n🛑 Recibida señal ${signal}, cerrando servidor...`);
  
  try {
    // Registrar cierre del sistema
    auditLogger.logSystemAction('SHUTDOWN', {
      signal,
      timestamp: new Date().toISOString()
    });
    
    // Cerrar conexión de base de datos
    await sequelize.close();
    console.log('✅ Conexión a la base de datos cerrada correctamente.');
    
    // Cerrar servicios
    if (whatsappService && typeof whatsappService.close === 'function') {
      await whatsappService.close();
      console.log('✅ Servicio de WhatsApp cerrado.');
    }
    
    // Cerrar sistema de auditoría
    await auditLogger.forceProcess();
    console.log('✅ Sistema de auditoría cerrado.');
    
    console.log('✅ Servidor cerrado correctamente.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error durante el cierre:', error.message);
    process.exit(1);
  }
}

// Capturar señales de cierre
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ===== MANEJO DE ERRORES NO CAPTURADOS =====
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  
  // Registrar error en auditoría
  auditLogger.logSystemAction('ERROR', {
    type: 'unhandledRejection',
    reason: reason?.message || reason,
    timestamp: new Date().toISOString()
  });
  
  // No salir del proceso, solo log del error
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  console.error('Stack trace:', error.stack);
  
  // Registrar error en auditoría
  auditLogger.logSystemAction('ERROR', {
    type: 'uncaughtException',
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });
  
  // Solo salir si es un error crítico
  if (error.message && (
    error.message.includes('database') || 
    error.message.includes('connection') ||
    error.message.includes('EADDRINUSE')
  )) {
    console.error('❌ Error crítico detectado, cerrando servidor...');
    process.exit(1);
  }
});

// ===== INICIAR SERVIDOR =====
startServer();
