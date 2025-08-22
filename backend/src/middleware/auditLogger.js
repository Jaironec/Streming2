const { User, Order, Profile, Payment } = require('../models');
const { sequelize } = require('../config/database');

// ===== SISTEMA DE AUDITORÍA COMPLETO =====

class AuditLogger {
  constructor() {
    this.auditQueue = [];
    this.isProcessing = false;
    this.batchSize = 10;
    this.flushInterval = 5000; // 5 segundos
    
    // Iniciar procesamiento en lote
    this.startBatchProcessing();
  }

  // ===== REGISTRO DE ACCIONES =====

  // Registrar acción de autenticación
  logAuthAction(userId, action, details = {}, ip = null, userAgent = null) {
    this.logAction({
      userId,
      action: `AUTH_${action.toUpperCase()}`,
      resourceType: 'AUTH',
      resourceId: null,
      details: {
        ...details,
        ip,
        userAgent,
        timestamp: new Date()
      }
    });
  }

  // Registrar acción de usuario
  logUserAction(userId, action, resourceId = null, details = {}) {
    this.logAction({
      userId,
      action: `USER_${action.toUpperCase()}`,
      resourceType: 'USER',
      resourceId,
      details: {
        ...details,
        timestamp: new Date()
      }
    });
  }

  // Registrar acción de orden
  logOrderAction(userId, action, orderId, details = {}) {
    this.logAction({
      userId,
      action: `ORDER_${action.toUpperCase()}`,
      resourceType: 'ORDER',
      resourceId: orderId,
      details: {
        ...details,
        timestamp: new Date()
      }
    });
  }

  // Registrar acción de administración
  logAdminAction(adminId, action, resourceType, resourceId = null, details = {}) {
    this.logAction({
      userId: adminId,
      action: `ADMIN_${action.toUpperCase()}`,
      resourceType: resourceType.toUpperCase(),
      resourceId,
      details: {
        ...details,
        timestamp: new Date()
      }
    });
  }

  // Registrar acción del sistema
  logSystemAction(action, details = {}) {
    this.logAction({
      userId: null, // Sistema
      action: `SYSTEM_${action.toUpperCase()}`,
      resourceType: 'SYSTEM',
      resourceId: null,
      details: {
        ...details,
        timestamp: new Date()
      }
    });
  }

  // ===== REGISTRO INTERNO =====

  logAction(auditEntry) {
    try {
      // Agregar información adicional
      const enrichedEntry = {
        ...auditEntry,
        id: this.generateAuditId(),
        createdAt: new Date(),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0'
      };

      // Agregar a la cola
      this.auditQueue.push(enrichedEntry);

      // Si la cola está llena, procesar inmediatamente
      if (this.auditQueue.length >= this.batchSize) {
        this.processBatch();
      }

    } catch (error) {
      console.error('❌ Error al registrar acción de auditoría:', error);
    }
  }

  // ===== PROCESAMIENTO EN LOTE =====

  startBatchProcessing() {
    setInterval(() => {
      if (this.auditQueue.length > 0) {
        this.processBatch();
      }
    }, this.flushInterval);
  }

  async processBatch() {
    if (this.isProcessing || this.auditQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      const batch = this.auditQueue.splice(0, this.batchSize);
      
      // En producción, aquí guardarías en base de datos
      // Por ahora, solo log en consola
      for (const entry of batch) {
        this.logToConsole(entry);
      }

      console.log(`📊 Auditoría: ${batch.length} acciones procesadas`);

    } catch (error) {
      console.error('❌ Error al procesar lote de auditoría:', error);
      
      // Reinsertar en la cola si falla
      this.auditQueue.unshift(...batch);
    } finally {
      this.isProcessing = false;
    }
  }

  // ===== LOGGING EN CONSOLA =====

  logToConsole(auditEntry) {
    const timestamp = auditEntry.createdAt.toISOString();
    const userId = auditEntry.userId || 'SYSTEM';
    const action = auditEntry.action;
    const resource = auditEntry.resourceType;
    const resourceId = auditEntry.resourceId || 'N/A';

    // Emoji según el tipo de acción
    const actionEmoji = this.getActionEmoji(action);
    const resourceEmoji = this.getResourceEmoji(resource);

    console.log(`${actionEmoji} [AUDIT] ${timestamp} - Usuario: ${userId} - Acción: ${action} - Recurso: ${resourceEmoji} ${resource}${resourceId !== 'N/A' ? ` (${resourceId})` : ''}`);

    // Log detallado si hay información adicional
    if (Object.keys(auditEntry.details).length > 0) {
      console.log(`   📋 Detalles:`, auditEntry.details);
    }
  }

  // ===== EMOJIS PARA VISUALIZACIÓN =====

  getActionEmoji(action) {
    const actionMap = {
      'AUTH_LOGIN': '🔑',
      'AUTH_LOGOUT': '🚪',
      'AUTH_REGISTER': '📝',
      'AUTH_PASSWORD_CHANGE': '🔐',
      'USER_PROFILE_UPDATE': '👤',
      'USER_PROFILE_VIEW': '👁️',
      'ORDER_CREATE': '📋',
      'ORDER_UPDATE': '✏️',
      'ORDER_DELETE': '🗑️',
      'ORDER_APPROVE': '✅',
      'ORDER_REJECT': '❌',
      'ORDER_CANCEL': '🚫',
      'ADMIN_DASHBOARD_VIEW': '📊',
      'ADMIN_USER_MANAGE': '👥',
      'ADMIN_ORDER_MANAGE': '📋',
      'SYSTEM_BACKUP': '💾',
      'SYSTEM_CLEANUP': '🧹',
      'SYSTEM_ERROR': '🚨',
      'SYSTEM_STARTUP': '🚀',
      'SYSTEM_SHUTDOWN': '🛑'
    };

    return actionMap[action] || '📝';
  }

  getResourceEmoji(resource) {
    const resourceMap = {
      'AUTH': '🔐',
      'USER': '👤',
      'ORDER': '📋',
      'PROFILE': '👥',
      'PAYMENT': '💳',
      'ACCOUNT': '🏦',
      'SYSTEM': '⚙️',
      'ADMIN': '👨‍💼'
    };

    return resourceMap[resource] || '📄';
  }

  // ===== FUNCIONES DE UTILIDAD =====

  generateAuditId() {
    return `AUDIT_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  // ===== MÉTODOS PÚBLICOS PARA USO EXTERNO =====

  // Obtener estadísticas de auditoría
  getAuditStats() {
    return {
      queueSize: this.auditQueue.length,
      isProcessing: this.isProcessing,
      batchSize: this.batchSize,
      flushInterval: this.flushInterval
    };
  }

  // Limpiar cola de auditoría
  clearQueue() {
    const clearedCount = this.auditQueue.length;
    this.auditQueue = [];
    console.log(`🧹 Cola de auditoría limpiada: ${clearedCount} entradas eliminadas`);
    return clearedCount;
  }

  // Forzar procesamiento inmediato
  async forceProcess() {
    if (this.auditQueue.length > 0) {
      console.log('⚡ Forzando procesamiento de auditoría...');
      await this.processBatch();
    }
  }
}

// ===== MIDDLEWARE DE AUDITORÍA =====

// Middleware para registrar todas las acciones
const auditMiddleware = (action, resourceType = 'GENERAL') => {
  return (req, res, next) => {
    const startTime = Date.now();
    const userId = req.user?.id || 'ANONYMOUS';
    
    // Interceptar la respuesta para logging
    const originalSend = res.send;
    res.send = function(data) {
      const duration = Date.now() - startTime;
      const status = res.statusCode;
      
      // Solo registrar si es exitoso o error del cliente
      if (status < 500) {
        const auditLogger = req.app.locals.auditLogger || global.auditLogger;
        
        if (auditLogger) {
          const details = {
            method: req.method,
            path: req.path,
            status,
            duration,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            query: req.query,
            body: req.body,
            params: req.params
          };

          // Determinar el tipo de recurso basado en la ruta
          let detectedResourceType = resourceType;
          let resourceId = null;

          if (req.params.id) {
            resourceId = req.params.id;
          } else if (req.body.id) {
            resourceId = req.body.id;
          }

          // Detectar tipo de recurso automáticamente
          if (req.path.includes('/orders')) {
            detectedResourceType = 'ORDER';
          } else if (req.path.includes('/users') || req.path.includes('/profile')) {
            detectedResourceType = 'USER';
          } else if (req.path.includes('/admin')) {
            detectedResourceType = 'ADMIN';
          } else if (req.path.includes('/auth')) {
            detectedResourceType = 'AUTH';
          }

          // Registrar la acción
          if (detectedResourceType === 'ORDER') {
            auditLogger.logOrderAction(userId, action, resourceId, details);
          } else if (detectedResourceType === 'USER') {
            auditLogger.logUserAction(userId, action, resourceId, details);
          } else if (detectedResourceType === 'ADMIN') {
            auditLogger.logAdminAction(userId, action, detectedResourceType, resourceId, details);
          } else if (detectedResourceType === 'AUTH') {
            auditLogger.logAuthAction(userId, action, details, req.ip, req.get('User-Agent'));
          } else {
            auditLogger.logAction({
              userId,
              action: `${detectedResourceType}_${action.toUpperCase()}`,
              resourceType: detectedResourceType,
              resourceId,
              details
            });
          }
        }
      }
      
      return originalSend.call(this, data);
    };
    
    next();
  };
};

// Middleware para auditoría automática de rutas
const autoAudit = (req, res, next) => {
  const method = req.method;
  const path = req.path;
  
  // Mapear métodos HTTP a acciones
  const actionMap = {
    'GET': 'VIEW',
    'POST': 'CREATE',
    'PUT': 'UPDATE',
    'PATCH': 'UPDATE',
    'DELETE': 'DELETE'
  };
  
  const action = actionMap[method] || 'ACCESS';
  
  // Aplicar auditoría automática
  auditMiddleware(action)(req, res, next);
};

// ===== INSTANCIA GLOBAL =====

const auditLogger = new AuditLogger();

// Hacer disponible globalmente
global.auditLogger = auditLogger;

// ===== MANEJO DE CIERRE GRACEFUL =====

process.on('SIGTERM', async () => {
  console.log('🛑 Cerrando sistema de auditoría...');
  await auditLogger.forceProcess();
  console.log('✅ Sistema de auditoría cerrado');
});

process.on('SIGINT', async () => {
  console.log('🛑 Cerrando sistema de auditoría...');
  await auditLogger.forceProcess();
  console.log('✅ Sistema de auditoría cerrado');
});

module.exports = {
  AuditLogger,
  auditLogger,
  auditMiddleware,
  autoAudit
};
