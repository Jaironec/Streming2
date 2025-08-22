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

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verificar que el usuario existe y está activo
    const user = await User.findByPk(decoded.userId);
    if (!user || user.estado !== 'activo') {
      return res.status(401).json({
        error: 'Usuario no válido o inactivo',
        code: 'USER_INVALID'
      });
    }

    // Verificar si el usuario está bloqueado
    if (user.isBlocked()) {
      return res.status(423).json({
        error: 'Cuenta temporalmente bloqueada por múltiples intentos de login',
        code: 'ACCOUNT_LOCKED'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Token inválido',
        code: 'TOKEN_INVALID'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expirado',
        code: 'TOKEN_EXPIRED'
      });
    }

    console.error('Error en autenticación:', error);
    return res.status(500).json({
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

// Middleware para verificar rol de administrador
const requireAdmin = (req, res, next) => {
  if (req.user.rol !== 'admin') {
    return res.status(403).json({
      error: 'Acceso denegado. Se requieren permisos de administrador',
      code: 'ADMIN_REQUIRED'
    });
  }
  next();
};

// Middleware para verificar rol de cliente
const requireClient = (req, res, next) => {
  if (req.user.rol !== 'cliente') {
    return res.status(403).json({
      error: 'Acceso denegado. Se requieren permisos de cliente',
      code: 'CLIENT_REQUIRED'
    });
  }
  next();
};

// Middleware para verificar propiedad del recurso (cliente solo puede acceder a sus propios datos)
const requireOwnership = (resourceType) => {
  return async (req, res, next) => {
    try {
      if (req.user.rol === 'admin') {
        return next(); // Admin puede acceder a todo
      }

      let resource;
      switch (resourceType) {
        case 'order':
          const { Order } = require('../models');
          resource = await Order.findByPk(req.params.orderId || req.params.id);
          break;
        case 'profile':
          const { Profile } = require('../models');
          resource = await Profile.findByPk(req.params.profileId || req.params.id);
          break;
        default:
          return res.status(400).json({
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

      // Verificar que el cliente sea dueño del recurso
      if (resource.user_id !== req.user.id && resource.user_id_asignado !== req.user.id) {
        return res.status(403).json({
          error: 'Acceso denegado. No tienes permisos para este recurso',
          code: 'RESOURCE_ACCESS_DENIED'
        });
      }

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

module.exports = {
  authenticateToken,
  requireAdmin,
  requireClient,
  requireOwnership
};
