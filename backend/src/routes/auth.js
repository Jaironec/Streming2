const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register - Registro de usuario
router.post('/register', [
  body('nombre').isString().trim().isLength({ min: 2, max: 100 }).withMessage('Nombre debe tener entre 2 y 100 caracteres'),
  body('email').isEmail().normalizeEmail().withMessage('Email válido requerido'),
  body('whatsapp').isString().trim().isLength({ min: 10, max: 15 }).withMessage('WhatsApp debe tener entre 10 y 15 dígitos'),
  body('password').isLength({ min: 6 }).withMessage('Contraseña debe tener al menos 6 caracteres')
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
        rol: user.rol
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
      return res.status(403).json({
        error: 'Cuenta bloqueada',
        message: `Tu cuenta está bloqueada hasta ${user.bloqueado_hasta}. Intenta más tarde.`,
        code: 'ACCOUNT_LOCKED'
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
    await user.update({ ultimo_acceso: new Date() });

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
        rol: user.rol
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
    // En una implementación real, podrías invalidar el token
    // Por ahora solo devolvemos éxito
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
  body('newPassword').isLength({ min: 6 }).withMessage('Nueva contraseña debe tener al menos 6 caracteres'),
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

module.exports = router;
