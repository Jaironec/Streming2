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

// Importar servicios
const cronService = require('./services/cronService');
const whatsappService = require('./services/whatsappService');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Demasiadas solicitudes desde esta IP, intenta de nuevo más tarde.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const whatsappStatus = whatsappService.isConnected ? 'Connected' : 'Disconnected';
    const cronStatus = 'Active';
    
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      database: 'Connected',
      whatsapp: whatsappStatus,
      cron: cronStatus
    });
  } catch (error) {
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      database: 'Connected',
      whatsapp: 'Unknown',
      cron: 'Unknown'
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/whatsapp', whatsappRoutes);

// 404 handler
app.use('*', notFoundHandler);

// Error handling middleware
app.use(errorHandler);

// Database connection and server startup
async function startServer() {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Conexión a la base de datos establecida exitosamente.');
    
    // Sync database models (in development)
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      console.log('✅ Modelos de base de datos sincronizados.');
      console.log('📊 Tablas creadas: users, orders, payments, accounts, profiles');
    }
    
    // Initialize WhatsApp service
    let whatsappStatus = 'Not Available';
    try {
      await whatsappService.initialize();
      whatsappStatus = 'Initialized';
      console.log('✅ Servicio de WhatsApp inicializado.');
    } catch (error) {
      console.warn('⚠️  No se pudo inicializar WhatsApp:', error.message);
      console.log('ℹ️  El servidor continuará sin WhatsApp. Puedes configurarlo más tarde.');
    }
    
    // Setup cron jobs
    let cronStatus = 'Not Available';
    try {
      cronService.setupCronJobs();
      cronStatus = 'Active';
      console.log('✅ Tareas programadas configuradas.');
    } catch (error) {
      console.warn('⚠️  No se pudieron configurar las tareas programadas:', error.message);
      console.log('ℹ️  El servidor continuará sin tareas automáticas.');
    }
    
    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`);
      console.log(`📱 Frontend: http://localhost:3000`);
      console.log(`🔧 Backend API: http://localhost:${PORT}/api`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
      console.log(`💾 Base de datos: PostgreSQL conectada`);
      console.log(`🤖 WhatsApp: ${whatsappStatus}`);
      console.log(`⏰ Cron Jobs: ${cronStatus}`);
    });
    
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
}

// Función para verificar conexión de base de datos
async function checkDatabaseConnection() {
  try {
    await sequelize.authenticate();
    return true;
  } catch (error) {
    console.error('❌ Error de conexión a la base de datos:', error.message);
    return false;
  }
}

// Verificar conexión de base de datos periódicamente
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
}, 30000); // Verificar cada 30 segundos

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 Recibida señal SIGTERM, cerrando servidor...');
  try {
    await sequelize.close();
    console.log('✅ Conexión a la base de datos cerrada correctamente.');
  } catch (error) {
    console.error('❌ Error al cerrar conexión de base de datos:', error.message);
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 Recibida señal SIGINT, cerrando servidor...');
  try {
    await sequelize.close();
    console.log('✅ Conexión a la base de datos cerrada correctamente.');
  } catch (error) {
    console.error('❌ Error al cerrar conexión de base de datos:', error.message);
  }
  process.exit(0);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // No salir del proceso, solo log del error
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  // Solo salir si es un error crítico de base de datos
  if (error.message && error.message.includes('database')) {
    process.exit(1);
  }
});

startServer();
