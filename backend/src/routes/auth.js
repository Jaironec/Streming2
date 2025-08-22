const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Validación para registro
const validateRegistration = [
  body('nombre')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  body('whatsapp')
    .trim()
    .isLength({ min: 10, max: 20 })
    .withMessage('WhatsApp debe tener entre 10 y 20 caracteres'),
  body('password')
    .isLength({ min: 6, max: 255 })
    .withMessage('La contraseña debe tener entre 6 y 255 caracteres')
];

// Validación para login
const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  body('password')
    .notEmpty()
    .withMessage('Contraseña requerida')
];

// POST /api/auth/register - Registro de usuario
router.post('/register', validateRegistration, async (req, res) => {
  try {
    // Verificar errores de validación
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
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        error: 'Email ya registrado',
        message: 'Este email ya está siendo utilizado por otro usuario',
        code: 'EMAIL_ALREADY_EXISTS'
      });
    }

    // Verificar si el WhatsApp ya existe
    const existingWhatsApp = await User.findByWhatsApp(whatsapp);
    if (existingWhatsApp) {
      return res.status(409).json({
        error: 'WhatsApp ya registrado',
        message: 'Este número de WhatsApp ya está siendo utilizado',
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

    // Generar token JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email, rol: user.rol },
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
        rol: user.rol,
        estado: user.estado
      },
      token,
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
router.post('/login', validateLogin, async (req, res) => {
  try {
    // Verificar errores de validación
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

    // Verificar si el usuario está activo
    if (user.estado !== 'activo') {
      return res.status(401).json({
        error: 'Cuenta suspendida',
        message: 'Tu cuenta ha sido suspendida. Contacta soporte.',
        code: 'ACCOUNT_SUSPENDED'
      });
    }

    // Verificar si el usuario está bloqueado
    if (user.isBlocked()) {
      return res.status(423).json({
        error: 'Cuenta bloqueada temporalmente',
        message: 'Demasiados intentos de login fallidos. Intenta de nuevo más tarde.',
        code: 'ACCOUNT_LOCKED'
      });
    }

    // Verificar contraseña
    const isValidPassword = await user.validatePassword(password);
    if (!isValidPassword) {
      // Incrementar intentos fallidos
      await user.incrementLoginAttempts();
      
      return res.status(401).json({
        error: 'Credenciales inválidas',
        message: 'Email o contraseña incorrectos',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Resetear intentos de login
    await user.resetLoginAttempts();

    // Actualizar último acceso
    user.ultimo_acceso = new Date();
    await user.save();

    // Generar token JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email, rol: user.rol },
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
        estado: user.estado,
        ultimo_acceso: user.ultimo_acceso
      },
      token,
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

// POST /api/auth/logout - Logout de usuario
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // En una implementación real, aquí podrías invalidar el token
    // Por ahora solo respondemos con éxito
    res.json({
      message: 'Logout exitoso',
      code: 'LOGOUT_SUCCESS'
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

// GET /api/auth/profile - Obtener perfil del usuario
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    
    res.json({
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        whatsapp: user.whatsapp,
        rol: user.rol,
        estado: user.estado,
        ultimo_acceso: user.ultimo_acceso,
        fecha_creacion: user.createdAt
      },
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
router.put('/profile', authenticateToken, [
  body('nombre')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres'),
  body('whatsapp')
    .optional()
    .trim()
    .isLength({ min: 10, max: 20 })
    .withMessage('WhatsApp debe tener entre 10 y 20 caracteres')
], async (req, res) => {
  try {
    // Verificar errores de validación
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Datos de entrada inválidos',
        details: errors.array(),
        code: 'VALIDATION_ERROR'
      });
    }

    const { nombre, whatsapp } = req.body;
    const user = req.user;

    // Verificar si el WhatsApp ya existe (si se está cambiando)
    if (whatsapp && whatsapp !== user.whatsapp) {
      const existingWhatsApp = await User.findByWhatsApp(whatsapp);
      if (existingWhatsApp && existingWhatsApp.id !== user.id) {
        return res.status(409).json({
          error: 'WhatsApp ya registrado',
          message: 'Este número de WhatsApp ya está siendo utilizado',
          code: 'WHATSAPP_ALREADY_EXISTS'
        });
      }
    }

    // Actualizar campos
    if (nombre) user.nombre = nombre;
    if (whatsapp) user.whatsapp = whatsapp;

    await user.save();

    res.json({
      message: 'Perfil actualizado exitosamente',
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        whatsapp: user.whatsapp,
        rol: user.rol,
        estado: user.estado,
        ultimo_acceso: user.ultimo_acceso
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
router.put('/change-password', authenticateToken, [
  body('currentPassword')
    .notEmpty()
    .withMessage('Contraseña actual requerida'),
  body('newPassword')
    .isLength({ min: 6, max: 255 })
    .withMessage('La nueva contraseña debe tener entre 6 y 255 caracteres')
], async (req, res) => {
  try {
    // Verificar errores de validación
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Datos de entrada inválidos',
        details: errors.array(),
        code: 'VALIDATION_ERROR'
      });
    }

    const { currentPassword, newPassword } = req.body;
    const user = req.user;

    // Verificar contraseña actual
    const isValidPassword = await user.validatePassword(currentPassword);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Contraseña actual incorrecta',
        message: 'La contraseña actual no coincide',
        code: 'INVALID_CURRENT_PASSWORD'
      });
    }

    // Cambiar contraseña
    user.password = newPassword;
    await user.save();

    res.json({
      message: 'Contraseña cambiada exitosamente',
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

// POST /api/auth/refresh - Renovar token
router.post('/refresh', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    
    // Generar nuevo token
    const newToken = jwt.sign(
      { userId: user.id, email: user.email, rol: user.rol },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      message: 'Token renovado exitosamente',
      token: newToken,
      code: 'TOKEN_REFRESHED'
    });
  } catch (error) {
    console.error('Error al renovar token:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo renovar el token',
      code: 'INTERNAL_ERROR'
    });
  }
});

module.exports = router;
