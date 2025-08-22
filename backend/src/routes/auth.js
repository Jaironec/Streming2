const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { User } = require('../models');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Validación de datos de entrada
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
    .withMessage('WhatsApp inválido'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('La contraseña debe tener al menos 6 caracteres')
];

const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  body('password')
    .notEmpty()
    .withMessage('La contraseña es requerida')
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

    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({
      where: {
        [require('sequelize').Op.or]: [
          { email },
          { whatsapp }
        ]
      }
    });

    if (existingUser) {
      return res.status(409).json({
        error: 'Usuario ya existe',
        message: existingUser.email === email ? 'El email ya está registrado' : 'El WhatsApp ya está registrado',
        code: 'USER_EXISTS'
      });
    }

    // Crear nuevo usuario
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

    // Respuesta exitosa (sin contraseña)
    const userResponse = {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      whatsapp: user.whatsapp,
      rol: user.rol,
      estado: user.estado,
      ultimo_acceso: user.ultimo_acceso
    };

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      user: userResponse,
      token,
      code: 'USER_CREATED'
    });

  } catch (error) {
    console.error('Error en registro:', error);
    
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        error: 'Error de validación',
        details: error.errors.map(e => ({
          field: e.path,
          message: e.message
        })),
        code: 'VALIDATION_ERROR'
      });
    }

    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo registrar el usuario',
      code: 'INTERNAL_ERROR'
    });
  }
});

// POST /api/auth/login - Inicio de sesión
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

    // Verificar si el usuario está bloqueado
    if (user.isBlocked()) {
      return res.status(423).json({
        error: 'Cuenta bloqueada',
        message: 'Tu cuenta está temporalmente bloqueada por múltiples intentos de login',
        code: 'ACCOUNT_LOCKED'
      });
    }

    // Verificar contraseña
    const isValidPassword = await user.validatePassword(password);
    if (!isValidPassword) {
      // Incrementar intentos de login
      await user.incrementLoginAttempts();
      
      return res.status(401).json({
        error: 'Credenciales inválidas',
        message: 'Email o contraseña incorrectos',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Resetear intentos de login y actualizar último acceso
    await user.resetLoginAttempts();
    user.ultimo_acceso = new Date();
    await user.save();

    // Generar token JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email, rol: user.rol },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Respuesta exitosa (sin contraseña)
    const userResponse = {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      whatsapp: user.whatsapp,
      rol: user.rol,
      estado: user.estado,
      ultimo_acceso: user.ultimo_acceso
    };

    res.json({
      message: 'Login exitoso',
      user: userResponse,
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

// GET /api/auth/me - Obtener información del usuario actual
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = req.user;

    // Respuesta sin contraseña
    const userResponse = {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      whatsapp: user.whatsapp,
      rol: user.rol,
      estado: user.estado,
      ultimo_acceso: user.ultimo_acceso
    };

    res.json({
      user: userResponse,
      code: 'USER_INFO_RETRIEVED'
    });

  } catch (error) {
    console.error('Error al obtener información del usuario:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo obtener la información del usuario',
      code: 'INTERNAL_ERROR'
    });
  }
});

// POST /api/auth/logout - Cerrar sesión
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // En una implementación real, aquí podrías invalidar el token
    // Por ahora solo respondemos exitosamente
    
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

module.exports = router;
