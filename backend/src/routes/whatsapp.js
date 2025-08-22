const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const whatsappService = require('../services/whatsappService');

const router = express.Router();

// GET /api/whatsapp/status - Estado de la conexión de WhatsApp
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const status = whatsappService.getConnectionStatus();
    
    res.json({
      status,
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

// POST /api/whatsapp/connect - Conectar WhatsApp (solo admin)
router.post('/connect', requireAdmin, async (req, res) => {
  try {
    await whatsappService.initialize();
    
    res.json({
      message: 'WhatsApp conectado exitosamente',
      code: 'WHATSAPP_CONNECTED'
    });

  } catch (error) {
    console.error('Error al conectar WhatsApp:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo conectar WhatsApp',
      code: 'INTERNAL_ERROR'
    });
  }
});

// POST /api/whatsapp/disconnect - Desconectar WhatsApp (solo admin)
router.post('/disconnect', requireAdmin, async (req, res) => {
  try {
    await whatsappService.logout();
    
    res.json({
      message: 'WhatsApp desconectado exitosamente',
      code: 'WHATSAPP_DISCONNECTED'
    });

  } catch (error) {
    console.error('Error al desconectar WhatsApp:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo desconectar WhatsApp',
      code: 'INTERNAL_ERROR'
    });
  }
});

// POST /api/whatsapp/send-test - Enviar mensaje de prueba (solo admin)
router.post('/send-test', requireAdmin, async (req, res) => {
  try {
    const { phone, message } = req.body;
    
    if (!phone || !message) {
      return res.status(400).json({
        error: 'Datos requeridos',
        message: 'Phone y message son requeridos',
        code: 'MISSING_DATA'
      });
    }

    await whatsappService.sendMessage(phone, message);
    
    res.json({
      message: 'Mensaje de prueba enviado exitosamente',
      code: 'TEST_MESSAGE_SENT'
    });

  } catch (error) {
    console.error('Error al enviar mensaje de prueba:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo enviar el mensaje de prueba',
      code: 'INTERNAL_ERROR'
    });
  }
});

// GET /api/whatsapp/sessions - Listar sesiones disponibles (solo admin)
router.get('/sessions', requireAdmin, async (req, res) => {
  try {
    const sessions = await whatsappService.listSessions();
    
    res.json({
      sessions,
      code: 'SESSIONS_RETRIEVED'
    });

  } catch (error) {
    console.error('Error al listar sesiones:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudieron listar las sesiones',
      code: 'INTERNAL_ERROR'
    });
  }
});

// POST /api/whatsapp/send-notification - Enviar notificación personalizada (solo admin)
router.post('/send-notification', requireAdmin, async (req, res) => {
  try {
    const { phone, message, type } = req.body;
    
    if (!phone || !message) {
      return res.status(400).json({
        error: 'Datos requeridos',
        message: 'Phone y message son requeridos',
        code: 'MISSING_DATA'
      });
    }

    let result;
    switch (type) {
      case 'renewal':
        result = await whatsappService.sendRenewalReminder(phone, message);
        break;
      case 'support':
        result = await whatsappService.sendSupportMessage(phone, message);
        break;
      case 'custom':
        result = await whatsappService.sendMessage(phone, message);
        break;
      default:
        return res.status(400).json({
          error: 'Tipo de notificación inválido',
          message: 'Tipo debe ser: renewal, support, o custom',
          code: 'INVALID_NOTIFICATION_TYPE'
        });
    }
    
    res.json({
      message: 'Notificación enviada exitosamente',
      result,
      code: 'NOTIFICATION_SENT'
    });

  } catch (error) {
    console.error('Error al enviar notificación:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo enviar la notificación',
      code: 'INTERNAL_ERROR'
    });
  }
});

// GET /api/whatsapp/health - Verificar salud del servicio
router.get('/health', async (req, res) => {
  try {
    const isConnected = whatsappService.isConnected();
    const status = whatsappService.getConnectionStatus();
    
    res.json({
      healthy: isConnected,
      status,
      timestamp: new Date().toISOString(),
      code: 'HEALTH_CHECK_COMPLETED'
    });

  } catch (error) {
    console.error('Error en health check:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo verificar la salud del servicio',
      code: 'INTERNAL_ERROR'
    });
  }
});

module.exports = router;
