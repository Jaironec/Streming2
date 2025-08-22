const express = require('express');
const { body, validationResult } = require('express-validator');
const { Order, Payment, Profile, Account, User } = require('../models');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const whatsappService = require('../services/whatsappService');
const pricingService = require('../services/pricingService');

const router = express.Router();

// Aplicar autenticación y autorización de admin a todas las rutas
router.use(authenticateToken, requireAdmin);

// GET /api/admin/dashboard - Estadísticas del sistema
router.get('/dashboard', async (req, res) => {
  try {
    // Contar órdenes por estado
    const ordersByStatus = await Order.findAll({
      attributes: [
        'estado',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
      ],
      group: ['estado']
    });

    // Contar pagos por estado
    const paymentsByStatus = await Payment.findAll({
      attributes: [
        'estado_final',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
      ],
      group: ['estado_final']
    });

    // Contar perfiles por estado
    const profilesByStatus = await Profile.findAll({
      attributes: [
        'estado',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
      ],
      group: ['estado']
    });

    // Contar usuarios por rol
    const usersByRole = await User.findAll({
      attributes: [
        'rol',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
      ],
      group: ['rol']
    });

    // Órdenes recientes
    const recentOrders = await Order.findAll({
      include: [
        { model: User, as: 'user', attributes: ['nombre', 'email', 'whatsapp'] },
        { model: Payment, as: 'payment' }
      ],
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    // Ingresos del mes actual
    const currentMonth = new Date();
    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

    const monthlyRevenue = await Order.findAll({
      where: {
        estado: 'aprobado',
        fecha_aprobacion: {
          [require('sequelize').Op.between]: [startOfMonth, endOfMonth]
        }
      },
      attributes: [
        [require('sequelize').fn('SUM', require('sequelize').col('monto')), 'total']
      ]
    });

    const stats = {
      orders: {
        total: ordersByStatus.reduce((sum, item) => sum + parseInt(item.dataValues.count), 0),
        byStatus: ordersByStatus.reduce((acc, item) => {
          acc[item.estado] = parseInt(item.dataValues.count);
          return acc;
        }, {})
      },
      payments: {
        total: paymentsByStatus.reduce((sum, item) => sum + parseInt(item.dataValues.count), 0),
        byStatus: paymentsByStatus.reduce((acc, item) => {
          acc[item.estado_final] = parseInt(item.dataValues.count);
          return acc;
        }, {})
      },
      profiles: {
        total: profilesByStatus.reduce((sum, item) => sum + parseInt(item.dataValues.count), 0),
        byStatus: profilesByStatus.reduce((acc, item) => {
          acc[item.estado] = parseInt(item.dataValues.count);
          return acc;
        }, {})
      },
      users: {
        total: usersByRole.reduce((sum, item) => sum + parseInt(item.dataValues.count), 0),
        byRole: usersByRole.reduce((acc, item) => {
          acc[item.rol] = parseInt(item.dataValues.count);
          return acc;
        }, {})
      },
      revenue: {
        monthly: parseFloat(monthlyRevenue[0]?.dataValues.total || 0)
      },
      recentOrders: recentOrders.map(order => ({
        id: order.id,
        servicio: order.servicio,
        monto: order.monto,
        estado: order.estado,
        fecha_creacion: order.fecha_creacion,
        user: order.user ? {
          nombre: order.user.nombre,
          email: order.user.email
        } : null,
        payment: order.payment ? {
          estado: order.payment.estado_final
        } : null
      }))
    };

    res.json({
      stats,
      code: 'DASHBOARD_RETRIEVED'
    });

  } catch (error) {
    console.error('Error al obtener dashboard:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo obtener el dashboard',
      code: 'INTERNAL_ERROR'
    });
  }
});

// GET /api/admin/orders - Listar todas las órdenes
router.get('/orders', async (req, res) => {
  try {
    const { page = 1, limit = 20, estado, servicio } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (estado) whereClause.estado = estado;
    if (servicio) whereClause.servicio = servicio;

    const orders = await Order.findAndCountAll({
      where: whereClause,
      include: [
        { model: User, as: 'user', attributes: ['nombre', 'email', 'whatsapp'] },
        { model: Payment, as: 'payment' }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const ordersWithDetails = await Promise.all(
      orders.rows.map(async (order) => {
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
          fecha_aprobacion: order.fecha_aprobacion,
          comentarios_admin: order.comentarios_admin,
          user: order.user ? {
            id: order.user.id,
            nombre: order.user.nombre,
            email: order.user.email,
            whatsapp: order.user.whatsapp
          } : null,
          payment: order.payment ? {
            id: order.payment.id,
            estado: order.payment.estado_final,
            resultado_ocr: order.payment.resultado_ocr,
            validado_automatico: order.payment.validado_automatico,
            validado_admin: order.payment.validado_admin,
            fecha_validacion: order.payment.fecha_validacion,
            comentarios_admin: order.payment.comentarios_admin
          } : null,
          profiles: profiles.map(p => ({
            id: p.id,
            nombre: p.nombre_perfil,
            estado: p.estado,
            fecha_asignacion: p.fecha_asignacion,
            fecha_expiracion: p.fecha_expiracion
          }))
        };
      })
    );

    res.json({
      orders: ordersWithDetails,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: orders.count,
        pages: Math.ceil(orders.count / limit)
      },
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

// PUT /api/admin/orders/:id/approve - Aprobar orden
router.put('/orders/:id/approve', [
  body('comentarios_admin').optional().trim().isLength({ max: 500 })
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

    const { id } = req.params;
    const { comentarios_admin } = req.body;
    const adminId = req.user.id;

    const order = await Order.findByPk(id);
    if (!order) {
      return res.status(404).json({
        error: 'Orden no encontrada',
        code: 'ORDER_NOT_FOUND'
      });
    }

    if (order.estado === 'aprobado') {
      return res.status(400).json({
        error: 'Orden ya aprobada',
        code: 'ORDER_ALREADY_APPROVED'
      });
    }

    // Aprobar la orden
    order.estado = 'aprobado';
    order.admin_id = adminId;
    order.comentarios_admin = comentarios_admin;
    order.fecha_aprobacion = new Date();
    
    // Calcular fecha de vencimiento
    const fechaVencimiento = new Date();
    fechaVencimiento.setMonth(fechaVencimiento.getMonth() + order.meses);
    order.fecha_vencimiento = fechaVencimiento;

    await order.save();

    // Aprobar el pago si existe
    const payment = await Payment.findByOrder(id);
    if (payment) {
      payment.estado_final = 'aprobado';
      payment.validado_admin = true;
      payment.admin_id = adminId;
      payment.comentarios_admin = comentarios_admin;
      await payment.save();
    }

    // Asignar perfiles automáticamente
    await assignProfilesToOrder(order);

    // Enviar accesos por WhatsApp
    const user = await User.findByPk(order.user_id);
    if (user) {
      await sendAccessCredentials(order, user);
    }

    res.json({
      message: 'Orden aprobada exitosamente',
      order: {
        id: order.id,
        estado: order.estado,
        fecha_aprobacion: order.fecha_aprobacion,
        fecha_vencimiento: order.fecha_vencimiento
      },
      code: 'ORDER_APPROVED'
    });

  } catch (error) {
    console.error('Error al aprobar orden:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo aprobar la orden',
      code: 'INTERNAL_ERROR'
    });
  }
});

// PUT /api/admin/orders/:id/reject - Rechazar orden
router.put('/orders/:id/reject', [
  body('comentarios_admin').trim().isLength({ min: 1, max: 500 }).withMessage('Comentarios requeridos')
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

    const { id } = req.params;
    const { comentarios_admin } = req.body;
    const adminId = req.user.id;

    const order = await Order.findByPk(id);
    if (!order) {
      return res.status(404).json({
        error: 'Orden no encontrada',
        code: 'ORDER_NOT_FOUND'
      });
    }

    if (order.estado === 'rechazado') {
      return res.status(400).json({
        error: 'Orden ya rechazada',
        code: 'ORDER_ALREADY_REJECTED'
      });
    }

    // Rechazar la orden
    order.estado = 'rechazado';
    order.admin_id = adminId;
    order.comentarios_admin = comentarios_admin;

    await order.save();

    // Rechazar el pago si existe
    const payment = await Payment.findByOrder(id);
    if (payment) {
      payment.estado_final = 'rechazado';
      payment.validado_admin = true;
      payment.admin_id = adminId;
      payment.comentarios_admin = comentarios_admin;
      await payment.save();
    }

    // Notificar al cliente por WhatsApp
    const user = await User.findByPk(order.user_id);
    if (user) {
      await whatsappService.sendPaymentRejected(user.whatsapp, order, comentarios_admin);
    }

    res.json({
      message: 'Orden rechazada exitosamente',
      order: {
        id: order.id,
        estado: order.estado,
        comentarios_admin: order.comentarios_admin
      },
      code: 'ORDER_REJECTED'
    });

  } catch (error) {
    console.error('Error al rechazar orden:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo rechazar la orden',
      code: 'INTERNAL_ERROR'
    });
  }
});

// GET /api/admin/payments - Listar pagos pendientes
router.get('/payments', async (req, res) => {
  try {
    const payments = await Payment.findPendingPayments();

    res.json({
      payments: payments.map(payment => ({
        id: payment.id,
        order_id: payment.order_id,
        archivo_comprobante: payment.archivo_comprobante,
        resultado_ocr: payment.resultado_ocr,
        validado_automatico: payment.validado_automatico,
        validado_admin: payment.validado_admin,
        estado_final: payment.estado_final,
        fecha_validacion: payment.fecha_validacion,
        comentarios_admin: payment.comentarios_admin,
        order: payment.order ? {
          id: payment.order.id,
          servicio: payment.order.servicio,
          perfiles: payment.order.perfiles,
          meses: payment.order.meses,
          monto: payment.order.monto,
          estado: payment.order.estado,
          fecha_creacion: payment.order.fecha_creacion,
          user: payment.order.user ? {
            nombre: payment.order.user.nombre,
            email: payment.order.user.email,
            whatsapp: payment.order.user.whatsapp
          } : null
        } : null
      })),
      code: 'PAYMENTS_RETRIEVED'
    });

  } catch (error) {
    console.error('Error al obtener pagos:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudieron obtener los pagos',
      code: 'INTERNAL_ERROR'
    });
  }
});

// Función auxiliar para asignar perfiles a una orden
async function assignProfilesToOrder(order) {
  try {
    // Buscar perfiles disponibles para el servicio
    const availableProfiles = await Profile.findAvailableByService(order.servicio);
    
    if (availableProfiles.length < order.perfiles) {
      throw new Error(`No hay suficientes perfiles disponibles para ${order.servicio}`);
    }

    // Asignar perfiles
    for (let i = 0; i < order.perfiles; i++) {
      const profile = availableProfiles[i];
      await profile.assignToUser(order.user_id, order.id, order.meses);
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
