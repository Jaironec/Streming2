const express = require('express');
const { body, validationResult } = require('express-validator');
const { Order, Payment, Profile, Account, User, Service } = require('../models');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const whatsappService = require('../services/whatsappService');

const router = express.Router();

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);
router.use(requireAdmin);

// GET /api/admin/dashboard - Dashboard del administrador
router.get('/dashboard', async (req, res) => {
  try {
    // Estadísticas generales
    const totalOrders = await Order.count();
    const pendingOrders = await Order.count({ where: { estado: 'pendiente' } });
    const approvedOrders = await Order.count({ where: { estado: 'aprobado' } });
    const rejectedOrders = await Order.count({ where: { estado: 'rechazado' } });
    
    // Ingresos del mes actual
    const currentMonth = new Date();
    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    
    const monthlyRevenue = await Order.sum('monto', {
      where: {
        estado: 'aprobado',
        fecha_aprobacion: {
          [require('sequelize').Op.between]: [startOfMonth, endOfMonth]
        }
      }
    });

    // Pagos pendientes
    const pendingPayments = await Payment.count({ where: { estado_final: 'pendiente' } });

    res.json({
      stats: {
        totalOrders,
        pendingOrders,
        approvedOrders,
        rejectedOrders,
        totalRevenue: monthlyRevenue || 0,
        pendingPayments
      },
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
    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = {};
    if (status && status !== 'all') {
      whereClause.estado = status;
    }

    const orders = await Order.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'nombre', 'email', 'whatsapp']
        },
        {
          model: Payment,
          as: 'payment',
          attributes: ['id', 'estado_final', 'resultado_ocr', 'archivo_comprobante']
        }
      ],
      order: [['fecha_creacion', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      orders: orders.rows,
      total: orders.count,
      totalPages: Math.ceil(orders.count / limit),
      currentPage: parseInt(page),
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
  body('comentarios_admin').optional().isString().trim()
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

    const order = await Order.findByPk(id, {
      include: [
        { model: User, as: 'user' },
        { model: Payment, as: 'payment' }
      ]
    });

    if (!order) {
      return res.status(404).json({
        error: 'Orden no encontrada',
        code: 'ORDER_NOT_FOUND'
      });
    }

    if (order.estado !== 'pendiente' && order.estado !== 'validando') {
      return res.status(400).json({
        error: 'Orden no válida para aprobar',
        message: 'Solo se pueden aprobar órdenes pendientes o en validación',
        code: 'INVALID_ORDER_STATE'
      });
    }

    // Aprobar la orden
    order.estado = 'aprobado';
    order.fecha_aprobacion = new Date();
    order.admin_id = adminId;
    order.comentarios_admin = comentarios_admin || 'Orden aprobada por administrador';

    // Calcular fecha de vencimiento
    const fechaVencimiento = new Date();
    fechaVencimiento.setMonth(fechaVencimiento.getMonth() + order.meses);
    order.fecha_vencimiento = fechaVencimiento;

    await order.save();

    // Si hay pago, marcarlo como aprobado
    if (order.payment) {
      order.payment.estado_final = 'aprobado';
      order.payment.validado_admin = true;
      order.payment.admin_id = adminId;
      order.payment.fecha_validacion = new Date();
      await order.payment.save();
    }

    // Asignar perfiles automáticamente
    try {
      await assignProfilesToOrder(order);
      
      // Enviar credenciales por WhatsApp
      if (order.user && order.user.whatsapp) {
        await whatsappService.sendAccessCredentials(
          order.user.whatsapp,
          order,
          await getProfileCredentials(order.id)
        );
      }
    } catch (error) {
      console.error('Error al asignar perfiles:', error);
      // Continuar con la aprobación aunque falle la asignación
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
  body('comentarios_admin').isString().trim().notEmpty().withMessage('Comentarios requeridos')
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

    const order = await Order.findByPk(id, {
      include: [
        { model: User, as: 'user' },
        { model: Payment, as: 'payment' }
      ]
    });

    if (!order) {
      return res.status(404).json({
        error: 'Orden no encontrada',
        code: 'ORDER_NOT_FOUND'
      });
    }

    if (order.estado === 'aprobado') {
      return res.status(400).json({
        error: 'Orden no válida para rechazar',
        message: 'No se puede rechazar una orden ya aprobada',
        code: 'INVALID_ORDER_STATE'
      });
    }

    // Rechazar la orden
    order.estado = 'rechazado';
    order.admin_id = adminId;
    order.comentarios_admin = comentarios_admin;

    await order.save();

    // Si hay pago, marcarlo como rechazado
    if (order.payment) {
      order.payment.estado_final = 'rechazado';
      order.payment.validado_admin = true;
      order.payment.admin_id = adminId;
      order.payment.fecha_validacion = new Date();
      order.payment.comentarios_admin = comentarios_admin;
      await order.payment.save();
    }

    // Notificar al cliente por WhatsApp
    if (order.user && order.user.whatsapp) {
      try {
        await whatsappService.sendPaymentRejected(
          order.user.whatsapp,
          order,
          comentarios_admin
        );
      } catch (error) {
        console.error('Error al enviar notificación WhatsApp:', error);
      }
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
    const payments = await Payment.findAll({
      where: { estado_final: 'pendiente' },
      include: [
        {
          model: Order,
          as: 'order',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'nombre', 'email', 'whatsapp']
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      payments,
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

// ===== GESTIÓN DE SERVICIOS =====

// GET /api/admin/services - Listar servicios
router.get('/services', async (req, res) => {
  try {
    const services = await Service.findAll({
      order: [['nombre', 'ASC']]
    });

    res.json({
      services,
      code: 'SERVICES_RETRIEVED'
    });

  } catch (error) {
    console.error('Error al obtener servicios:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudieron obtener los servicios',
      code: 'INTERNAL_ERROR'
    });
  }
});

// POST /api/admin/services - Crear servicio
router.post('/services', [
  body('nombre').isString().trim().notEmpty().withMessage('Nombre requerido'),
  body('precio_base').isFloat({ min: 0.01 }).withMessage('Precio base válido requerido'),
  body('max_perfiles').isInt({ min: 1, max: 10 }).withMessage('Máximo de perfiles válido'),
  body('descuento_3_meses').isFloat({ min: 0, max: 100 }).withMessage('Descuento 3 meses válido'),
  body('descuento_6_meses').isFloat({ min: 0, max: 100 }).withMessage('Descuento 6 meses válido'),
  body('descuento_12_meses').isFloat({ min: 0, max: 100 }).withMessage('Descuento 12 meses válido'),
  body('descuento_perfil_adicional').isFloat({ min: 0, max: 100 }).withMessage('Descuento perfil válido')
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

    const serviceData = req.body;
    const service = await Service.create(serviceData);

    res.status(201).json({
      message: 'Servicio creado exitosamente',
      service,
      code: 'SERVICE_CREATED'
    });

  } catch (error) {
    console.error('Error al crear servicio:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        error: 'Servicio duplicado',
        message: 'Ya existe un servicio con ese nombre',
        code: 'SERVICE_DUPLICATE'
      });
    }
    
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo crear el servicio',
      code: 'INTERNAL_ERROR'
    });
  }
});

// PUT /api/admin/services/:id - Actualizar servicio
router.put('/services/:id', [
  body('precio_base').optional().isFloat({ min: 0.01 }),
  body('max_perfiles').optional().isInt({ min: 1, max: 10 }),
  body('descuento_3_meses').optional().isFloat({ min: 0, max: 100 }),
  body('descuento_6_meses').optional().isFloat({ min: 0, max: 100 }),
  body('descuento_12_meses').optional().isFloat({ min: 0, max: 100 }),
  body('descuento_perfil_adicional').optional().isFloat({ min: 0, max: 100 })
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
    const updateData = req.body;

    const service = await Service.findByPk(id);
    if (!service) {
      return res.status(404).json({
        error: 'Servicio no encontrado',
        code: 'SERVICE_NOT_FOUND'
      });
    }

    await service.update(updateData);

    res.json({
      message: 'Servicio actualizado exitosamente',
      service,
      code: 'SERVICE_UPDATED'
    });

  } catch (error) {
    console.error('Error al actualizar servicio:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo actualizar el servicio',
      code: 'INTERNAL_ERROR'
    });
  }
});

// ===== GESTIÓN DE CUENTAS =====

// GET /api/admin/accounts - Listar cuentas
router.get('/accounts', async (req, res) => {
  try {
    const accounts = await Account.findAll({
      include: [
        {
          model: Profile,
          as: 'profiles',
          attributes: ['id', 'nombre_perfil', 'estado', 'user_id_asignado', 'fecha_expiracion']
        }
      ],
      order: [['servicio', 'ASC'], ['createdAt', 'DESC']]
    });

    res.json({
      accounts,
      code: 'ACCOUNTS_RETRIEVED'
    });

  } catch (error) {
    console.error('Error al obtener cuentas:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudieron obtener las cuentas',
      code: 'INTERNAL_ERROR'
    });
  }
});

// POST /api/admin/accounts - Crear cuenta
router.post('/accounts', [
  body('servicio').isString().trim().notEmpty().withMessage('Servicio requerido'),
  body('email').isEmail().withMessage('Email válido requerido'),
  body('password').isString().trim().notEmpty().withMessage('Contraseña requerida'),
  body('perfiles_disponibles').isInt({ min: 1, max: 10 }).withMessage('Número de perfiles válido')
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

    const { servicio, email, password, perfiles_disponibles, notas_admin } = req.body;

    // Crear la cuenta
    const account = await Account.create({
      servicio,
      email,
      password,
      perfiles_disponibles,
      notas_admin: notas_admin || ''
    });

    // Crear perfiles para la cuenta
    const profiles = [];
    for (let i = 1; i <= perfiles_disponibles; i++) {
      const profile = await Profile.create({
        account_id: account.id,
        nombre_perfil: `Perfil ${i}`,
        estado: 'libre'
      });
      profiles.push(profile);
    }

    res.status(201).json({
      message: 'Cuenta creada exitosamente',
      account: {
        ...account.toJSON(),
        profiles
      },
      code: 'ACCOUNT_CREATED'
    });

  } catch (error) {
    console.error('Error al crear cuenta:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo crear la cuenta',
      code: 'INTERNAL_ERROR'
    });
  }
});

// ===== FUNCIONES AUXILIARES =====

// Función para asignar perfiles a una orden
async function assignProfilesToOrder(order) {
  try {
    // Buscar perfiles disponibles para el servicio
    const availableProfiles = await Profile.findAll({
      where: {
        estado: 'libre'
      },
      include: [
        {
          model: Account,
          as: 'account',
          where: { servicio: order.servicio }
        }
      ],
      limit: order.perfiles
    });

    if (availableProfiles.length < order.perfiles) {
      throw new Error(`No hay suficientes perfiles disponibles para ${order.servicio}`);
    }

    // Asignar perfiles
    for (let i = 0; i < order.perfiles; i++) {
      const profile = availableProfiles[i];
      await profile.update({
        estado: 'asignado',
        user_id_asignado: order.user_id,
        order_id_asignado: order.id,
        fecha_asignacion: new Date(),
        fecha_expiracion: order.fecha_vencimiento
      });
    }

    return true;
  } catch (error) {
    console.error('Error al asignar perfiles:', error);
    throw error;
  }
}

// Función para obtener credenciales de perfiles
async function getProfileCredentials(orderId) {
  try {
    const profiles = await Profile.findAll({
      where: { order_id_asignado: orderId },
      include: [
        {
          model: Account,
          as: 'account',
          attributes: ['email', 'password']
        }
      ]
    });

    return profiles.map(profile => ({
      profileName: profile.nombre_perfil,
      email: profile.account.email,
      password: profile.account.password,
      expirationDate: profile.fecha_expiracion
    }));
  } catch (error) {
    console.error('Error al obtener credenciales:', error);
    return [];
  }
}

module.exports = router;
