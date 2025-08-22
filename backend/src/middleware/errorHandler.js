// Middleware para manejar errores de validación de Sequelize
const handleSequelizeValidationError = (error, req, res, next) => {
  if (error.name === 'SequelizeValidationError') {
    const validationErrors = error.errors.map(err => ({
      field: err.path,
      message: err.message,
      value: err.value
    }));

    return res.status(400).json({
      error: 'Error de validación de datos',
      details: validationErrors,
      code: 'VALIDATION_ERROR'
    });
  }
  next(error);
};

// Middleware para manejar errores de restricción única de Sequelize
const handleSequelizeUniqueConstraintError = (error, req, res, next) => {
  if (error.name === 'SequelizeUniqueConstraintError') {
    const field = error.errors[0]?.path || 'campo';
    const value = error.errors[0]?.value || 'valor';
    
    return res.status(409).json({
      error: 'Conflicto de datos',
      message: `El ${field} '${value}' ya existe en el sistema`,
      code: 'DUPLICATE_ENTRY'
    });
  }
  next(error);
};

// Middleware para manejar errores de restricción de clave foránea
const handleSequelizeForeignKeyConstraintError = (error, req, res, next) => {
  if (error.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({
      error: 'Referencia inválida',
      message: 'No se puede realizar la operación debido a referencias en otras tablas',
      code: 'FOREIGN_KEY_CONSTRAINT_ERROR'
    });
  }
  next(error);
};

// Middleware para manejar errores de base de datos
const handleDatabaseError = (error, req, res, next) => {
  if (error.name === 'SequelizeDatabaseError') {
    console.error('Error de base de datos:', error);
    
    return res.status(500).json({
      error: 'Error de base de datos',
      message: 'Ocurrió un error al procesar la solicitud en la base de datos',
      code: 'DATABASE_ERROR'
    });
  }
  next(error);
};

// Middleware para manejar errores de conexión a la base de datos
const handleConnectionError = (error, req, res, next) => {
  if (error.name === 'SequelizeConnectionError' || 
      error.name === 'SequelizeConnectionTimedOutError' ||
      error.name === 'SequelizeHostNotFoundError' ||
      error.name === 'SequelizeHostNotReachableError') {
    
    console.error('Error de conexión a la base de datos:', error);
    
    return res.status(503).json({
      error: 'Servicio no disponible',
      message: 'No se puede conectar a la base de datos. Intenta de nuevo más tarde.',
      code: 'DATABASE_CONNECTION_ERROR'
    });
  }
  next(error);
};

// Middleware para manejar errores de JWT
const handleJWTError = (error, req, res, next) => {
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Token inválido',
      message: 'El token de autenticación no es válido',
      code: 'INVALID_TOKEN'
    });
  }
  
  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expirado',
      message: 'El token de autenticación ha expirado',
      code: 'TOKEN_EXPIRED'
    });
  }
  
  next(error);
};

// Middleware para manejar errores de archivo
const handleFileError = (error, req, res, next) => {
  if (error.code === 'ENOENT') {
    return res.status(404).json({
      error: 'Archivo no encontrado',
      message: 'El archivo solicitado no existe',
      code: 'FILE_NOT_FOUND'
    });
  }
  
  if (error.code === 'EACCES') {
    return res.status(403).json({
      error: 'Acceso denegado',
      message: 'No tienes permisos para acceder a este archivo',
      code: 'FILE_ACCESS_DENIED'
    });
  }
  
  if (error.code === 'ENOSPC') {
    return res.status(507).json({
      error: 'Espacio insuficiente',
      message: 'No hay suficiente espacio en el servidor',
      code: 'INSUFFICIENT_STORAGE'
    });
  }
  
  next(error);
};

// Middleware para manejar errores de OCR
const handleOCRError = (error, req, res, next) => {
  if (error.message && error.message.includes('OCR')) {
    return res.status(422).json({
      error: 'Error en procesamiento OCR',
      message: 'No se pudo procesar la imagen con OCR',
      code: 'OCR_PROCESSING_ERROR'
    });
  }
  next(error);
};

// Middleware para manejar errores de WhatsApp
const handleWhatsAppError = (error, req, res, next) => {
  if (error.message && error.message.includes('WhatsApp')) {
    return res.status(503).json({
      error: 'Error en servicio de WhatsApp',
      message: 'No se pudo enviar el mensaje por WhatsApp',
      code: 'WHATSAPP_SERVICE_ERROR'
    });
  }
  next(error);
};

// Middleware para manejar errores de validación de entrada
const handleValidationError = (error, req, res, next) => {
  if (error.name === 'ValidationError') {
    const validationErrors = Object.keys(error.errors).map(field => ({
      field,
      message: error.errors[field].message
    }));

    return res.status(400).json({
      error: 'Error de validación',
      details: validationErrors,
      code: 'INPUT_VALIDATION_ERROR'
    });
  }
  next(error);
};

// Middleware para manejar errores de límite de archivo
const handleFileSizeError = (error, req, res, next) => {
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: 'Archivo demasiado grande',
      message: 'El archivo excede el tamaño máximo permitido',
      code: 'FILE_TOO_LARGE'
    });
  }
  
  if (error.code === 'LIMIT_FILE_COUNT') {
    return res.status(413).json({
      error: 'Demasiados archivos',
      message: 'Se excedió el número máximo de archivos permitidos',
      code: 'TOO_MANY_FILES'
    });
  }
  
  next(error);
};

// Middleware para manejar errores de rate limiting
const handleRateLimitError = (error, req, res, next) => {
  if (error.status === 429) {
    return res.status(429).json({
      error: 'Demasiadas solicitudes',
      message: 'Has excedido el límite de solicitudes. Intenta de nuevo más tarde.',
      code: 'RATE_LIMIT_EXCEEDED'
    });
  }
  next(error);
};

// Middleware principal de manejo de errores
const errorHandler = (error, req, res, next) => {
  // Log del error para debugging
  console.error('Error no manejado:', {
    name: error.name,
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Si ya se envió una respuesta, pasar al siguiente middleware
  if (res.headersSent) {
    return next(error);
  }

  // Determinar el código de estado apropiado
  let statusCode = 500;
  let errorMessage = 'Error interno del servidor';
  let errorCode = 'INTERNAL_ERROR';

  // Mapear tipos de error a códigos de estado
  if (error.name === 'SequelizeValidationError') {
    statusCode = 400;
    errorMessage = 'Datos de entrada inválidos';
    errorCode = 'VALIDATION_ERROR';
  } else if (error.name === 'SequelizeUniqueConstraintError') {
    statusCode = 409;
    errorMessage = 'Conflicto de datos';
    errorCode = 'DUPLICATE_ENTRY';
  } else if (error.name === 'SequelizeForeignKeyConstraintError') {
    statusCode = 400;
    errorMessage = 'Referencia inválida';
    errorCode = 'FOREIGN_KEY_CONSTRAINT_ERROR';
  } else if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    statusCode = 401;
    errorMessage = 'Token de autenticación inválido';
    errorCode = 'AUTHENTICATION_ERROR';
  } else if (error.status) {
    statusCode = error.status;
    errorMessage = error.message || errorMessage;
    errorCode = error.code || errorCode;
  }

  // En desarrollo, incluir más detalles del error
  const errorResponse = {
    error: errorMessage,
    code: errorCode,
    timestamp: new Date().toISOString(),
    path: req.url,
    method: req.method
  };

  // Solo en desarrollo incluir stack trace
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = error.stack;
    errorResponse.details = error.message;
  }

  res.status(statusCode).json(errorResponse);
};

// Middleware para manejar rutas no encontradas
const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    message: `La ruta ${req.method} ${req.url} no existe`,
    code: 'ROUTE_NOT_FOUND',
    timestamp: new Date().toISOString(),
    availableRoutes: [
      '/api/auth/*',
      '/api/orders/*',
      '/api/admin/*',
      '/api/whatsapp/*',
      '/health'
    ]
  });
};

// Middleware para manejar errores de sintaxis JSON
const handleJSONSyntaxError = (error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({
      error: 'JSON inválido',
      message: 'El cuerpo de la solicitud contiene JSON malformado',
      code: 'INVALID_JSON'
    });
  }
  next(error);
};

// Middleware para manejar errores de timeout
const handleTimeoutError = (error, req, res, next) => {
  if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKETTIMEDOUT') {
    return res.status(408).json({
      error: 'Tiempo de espera agotado',
      message: 'La solicitud tardó demasiado en procesarse',
      code: 'REQUEST_TIMEOUT'
    });
  }
  next(error);
};

module.exports = {
  errorHandler,
  notFoundHandler,
  handleSequelizeValidationError,
  handleSequelizeUniqueConstraintError,
  handleSequelizeForeignKeyConstraintError,
  handleDatabaseError,
  handleConnectionError,
  handleJWTError,
  handleFileError,
  handleOCRError,
  handleWhatsAppError,
  handleValidationError,
  handleFileSizeError,
  handleRateLimitError,
  handleJSONSyntaxError,
  handleTimeoutError
};
