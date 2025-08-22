const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Errores de validación de Sequelize
  if (err.name === 'SequelizeValidationError') {
    const errors = err.errors.map(error => ({
      field: error.path,
      message: error.message,
      value: error.value
    }));

    return res.status(400).json({
      error: 'Error de validación',
      details: errors,
      code: 'VALIDATION_ERROR'
    });
  }

  // Errores de restricción única de Sequelize
  if (err.name === 'SequelizeUniqueConstraintError') {
    const errors = err.errors.map(error => ({
      field: error.path,
      message: `El ${error.path} ya existe`,
      value: error.value
    }));

    return res.status(409).json({
      error: 'Conflicto de datos',
      details: errors,
      code: 'DUPLICATE_ERROR'
    });
  }

  // Errores de restricción de clave foránea
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({
      error: 'Referencia inválida',
      message: 'El recurso referenciado no existe',
      code: 'FOREIGN_KEY_ERROR'
    });
  }

  // Errores de archivo (Multer)
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      error: 'Archivo demasiado grande',
      message: 'El archivo excede el tamaño máximo permitido',
      code: 'FILE_TOO_LARGE'
    });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      error: 'Campo de archivo inesperado',
      message: 'El nombre del campo de archivo no es válido',
      code: 'INVALID_FILE_FIELD'
    });
  }

  // Errores de OCR
  if (err.name === 'OCR_ERROR') {
    return res.status(422).json({
      error: 'Error en procesamiento OCR',
      message: err.message,
      code: 'OCR_PROCESSING_ERROR'
    });
  }

  // Errores de WhatsApp
  if (err.name === 'WHATSAPP_ERROR') {
    return res.status(503).json({
      error: 'Error en servicio de WhatsApp',
      message: err.message,
      code: 'WHATSAPP_SERVICE_ERROR'
    });
  }

  // Errores de autenticación
  if (err.name === 'AUTHENTICATION_ERROR') {
    return res.status(401).json({
      error: 'Error de autenticación',
      message: err.message,
      code: 'AUTH_ERROR'
    });
  }

  // Errores de autorización
  if (err.name === 'AUTHORIZATION_ERROR') {
    return res.status(403).json({
      error: 'Error de autorización',
      message: err.message,
      code: 'PERMISSION_ERROR'
    });
  }

  // Errores de base de datos
  if (err.name === 'DATABASE_ERROR') {
    return res.status(500).json({
      error: 'Error de base de datos',
      message: 'Error interno en la base de datos',
      code: 'DB_ERROR'
    });
  }

  // Error por defecto
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Error interno del servidor';

  res.status(statusCode).json({
    error: 'Error del servidor',
    message: process.env.NODE_ENV === 'production' ? 'Error interno del servidor' : message,
    code: 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// Middleware para manejar rutas no encontradas
const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: 'Endpoint no encontrado',
    message: `La ruta ${req.originalUrl} no existe`,
    code: 'ENDPOINT_NOT_FOUND',
    method: req.method,
    availableEndpoints: [
      '/api/auth/login',
      '/api/auth/register',
      '/api/orders',
      '/api/admin/orders',
      '/api/whatsapp/status'
    ]
  });
};

module.exports = {
  errorHandler,
  notFoundHandler
};
