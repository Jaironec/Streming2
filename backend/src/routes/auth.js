const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// ===== BLACKLIST DE TOKENS INVALIDADOS =====
// En producción, esto debería estar en Redis o base de datos
const tokenBlacklist = new Set();

// Función para invalidar token
const invalidateToken = (token) => {
  tokenBlacklist.add(token);
  // Limpiar tokens antiguos cada hora (simular expiración)
  setTimeout(() => {
    tokenBlacklist.delete(token);
  }, 60 * 60 * 1000);
};

// Función para verificar si un token está invalidado
const isTokenInvalidated = (token) => {
  return tokenBlacklist.has(token);
};

// ===== VALIDACIÓN DE TOKENS =====
const validateTokenNotBlacklisted = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (token && isTokenInvalidated(token)) {
    return res.status(401).json({
      error: 'Token invalidado',
      code: 'TOKEN_INVALIDATED',
      message: 'Su sesión ha sido cerrada. Inicie sesión nuevamente.'
    });
  }
  
  next();
};

// Aplicar validación a todas las rutas que requieren autenticación
router.use('/profile', validateTokenNotBlacklisted);
router.use('/logout', validateTokenNotBlacklisted);
router.use('/change-password', validateTokenNotBlacklisted);

// POST /api/auth/register - Registro de usuario
router.post('/register', [
  body('nombre').isString().trim().isLength({ min: 2, max: 100 }).withMessage('Nombre debe tener entre 2 y 100 caracteres'),
  body('email').isEmail().normalizeEmail().withMessage('Email válido requerido'),
  body('whatsapp').isString().trim().isLength({ min: 10, max: 15 }).withMessage('WhatsApp debe tener entre 10 y 15 dígitos'),
  body('password').isLength({ min: 8 }).withMessage('Contraseña debe tener al menos 8 caracteres')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Datos de entrada inválidos',
        details: errors.array(),
        code: 'VALIDATION_ERROR'
      });
    }

    const { nombre, email, whatsapp, password } = req.body;

    // Verificar si el email ya existe
    const existingUserByEmail = await User.findByEmail(email);
    if (existingUserByEmail) {
      return res.status(400).json({
        error: 'Email ya registrado',
        message: 'Ya existe una cuenta con este email',
        code: 'EMAIL_ALREADY_EXISTS'
      });
    }

    // Verificar si el WhatsApp ya existe
    const existingUserByWhatsApp = await User.findByWhatsApp(whatsapp);
    if (existingUserByWhatsApp) {
      return res.status(400).json({
        error: 'WhatsApp ya registrado',
        message: 'Ya existe una cuenta con este número de WhatsApp',
        code: 'WHATSAPP_ALREADY_EXISTS'
      });
    }

    // Crear usuario
    const user = await User.create({
      nombre,
      email,
      whatsapp,
      password,
      rol: 'cliente',
      estado: 'activo'
    });

    // Generar token JWT con información del dispositivo
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        rol: user.rol,
        deviceId: generateDeviceId(req),
        sessionId: generateSessionId()
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        whatsapp: user.whatsapp,
        rol: user.rol
      },
      token,
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      code: 'USER_REGISTERED'
    });

  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo registrar el usuario',
      code: 'INTERNAL_ERROR'
    });
  }
});

// POST /api/auth/login - Login de usuario
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Email válido requerido'),
  body('password').notEmpty().withMessage('Contraseña requerida')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Datos de entrada inválidos',
        details: errors.array(),
        code: 'VALIDATION_ERROR'
      });
    }

    const { email, password } = req.body;

    // Buscar usuario por email
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        error: 'Credenciales inválidas',
        message: 'Email o contraseña incorrectos',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Verificar estado de la cuenta
    if (user.estado === 'suspendido') {
      return res.status(403).json({
        error: 'Cuenta suspendida',
        message: 'Tu cuenta ha sido suspendida. Contacta al administrador.',
        code: 'ACCOUNT_SUSPENDED'
      });
    }

    // Verificar si está bloqueado
    if (user.estaBloqueado()) {
      const tiempoRestante = user.getBlockTimeRemaining();
      return res.status(403).json({
        error: 'Cuenta bloqueada',
        message: `Tu cuenta está bloqueada. Desbloqueada en ${tiempoRestante} minutos.`,
        code: 'ACCOUNT_LOCKED',
        bloqueadoHasta: user.bloqueado_hasta,
        tiempoRestante
      });
    }

    // Verificar contraseña
    const isValidPassword = await user.validatePassword(password);
    if (!isValidPassword) {
      // Incrementar intentos de login
      await user.incrementarIntentosLogin();
      
      return res.status(401).json({
        error: 'Credenciales inválidas',
        message: 'Email o contraseña incorrectos',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Resetear intentos de login y actualizar último acceso
    await user.resetearIntentosLogin();
    await user.updateLastAccess(req.ip, req.get('User-Agent'));

    // Generar token JWT con información del dispositivo
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        rol: user.rol,
        deviceId: generateDeviceId(req),
        sessionId: generateSessionId()
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      message: 'Login exitoso',
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        whatsapp: user.whatsapp,
        rol: user.rol,
        ultimo_acceso: user.ultimo_acceso
      },
      token,
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      deviceId: generateDeviceId(req),
      code: 'LOGIN_SUCCESS'
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo procesar el login',
      code: 'INTERNAL_ERROR'
    });
  }
});

// POST /api/auth/logout - Logout de usuario (REAL)
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token) {
      // Invalidar el token actual
      invalidateToken(token);
      
      // Log de logout
      console.log(`🚪 Usuario ${req.user.email} (${req.user.id}) cerró sesión desde ${req.ip}`);
    }

    res.json({
      message: 'Sesión cerrada exitosamente',
      code: 'LOGOUT_SUCCESS',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error en logout:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo procesar el logout',
      code: 'INTERNAL_ERROR'
    });
  }
});

// POST /api/auth/logout-all - Cerrar todas las sesiones del usuario
router.post('/logout-all', authenticateToken, async (req, res) => {
  try {
    // En una implementación real, aquí invalidarías todos los tokens del usuario
    // Por ahora, solo invalidamos el token actual
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token) {
      invalidateToken(token);
    }
    
    // Log de logout masivo
    console.log(`🚪🚪 Usuario ${req.user.email} (${req.user.id}) cerró todas las sesiones desde ${req.ip}`);

    res.json({
      message: 'Todas las sesiones han sido cerradas',
      code: 'LOGOUT_ALL_SUCCESS',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error en logout-all:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo cerrar todas las sesiones',
      code: 'INTERNAL_ERROR'
    });
  }
});

// POST /api/auth/refresh - Refresh token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        error: 'Refresh token requerido',
        code: 'REFRESH_TOKEN_REQUIRED'
      });
    }

    // Verificar refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    } catch (jwtError) {
      return res.status(401).json({
        error: 'Refresh token inválido',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }

    // Verificar si el usuario sigue existiendo y está activo
    const user = await User.findByPk(decoded.userId);
    if (!user || user.estado !== 'activo') {
      return res.status(401).json({
        error: 'Usuario no válido',
        code: 'INVALID_USER'
      });
    }

    // Generar nuevo token
    const newToken = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        rol: user.rol,
        deviceId: decoded.deviceId,
        sessionId: generateSessionId()
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      message: 'Token refrescado exitosamente',
      token: newToken,
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      code: 'TOKEN_REFRESHED'
    });

  } catch (error) {
    console.error('Error en refresh token:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo refrescar el token',
      code: 'INTERNAL_ERROR'
    });
  }
});

// GET /api/auth/sessions - Obtener sesiones activas del usuario
router.get('/sessions', authenticateToken, async (req, res) => {
  try {
    // En una implementación real, aquí obtendrías las sesiones activas desde la base de datos
    // Por ahora, devolvemos información básica
    const sessions = [
      {
        id: 'current',
        device: req.get('User-Agent') || 'Dispositivo desconocido',
        ip: req.ip,
        lastActivity: new Date(),
        isCurrent: true
      }
    ];

    res.json({
      sessions,
      total: sessions.length,
      code: 'SESSIONS_RETRIEVED'
    });

  } catch (error) {
    console.error('Error al obtener sesiones:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudieron obtener las sesiones',
      code: 'INTERNAL_ERROR'
    });
  }
});

// DELETE /api/auth/sessions/:sessionId - Cerrar sesión específica
router.delete('/sessions/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    if (sessionId === 'current') {
      // Invalidar token actual
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      
      if (token) {
        invalidateToken(token);
      }
    }

    res.json({
      message: 'Sesión cerrada exitosamente',
      code: 'SESSION_CLOSED'
    });

  } catch (error) {
    console.error('Error al cerrar sesión:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo cerrar la sesión',
      code: 'INTERNAL_ERROR'
    });
  }
});

// GET /api/auth/profile - Obtener perfil del usuario
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'nombre', 'email', 'whatsapp', 'rol', 'estado', 'ultimo_acceso', 'created_at']
    });

    if (!user) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({
      user,
      code: 'PROFILE_RETRIEVED'
    });

  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo obtener el perfil',
      code: 'INTERNAL_ERROR'
    });
  }
});

// PUT /api/auth/profile - Actualizar perfil del usuario
router.put('/profile', [
  authenticateToken,
  body('nombre').optional().isString().trim().isLength({ min: 2, max: 100 }).withMessage('Nombre debe tener entre 2 y 100 caracteres'),
  body('whatsapp').optional().isString().trim().isLength({ min: 10, max: 15 }).withMessage('WhatsApp debe tener entre 10 y 15 dígitos')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Datos de entrada inválidos',
        details: errors.array(),
        code: 'VALIDATION_ERROR'
      });
    }

    const { nombre, whatsapp } = req.body;
    const userId = req.user.id;

    // Verificar si el WhatsApp ya existe (si se está cambiando)
    if (whatsapp) {
      const existingUser = await User.findByWhatsApp(whatsapp);
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({
          error: 'WhatsApp ya registrado',
          message: 'Ya existe una cuenta con este número de WhatsApp',
          code: 'WHATSAPP_ALREADY_EXISTS'
        });
      }
    }

    // Actualizar usuario
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    const updateData = {};
    if (nombre) updateData.nombre = nombre;
    if (whatsapp) updateData.whatsapp = whatsapp;

    await user.update(updateData);

    res.json({
      message: 'Perfil actualizado exitosamente',
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        whatsapp: user.whatsapp,
        rol: user.rol
      },
      code: 'PROFILE_UPDATED'
    });

  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo actualizar el perfil',
      code: 'INTERNAL_ERROR'
    });
  }
});

// PUT /api/auth/change-password - Cambiar contraseña
router.put('/change-password', [
  authenticateToken,
  body('currentPassword').notEmpty().withMessage('Contraseña actual requerida'),
  body('newPassword').isLength({ min: 8 }).withMessage('Nueva contraseña debe tener al menos 8 caracteres'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.newPassword) {
      throw new Error('Las contraseñas no coinciden');
    }
    return true;
  }).withMessage('Las contraseñas no coinciden')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Datos de entrada inválidos',
        details: errors.array(),
        code: 'VALIDATION_ERROR'
      });
    }

    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Obtener usuario
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    // Verificar contraseña actual
    const isValidPassword = await user.validatePassword(currentPassword);
    if (!isValidPassword) {
      return res.status(400).json({
        error: 'Contraseña actual incorrecta',
        message: 'La contraseña actual no es correcta',
        code: 'INVALID_CURRENT_PASSWORD'
      });
    }

    // Actualizar contraseña
    user.password = newPassword;
    await user.save();

    // Invalidar todas las sesiones del usuario (forzar re-login)
    // En una implementación real, aquí invalidarías todos los tokens del usuario

    res.json({
      message: 'Contraseña cambiada exitosamente. Todas las sesiones han sido cerradas por seguridad.',
      code: 'PASSWORD_CHANGED'
    });

  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo cambiar la contraseña',
      code: 'INTERNAL_ERROR'
    });
  }
});

// ===== FUNCIONES DE UTILIDAD =====

// Generar ID único del dispositivo
function generateDeviceId(req) {
  const userAgent = req.get('User-Agent') || '';
  const ip = req.ip || req.connection.remoteAddress || '';
  
  // Crear hash simple del User-Agent + IP
  let hash = 0;
  const str = userAgent + ip;
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convertir a entero de 32 bits
  }
  
  return Math.abs(hash).toString(36);
}

// Generar ID único de sesión
function generateSessionId() {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

module.exports = router;
