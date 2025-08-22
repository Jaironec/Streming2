const jwt = require('jsonwebtoken');
const { User } = require('../models');

// Middleware para verificar token JWT
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        error: 'Token de acceso requerido',
        code: 'TOKEN_REQUIRED'
      });
    }

    // Verificar token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          error: 'Token inválido',
          code: 'INVALID_TOKEN'
        });
      }
      
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Token expirado',
          code: 'TOKEN_EXPIRED'
        });
      }
      
      throw jwtError;
    }
    
    // Buscar usuario en la base de datos
    let user;
    try {
      user = await User.findByPk(decoded.userId);
    } catch (dbError) {
      console.error('Error de base de datos al buscar usuario:', dbError);
      return res.status(500).json({
        error: 'Error interno del servidor',
        code: 'DATABASE_ERROR'
      });
    }
    
    if (!user) {
      return res.status(401).json({
        error: 'Usuario no encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    // Verificar si el usuario está activo
    if (user.estado !== 'activo') {
      return res.status(401).json({
        error: 'Usuario suspendido o eliminado',
        code: 'USER_SUSPENDED'
      });
    }

    // Verificar si el usuario está bloqueado
    try {
      if (user.isBlocked()) {
        return res.status(401).json({
          error: 'Usuario bloqueado temporalmente',
          message: 'Demasiados intentos de login fallidos',
          code: 'USER_BLOCKED'
        });
      }
    } catch (blockError) {
      console.error('Error al verificar bloqueo:', blockError);
      // Continuar si hay error en verificación de bloqueo
    }

    // Agregar usuario a la request
    req.user = user;
    next();
  } catch (error) {
    console.error('Error en autenticación:', error);
    return res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

// Middleware para requerir rol de cliente
const requireClient = (req, res, next) => {
  if (req.user.rol !== 'cliente') {
    return res.status(403).json({
      error: 'Acceso denegado',
      message: 'Se requiere rol de cliente',
      code: 'CLIENT_ACCESS_REQUIRED'
    });
  }
  next();
};

// Middleware para requerir rol de admin
const requireAdmin = (req, res, next) => {
  if (req.user.rol !== 'admin') {
    return res.status(403).json({
      error: 'Acceso denegado',
      message: 'Se requiere rol de administrador',
      code: 'ADMIN_ACCESS_REQUIRED'
    });
  }
  next();
};

// Middleware para verificar propiedad del recurso
const requireOwnership = (resourceType) => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params.id;
      let resource;

      switch (resourceType) {
        case 'order':
          resource = await require('../models').Order.findByPk(resourceId);
          if (resource && resource.user_id !== req.user.id && req.user.rol !== 'admin') {
            return res.status(403).json({
              error: 'Acceso denegado',
              message: 'No tienes permisos para acceder a esta orden',
              code: 'ORDER_ACCESS_DENIED'
            });
          }
          break;
        
        case 'payment':
          resource = await require('../models').Payment.findByPk(resourceId);
          if (resource) {
            const order = await require('../models').Order.findByPk(resource.order_id);
            if (order && order.user_id !== req.user.id && req.user.rol !== 'admin') {
              return res.status(403).json({
                error: 'Acceso denegado',
                message: 'No tienes permisos para acceder a este pago',
                code: 'PAYMENT_ACCESS_DENIED'
              });
            }
          }
          break;
        
        case 'profile':
          resource = await require('../models').Profile.findByPk(resourceId);
          if (resource && resource.user_id_asignado !== req.user.id && req.user.rol !== 'admin') {
            return res.status(403).json({
              error: 'Acceso denegado',
              message: 'No tienes permisos para acceder a este perfil',
              code: 'PROFILE_ACCESS_DENIED'
            });
          }
          break;
        
        default:
          return res.status(500).json({
            error: 'Tipo de recurso no válido',
            code: 'INVALID_RESOURCE_TYPE'
          });
      }

      if (!resource) {
        return res.status(404).json({
          error: 'Recurso no encontrado',
          code: 'RESOURCE_NOT_FOUND'
        });
      }

      // Agregar recurso a la request
      req.resource = resource;
      next();
    } catch (error) {
      console.error('Error en verificación de propiedad:', error);
      return res.status(500).json({
        error: 'Error interno del servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  };
};

// Middleware para verificar si el usuario puede renovar
const canRenew = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const order = await require('../models').Order.findByPk(orderId);
    
    if (!order) {
      return res.status(404).json({
        error: 'Orden no encontrada',
        code: 'ORDER_NOT_FOUND'
      });
    }

    if (!order.canRenew()) {
      return res.status(400).json({
        error: 'Renovación no permitida',
        message: 'Solo se pueden renovar órdenes aprobadas que estén próximas a vencer',
        code: 'RENEWAL_NOT_ALLOWED'
      });
    }

    req.order = order;
    next();
  } catch (error) {
    console.error('Error en verificación de renovación:', error);
    return res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

module.exports = {
  authenticateToken,
  requireClient,
  requireAdmin,
  requireOwnership,
  canRenew
};
