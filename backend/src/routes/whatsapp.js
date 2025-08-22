const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const whatsappService = require('../services/whatsappService');
const { Order, User, Profile, Account } = require('../models');

const router = express.Router();

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

// GET /api/whatsapp/status - Obtener estado del servicio WhatsApp
router.get('/status', async (req, res) => {
  try {
    const status = await whatsappService.getConnectionStatus();
    
    res.json({
      status,
      isConnected: await whatsappService.isConnected(),
      code: 'WHATSAPP_STATUS_RETRIEVED'
    });
  } catch (error) {
    console.error('Error al obtener estado de WhatsApp:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo obtener el estado de WhatsApp',
      code: 'INTERNAL_ERROR'
    });
  }
});

// POST /api/whatsapp/send-message - Enviar mensaje personalizado (solo admin)
router.post('/send-message', requireAdmin, [
  body('to').notEmpty().withMessage('Número de destino requerido'),
  body('message').notEmpty().withMessage('Mensaje requerido')
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

    const { to, message } = req.body;
    
    // Verificar formato del número
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(to)) {
      return res.status(400).json({
        error: 'Número de teléfono inválido',
        message: 'El número debe estar en formato internacional',
        code: 'INVALID_PHONE_NUMBER'
      });
    }

    // Enviar mensaje
    const success = await whatsappService.sendMessage(to, message);
    
    if (success) {
      res.json({
        message: 'Mensaje enviado exitosamente',
        to,
        code: 'MESSAGE_SENT'
      });
    } else {
      res.status(500).json({
        error: 'Error al enviar mensaje',
        message: 'No se pudo enviar el mensaje',
        code: 'MESSAGE_SEND_FAILED'
      });
    }
  } catch (error) {
    console.error('Error al enviar mensaje:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo enviar el mensaje',
      code: 'INTERNAL_ERROR'
    });
  }
});

// POST /api/whatsapp/send-access - Enviar accesos por WhatsApp (solo admin)
router.post('/send-access', requireAdmin, [
  body('orderId').isUUID().withMessage('ID de orden inválido')
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

    const { orderId } = req.body;
    
    // Buscar la orden
    const order = await Order.findByPk(orderId, {
      include: [{ model: User, as: 'user' }]
    });
    
    if (!order) {
      return res.status(404).json({
        error: 'Orden no encontrada',
        code: 'ORDER_NOT_FOUND'
      });
    }

    if (order.estado !== 'aprobado') {
      return res.status(400).json({
        error: 'Orden no aprobada',
        message: 'Solo se pueden enviar accesos de órdenes aprobadas',
        code: 'ORDER_NOT_APPROVED'
      });
    }

    // Buscar perfiles asignados
    const profiles = await Profile.findAll({
      where: { order_id_asignado: orderId },
      include: [{ model: Account, as: 'account' }]
    });

    if (profiles.length === 0) {
      return res.status(400).json({
        error: 'No hay perfiles asignados',
        message: 'La orden no tiene perfiles asignados',
        code: 'NO_PROFILES_ASSIGNED'
      });
    }

    // Enviar accesos por WhatsApp
    let successCount = 0;
    for (const profile of profiles) {
      try {
        const success = await whatsappService.sendAccessCredentials(
          order.user.whatsapp,
          order,
          {
            email: profile.account.email,
            password: profile.account.password,
            profileName: profile.nombre_perfil
          }
        );
        if (success) successCount++;
      } catch (error) {
        console.error(`Error enviando acceso para perfil ${profile.id}:`, error);
      }
    }

    if (successCount > 0) {
      res.json({
        message: `Accesos enviados exitosamente a ${successCount} de ${profiles.length} perfiles`,
        successCount,
        totalProfiles: profiles.length,
        code: 'ACCESS_SENT'
      });
    } else {
      res.status(500).json({
        error: 'Error al enviar accesos',
        message: 'No se pudo enviar ningún acceso',
        code: 'ACCESS_SEND_FAILED'
      });
    }
  } catch (error) {
    console.error('Error al enviar accesos:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo enviar los accesos',
      code: 'INTERNAL_ERROR'
    });
  }
});

// POST /api/whatsapp/send-renewal-reminder - Enviar recordatorio de renovación (solo admin)
router.post('/send-renewal-reminder', requireAdmin, [
  body('orderId').isUUID().withMessage('ID de orden inválido')
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

    const { orderId } = req.body;
    
    // Buscar la orden
    const order = await Order.findByPk(orderId, {
      include: [{ model: User, as: 'user' }]
    });
    
    if (!order) {
      return res.status(404).json({
        error: 'Orden no encontrada',
        code: 'ORDER_NOT_FOUND'
      });
    }

    if (order.estado !== 'aprobado') {
      return res.status(400).json({
        error: 'Orden no aprobada',
        message: 'Solo se pueden enviar recordatorios de órdenes aprobadas',
        code: 'ORDER_NOT_APPROVED'
      });
    }

    // Verificar si puede renovar
    if (!order.canRenew()) {
      return res.status(400).json({
        error: 'Renovación no permitida',
        message: 'La orden no está próxima a vencer',
        code: 'RENEWAL_NOT_ALLOWED'
      });
    }

    // Enviar recordatorio
    const success = await whatsappService.sendRenewalReminder(
      order.user.whatsapp,
      order
    );

    if (success) {
      res.json({
        message: 'Recordatorio de renovación enviado exitosamente',
        orderId,
        code: 'RENEWAL_REMINDER_SENT'
      });
    } else {
      res.status(500).json({
        error: 'Error al enviar recordatorio',
        message: 'No se pudo enviar el recordatorio',
        code: 'REMINDER_SEND_FAILED'
      });
    }
  } catch (error) {
    console.error('Error al enviar recordatorio:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo enviar el recordatorio',
      code: 'INTERNAL_ERROR'
    });
  }
});

// POST /api/whatsapp/send-payment-rejected - Enviar notificación de pago rechazado (solo admin)
router.post('/send-payment-rejected', requireAdmin, [
  body('orderId').isUUID().withMessage('ID de orden inválido'),
  body('reason').notEmpty().withMessage('Motivo del rechazo requerido')
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

    const { orderId, reason } = req.body;
    
    // Buscar la orden
    const order = await Order.findByPk(orderId, {
      include: [{ model: User, as: 'user' }]
    });
    
    if (!order) {
      return res.status(404).json({
        error: 'Orden no encontrada',
        code: 'ORDER_NOT_FOUND'
      });
    }

    // Enviar notificación
    const success = await whatsappService.sendPaymentRejected(
      order.user.whatsapp,
      order,
      reason
    );

    if (success) {
      res.json({
        message: 'Notificación de pago rechazado enviada exitosamente',
        orderId,
        code: 'REJECTION_NOTIFICATION_SENT'
      });
    } else {
      res.status(500).json({
        error: 'Error al enviar notificación',
        message: 'No se pudo enviar la notificación',
        code: 'NOTIFICATION_SEND_FAILED'
      });
    }
  } catch (error) {
    console.error('Error al enviar notificación:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo enviar la notificación',
      code: 'INTERNAL_ERROR'
    });
  }
});

// GET /api/whatsapp/orders/:orderId/status - Obtener estado de envío de WhatsApp para una orden
router.get('/orders/:orderId/status', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // Buscar la orden
    const order = await Order.findByPk(orderId, {
      include: [{ model: User, as: 'user' }]
    });
    
    if (!order) {
      return res.status(404).json({
        error: 'Orden no encontrada',
        code: 'ORDER_NOT_FOUND'
      });
    }

    // Verificar que el usuario sea dueño de la orden o admin
    if (order.user_id !== req.user.id && req.user.rol !== 'admin') {
      return res.status(403).json({
        error: 'Acceso denegado',
        message: 'No tienes permisos para acceder a esta orden',
        code: 'ORDER_ACCESS_DENIED'
      });
    }

    // Obtener estado de WhatsApp
    const whatsappStatus = await whatsappService.getConnectionStatus();
    
    res.json({
      orderId,
      whatsappStatus,
      isConnected: await whatsappService.isConnected(),
      userWhatsApp: order.user.whatsapp,
      code: 'WHATSAPP_ORDER_STATUS_RETRIEVED'
    });
  } catch (error) {
    console.error('Error al obtener estado de WhatsApp para orden:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo obtener el estado',
      code: 'INTERNAL_ERROR'
    });
  }
});

// POST /api/whatsapp/bulk-send - Enviar mensaje masivo (solo admin)
router.post('/bulk-send', requireAdmin, [
  body('message').notEmpty().withMessage('Mensaje requerido'),
  body('filters').optional().isObject().withMessage('Filtros deben ser un objeto')
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

    const { message, filters = {} } = req.body;
    
    // Construir where clause para filtros
    const whereClause = {};
    if (filters.estado) whereClause.estado = filters.estado;
    if (filters.servicio) whereClause.servicio = filters.servicio;
    
    // Buscar usuarios según filtros
    const users = await User.findAll({
      where: {
        ...whereClause,
        rol: 'cliente',
        estado: 'activo'
      },
      attributes: ['id', 'nombre', 'whatsapp', 'email']
    });

    if (users.length === 0) {
      return res.status(404).json({
        error: 'No se encontraron usuarios',
        message: 'No hay usuarios que coincidan con los filtros especificados',
        code: 'NO_USERS_FOUND'
      });
    }

    // Enviar mensajes
    let successCount = 0;
    let failedCount = 0;
    const results = [];

    for (const user of users) {
      try {
        const success = await whatsappService.sendMessage(user.whatsapp, message);
        if (success) {
          successCount++;
          results.push({ userId: user.id, status: 'success' });
        } else {
          failedCount++;
          results.push({ userId: user.id, status: 'failed' });
        }
      } catch (error) {
        failedCount++;
        results.push({ userId: user.id, status: 'error', error: error.message });
      }
    }

    res.json({
      message: `Mensaje masivo enviado: ${successCount} exitosos, ${failedCount} fallidos`,
      totalUsers: users.length,
      successCount,
      failedCount,
      results,
      code: 'BULK_MESSAGE_SENT'
    });
  } catch (error) {
    console.error('Error al enviar mensaje masivo:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo enviar el mensaje masivo',
      code: 'INTERNAL_ERROR'
    });
  }
});

module.exports = router;
