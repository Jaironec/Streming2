const jwt = require('jsonwebtoken');
const { User } = require('../models');

// Middleware de autenticación principal
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        error: 'Token de acceso requerido',
        code: 'TOKEN_REQUIRED',
        message: 'Debe proporcionar un token de autenticación'
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          error: 'Token inválido',
          code: 'INVALID_TOKEN',
          message: 'El token proporcionado no es válido'
        });
      }

      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Token expirado',
          code: 'TOKEN_EXPIRED',
          message: 'Su sesión ha expirado, inicie sesión nuevamente'
        });
      }

      throw jwtError;
    }

    let user;
    try {
      user = await User.findByPk(decoded.userId);
    } catch (dbError) {
      console.error('Error de base de datos al buscar usuario:', dbError);
      return res.status(500).json({
        error: 'Error interno del servidor',
        code: 'DATABASE_ERROR',
        message: 'No se pudo verificar la autenticación'
      });
    }

    if (!user) {
      return res.status(401).json({
        error: 'Usuario no encontrado',
        code: 'USER_NOT_FOUND',
        message: 'El usuario asociado al token no existe'
      });
    }

    if (user.estado !== 'activo') {
      return res.status(401).json({
        error: 'Usuario suspendido o eliminado',
        code: 'USER_SUSPENDED',
        message: 'Su cuenta ha sido suspendida o eliminada'
      });
    }

    try {
      if (user.isBlocked()) {
        const bloqueadoHasta = user.bloqueado_hasta;
        const tiempoRestante = Math.ceil((bloqueadoHasta - new Date()) / (1000 * 60));
        
        return res.status(401).json({
          error: 'Usuario bloqueado temporalmente',
          message: `Demasiados intentos de login fallidos. Desbloqueado en ${tiempoRestante} minutos`,
          code: 'USER_BLOCKED',
          bloqueadoHasta: bloqueadoHasta.toISOString(),
          tiempoRestante
        });
      }
    } catch (blockError) {
      console.error('Error al verificar bloqueo:', blockError);
      // Continuar si hay error en verificación de bloqueo
    }

    // Agregar información adicional del usuario
    req.user = {
      ...user.toJSON(),
      lastActivity: new Date(),
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent')
    };

    // Actualizar último acceso
    try {
      await user.updateLastAccess(req.ip, req.get('User-Agent'));
    } catch (updateError) {
      console.error('Error al actualizar último acceso:', updateError);
      // No fallar la autenticación por este error
    }

    next();
  } catch (error) {
    console.error('Error en autenticación:', error);
    return res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR',
      message: 'Error durante la autenticación'
    });
  }
};

// Middleware para requerir rol de administrador
const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'No autenticado',
        code: 'NOT_AUTHENTICATED',
        message: 'Debe iniciar sesión para acceder a este recurso'
      });
    }

    if (req.user.rol !== 'admin') {
      return res.status(403).json({
        error: 'Acceso denegado',
        code: 'ACCESS_DENIED',
        message: 'No tiene permisos de administrador para acceder a este recurso'
      });
    }

    next();
  } catch (error) {
    console.error('Error en verificación de admin:', error);
    return res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR',
      message: 'Error al verificar permisos'
    });
  }
};

// Middleware para requerir rol de cliente
const requireClient = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'No autenticado',
        code: 'NOT_AUTHENTICATED',
        message: 'Debe iniciar sesión para acceder a este recurso'
      });
    }

    if (req.user.rol !== 'cliente') {
      return res.status(403).json({
        error: 'Acceso denegado',
        code: 'ACCESS_DENIED',
        message: 'Este recurso solo está disponible para clientes'
      });
    }

    // Verificar si el cliente puede realizar acciones
    if (!req.user.canPlaceOrder()) {
      return res.status(403).json({
        error: 'Cuenta no habilitada',
        code: 'ACCOUNT_DISABLED',
        message: 'Su cuenta no está habilitada para realizar pedidos'
      });
    }

    next();
  } catch (error) {
    console.error('Error en verificación de cliente:', error);
    return res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR',
      message: 'Error al verificar permisos'
    });
  }
};

// Middleware para verificar propiedad del recurso
const requireOwnership = (resourceModel, resourceIdField = 'id') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'No autenticado',
          code: 'NOT_AUTHENTICATED',
          message: 'Debe iniciar sesión para acceder a este recurso'
        });
      }

      const resourceId = req.params[resourceIdField] || req.body[resourceIdField];
      if (!resourceId) {
        return res.status(400).json({
          error: 'ID de recurso requerido',
          code: 'RESOURCE_ID_REQUIRED',
          message: 'Debe proporcionar el ID del recurso'
        });
      }

      const resource = await resourceModel.findByPk(resourceId);
      if (!resource) {
        return res.status(404).json({
          error: 'Recurso no encontrado',
          code: 'RESOURCE_NOT_FOUND',
          message: 'El recurso solicitado no existe'
        });
      }

      // Verificar propiedad (admin puede acceder a todo)
      if (req.user.rol !== 'admin' && resource.user_id !== req.user.id) {
        return res.status(403).json({
          error: 'Acceso denegado',
          code: 'ACCESS_DENIED',
          message: 'No tiene permisos para acceder a este recurso'
        });
      }

      // Agregar el recurso a la request para uso posterior
      req.resource = resource;
      next();
    } catch (error) {
      console.error('Error en verificación de propiedad:', error);
      return res.status(500).json({
        error: 'Error interno del servidor',
        code: 'INTERNAL_ERROR',
        message: 'Error al verificar permisos'
      });
    }
  };
};

// Middleware para verificar capacidad de renovación
const canRenew = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'No autenticado',
        code: 'NOT_AUTHENTICATED',
        message: 'Debe iniciar sesión para acceder a este recurso'
      });
    }

    const orderId = req.params.orderId || req.body.orderId;
    if (!orderId) {
      return res.status(400).json({
        error: 'ID de orden requerido',
        code: 'ORDER_ID_REQUIRED',
        message: 'Debe proporcionar el ID de la orden'
      });
    }

    const { Order } = require('../models');
    const order = await Order.findByPk(orderId);
    
    if (!order) {
      return res.status(404).json({
        error: 'Orden no encontrada',
        code: 'ORDER_NOT_FOUND',
        message: 'La orden solicitada no existe'
      });
    }

    // Verificar propiedad de la orden
    if (req.user.rol !== 'admin' && order.user_id !== req.user.id) {
      return res.status(403).json({
        error: 'Acceso denegado',
        code: 'ACCESS_DENIED',
        message: 'No tiene permisos para acceder a esta orden'
      });
    }

    // Verificar si se puede renovar
    if (!order.canRenew()) {
      return res.status(400).json({
        error: 'Renovación no disponible',
        code: 'RENEWAL_NOT_AVAILABLE',
        message: 'Esta orden no puede ser renovada en este momento'
      });
    }

    req.order = order;
    next();
  } catch (error) {
    console.error('Error en verificación de renovación:', error);
    return res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR',
      message: 'Error al verificar renovación'
    });
  }
};

// Middleware para verificar límites de rate limiting personalizado
const customRateLimit = (maxRequests = 10, windowMs = 60000) => {
  const requests = new Map();
  
  return (req, res, next) => {
    const key = req.user ? req.user.id : req.ip;
    const now = Date.now();
    const windowStart = now - windowMs;
    
    if (!requests.has(key)) {
      requests.set(key, []);
    }
    
    const userRequests = requests.get(key);
    const validRequests = userRequests.filter(timestamp => timestamp > windowStart);
    
    if (validRequests.length >= maxRequests) {
      return res.status(429).json({
        error: 'Demasiadas solicitudes',
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Máximo ${maxRequests} solicitudes por ${windowMs / 1000} segundos`,
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
    
    validRequests.push(now);
    requests.set(key, validRequests);
    
    next();
  };
};

// Middleware para logging de actividad
const activityLogger = (action) => {
  return (req, res, next) => {
    const startTime = Date.now();
    
    // Log al inicio de la request
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - Usuario: ${req.user?.id || 'No autenticado'} - Acción: ${action}`);
    
    // Interceptar la respuesta para logging
    const originalSend = res.send;
    res.send = function(data) {
      const duration = Date.now() - startTime;
      const status = res.statusCode;
      
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - Status: ${status} - Duración: ${duration}ms`);
      
      return originalSend.call(this, data);
    };
    
    next();
  };
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requireClient,
  requireOwnership,
  canRenew,
  customRateLimit,
  activityLogger
};
