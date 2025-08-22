const express = require('express');
const { body, validationResult } = require('express-validator');
const { Order, Payment, Profile, Account } = require('../models');
const { authenticateToken, requireClient, requireOwnership } = require('../middleware/auth');
const ocrService = require('../services/ocrService');
const whatsappService = require('../services/whatsappService');
const pricingService = require('../services/pricingService');

const router = express.Router();

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

// Validación para crear orden
const validateOrder = [
  body('servicio')
    .isIn(['Netflix', 'Disney+', 'HBO Max', 'Amazon Prime', 'Paramount+', 'Apple TV+'])
    .withMessage('Servicio no válido'),
  body('perfiles')
    .isInt({ min: 1, max: 6 })
    .withMessage('Perfiles debe ser entre 1 y 6'),
  body('meses')
    .isInt({ min: 1, max: 24 })
    .withMessage('Meses debe ser entre 1 y 24')
];

// POST /api/orders - Crear nueva orden
router.post('/', requireClient, validateOrder, async (req, res) => {
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

    const { servicio, perfiles, meses } = req.body;
    const userId = req.user.id;

    // Calcular precio usando el servicio de precios
    const pricing = pricingService.calculateTotalPrice(servicio, meses, perfiles);

    // Crear la orden
    const order = await Order.create({
      user_id: userId,
      servicio,
      perfiles,
      meses,
      monto: pricing.totalPrice,
      estado: 'pendiente'
    });

    res.status(201).json({
      message: 'Orden creada exitosamente',
      order: {
        id: order.id,
        servicio: order.servicio,
        perfiles: order.perfiles,
        meses: order.meses,
        monto: order.monto,
        estado: order.estado,
        fecha_creacion: order.fecha_creacion
      },
      pricing: {
        basePrice: pricing.basePrice,
        finalPrice: pricing.totalPrice,
        savings: pricing.savings,
        monthDiscount: pricing.monthDiscount,
        profileDiscount: pricing.profileDiscount
      },
      code: 'ORDER_CREATED'
    });

  } catch (error) {
    console.error('Error al crear orden:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo crear la orden',
      code: 'INTERNAL_ERROR'
    });
  }
});

// GET /api/orders - Listar órdenes del usuario
router.get('/', requireClient, async (req, res) => {
  try {
    const userId = req.user.id;
    const orders = await Order.findByUser(userId);

    const ordersWithDetails = await Promise.all(
      orders.map(async (order) => {
        const payment = await Payment.findByOrder(order.id);
        const profiles = await Profile.findAll({
          where: { order_id_asignado: order.id }
        });

        return {
          id: order.id,
          servicio: order.servicio,
          perfiles: order.perfiles,
          meses: order.meses,
          monto: order.monto,
          estado: order.estado,
          fecha_creacion: order.fecha_creacion,
          fecha_vencimiento: order.fecha_vencimiento,
          payment: payment ? {
            estado: payment.estado_final,
            fecha_validacion: payment.fecha_validacion
          } : null,
          profiles: profiles.map(p => ({
            id: p.id,
            nombre: p.nombre_perfil,
            estado: p.estado,
            fecha_expiracion: p.fecha_expiracion
          }))
        };
      })
    );

    res.json({
      orders: ordersWithDetails,
      code: 'ORDERS_RETRIEVED'
    });

  } catch (error) {
    console.error('Error al obtener órdenes:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudieron obtener las órdenes',
      code: 'INTERNAL_ERROR'
    });
  }
});

// GET /api/orders/:id - Obtener orden específica
router.get('/:id', requireClient, requireOwnership('order'), async (req, res) => {
  try {
    const order = req.resource;
    const payment = await Payment.findByOrder(order.id);
    const profiles = await Profile.findAll({
      where: { order_id_asignado: order.id }
    });

    const orderDetails = {
      id: order.id,
      servicio: order.servicio,
      perfiles: order.perfiles,
      meses: order.meses,
      monto: order.monto,
      estado: order.estado,
      fecha_creacion: order.fecha_creacion,
      fecha_vencimiento: order.fecha_vencimiento,
      fecha_aprobacion: order.fecha_aprobacion,
      comentarios_admin: order.comentarios_admin,
      payment: payment ? {
        id: payment.id,
        estado: payment.estado_final,
        resultado_ocr: payment.resultado_ocr,
        validado_automatico: payment.validado_automatico,
        validado_admin: payment.validado_admin,
        fecha_validacion: payment.fecha_validacion,
        comentarios_admin: payment.comentarios_admin
      } : null,
      profiles: profiles.map(p => ({
        id: p.id,
        nombre: p.nombre_perfil,
        estado: p.estado,
        fecha_asignacion: p.fecha_asignacion,
        fecha_expiracion: p.fecha_expiracion
      }))
    };

    res.json({
      order: orderDetails,
      code: 'ORDER_RETRIEVED'
    });

  } catch (error) {
    console.error('Error al obtener orden:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo obtener la orden',
      code: 'INTERNAL_ERROR'
    });
  }
});

// PUT /api/orders/:id/upload-proof - Subir comprobante de pago
router.put('/:id/upload-proof', requireClient, requireOwnership('order'), async (req, res) => {
  try {
    const order = req.resource;
    
    // Verificar que la orden esté pendiente
    if (order.estado !== 'pendiente') {
      return res.status(400).json({
        error: 'Orden no válida para subir comprobante',
        message: 'Solo se pueden subir comprobantes a órdenes pendientes',
        code: 'INVALID_ORDER_STATE'
      });
    }

    // Aquí iría la lógica de subida de archivo
    // Por ahora simulamos que se recibió el archivo
    const { archivo_comprobante } = req.body;

    if (!archivo_comprobante) {
      return res.status(400).json({
        error: 'Comprobante requerido',
        message: 'Debe subir un comprobante de pago',
        code: 'PROOF_REQUIRED'
      });
    }

    // Crear registro de pago
    const payment = await Payment.create({
      order_id: order.id,
      archivo_comprobante,
      estado_final: 'pendiente'
    });

    // Procesar con OCR
    try {
      const ocrResult = await ocrService.validatePaymentProof(
        archivo_comprobante,
        order.monto
      );

      // Actualizar resultado OCR
      payment.resultado_ocr = ocrResult.extractedData;
      payment.validado_automatico = ocrResult.success && ocrResult.confidence >= 80;
      
      if (payment.validado_automatico) {
        payment.estado_final = 'aprobado';
        order.estado = 'aprobado';
        
        // Asignar perfiles automáticamente
        await assignProfilesToOrder(order, req.user);
        
        // Enviar accesos por WhatsApp
        await sendAccessCredentials(order, req.user);
      } else {
        order.estado = 'validando';
      }

      await payment.save();
      await order.save();

      res.json({
        message: 'Comprobante procesado exitosamente',
        payment: {
          id: payment.id,
          estado: payment.estado_final,
          resultado_ocr: payment.resultado_ocr,
          validado_automatico: payment.validado_automatico
        },
        order: {
          id: order.id,
          estado: order.estado
        },
        code: 'PROOF_PROCESSED'
      });

    } catch (ocrError) {
      console.error('Error en OCR:', ocrError);
      
      // Marcar como pendiente de revisión manual
      payment.estado_final = 'pendiente';
      order.estado = 'validando';
      
      await payment.save();
      await order.save();

      res.json({
        message: 'Comprobante subido, pendiente de revisión manual',
        payment: {
          id: payment.id,
          estado: payment.estado_final
        },
        order: {
          id: order.id,
          estado: order.estado
        },
        code: 'PROOF_UPLOADED'
      });
    }

  } catch (error) {
    console.error('Error al subir comprobante:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo procesar el comprobante',
      code: 'INTERNAL_ERROR'
    });
  }
});

// Función auxiliar para asignar perfiles a una orden
async function assignProfilesToOrder(order, user) {
  try {
    // Buscar perfiles disponibles para el servicio
    const availableProfiles = await Profile.findAvailableByService(order.servicio);
    
    if (availableProfiles.length < order.perfiles) {
      throw new Error(`No hay suficientes perfiles disponibles para ${order.servicio}`);
    }

    // Asignar perfiles
    for (let i = 0; i < order.perfiles; i++) {
      const profile = availableProfiles[i];
      await profile.assignToUser(user.id, order.id, order.meses);
    }

    return true;
  } catch (error) {
    console.error('Error al asignar perfiles:', error);
    throw error;
  }
}

// Función auxiliar para enviar credenciales por WhatsApp
async function sendAccessCredentials(order, user) {
  try {
    // Obtener perfiles asignados
    const profiles = await Profile.findAll({
      where: { order_id_asignado: order.id },
      include: [{ model: Account, as: 'account' }]
    });

    if (profiles.length === 0) {
      throw new Error('No se encontraron perfiles asignados');
    }

    // Enviar credenciales por WhatsApp
    for (const profile of profiles) {
      await whatsappService.sendAccessCredentials(
        user.whatsapp,
        order,
        {
          email: profile.account.email,
          password: profile.account.password,
          profileName: profile.nombre_perfil
        }
      );
    }

    return true;
  } catch (error) {
    console.error('Error al enviar credenciales:', error);
    throw error;
  }
}

module.exports = router;
