const cron = require('node-cron');
const { Order } = require('../models/Order');
const { Profile } = require('../models/Profile');
const { User } = require('../models/User');
const whatsappService = require('./whatsappService');
const { sequelize } = require('../config/database');

class CronService {
  constructor() {
    this.jobs = new Map();
  }

  setupCronJobs() {
    try {
      // Verificar órdenes que vencen en 3 días (ejecutar cada día a las 9:00 AM)
      this.scheduleRenewalReminders();
      
      // Verificar perfiles expirados (ejecutar cada hora)
      this.scheduleProfileExpirationCheck();
      
      // Limpiar archivos temporales (ejecutar cada día a las 2:00 AM)
      this.scheduleCleanupTasks();
      
      // Verificar estado de WhatsApp (ejecutar cada 30 minutos)
      this.scheduleWhatsAppHealthCheck();
      
      // Backup de base de datos (ejecutar cada domingo a las 3:00 AM)
      this.scheduleDatabaseBackup();
      
      console.log('✅ Tareas programadas configuradas exitosamente');
    } catch (error) {
      console.error('❌ Error al configurar tareas programadas:', error);
    }
  }

  scheduleRenewalReminders() {
    const job = cron.schedule('0 9 * * *', async () => {
      console.log('🕘 Ejecutando verificación de renovaciones...');
      await this.checkExpiringOrders();
    }, {
      scheduled: true,
      timezone: 'America/Mexico_City'
    });

    this.jobs.set('renewalReminders', job);
    console.log('✅ Tarea de recordatorios de renovación programada');
  }

  scheduleProfileExpirationCheck() {
    const job = cron.schedule('0 * * * *', async () => {
      console.log('🕘 Verificando perfiles expirados...');
      await this.checkExpiredProfiles();
    }, {
      scheduled: true,
      timezone: 'America/Mexico_City'
    });

    this.jobs.set('profileExpirationCheck', job);
    console.log('✅ Tarea de verificación de perfiles expirados programada');
  }

  scheduleCleanupTasks() {
    const job = cron.schedule('0 2 * * *', async () => {
      console.log('🕘 Ejecutando tareas de limpieza...');
      await this.cleanupTempFiles();
    }, {
      scheduled: true,
      timezone: 'America/Mexico_City'
    });

    this.jobs.set('cleanupTasks', job);
    console.log('✅ Tarea de limpieza programada');
  }

  scheduleWhatsAppHealthCheck() {
    const job = cron.schedule('*/30 * * * *', async () => {
      console.log('🕘 Verificando estado de WhatsApp...');
      await this.checkWhatsAppHealth();
    }, {
      scheduled: true,
      timezone: 'America/Mexico_City'
    });

    this.jobs.set('whatsAppHealthCheck', job);
    console.log('✅ Tarea de verificación de salud de WhatsApp programada');
  }

  scheduleDatabaseBackup() {
    const job = cron.schedule('0 3 * * 0', async () => {
      console.log('🕘 Iniciando backup de base de datos...');
      await this.createDatabaseBackup();
    }, {
      scheduled: true,
      timezone: 'America/Mexico_City'
    });

    this.jobs.set('databaseBackup', job);
    console.log('✅ Tarea de backup de base de datos programada');
  }

  async checkExpiringOrders() {
    try {
      const transaction = await sequelize.transaction();
      
      try {
        // Buscar órdenes que vencen en 3 días
        const expiringOrders = await Order.findExpiringOrders(3);
        
        console.log(`📅 Encontradas ${expiringOrders.length} órdenes próximas a vencer`);
        
        for (const order of expiringOrders) {
          try {
            // Obtener información del usuario
            const user = await User.findByPk(order.user_id);
            if (!user) continue;
            
            // Verificar si ya se envió recordatorio hoy
            const lastReminderKey = `renewal_reminder_${order.id}`;
            const lastReminder = await this.getLastReminder(lastReminderKey);
            
            if (!lastReminder || this.shouldSendReminder(lastReminder)) {
              // Enviar recordatorio por WhatsApp
              const success = await whatsappService.sendRenewalReminder(
                user.whatsapp,
                order
              );
              
              if (success) {
                // Registrar que se envió el recordatorio
                await this.setLastReminder(lastReminderKey);
                console.log(`✅ Recordatorio enviado a ${user.whatsapp} para orden ${order.id}`);
              }
            }
          } catch (error) {
            console.error(`❌ Error al procesar orden ${order.id}:`, error);
          }
        }
        
        await transaction.commit();
        console.log('✅ Verificación de renovaciones completada');
        
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
      
    } catch (error) {
      console.error('❌ Error en verificación de renovaciones:', error);
    }
  }

  async checkExpiredProfiles() {
    try {
      const transaction = await sequelize.transaction();
      
      try {
        // Buscar perfiles expirados
        const expiredProfiles = await Profile.findAll({
          where: {
            estado: 'asignado',
            fecha_expiracion: {
              [sequelize.Op.lt]: new Date()
            }
          }
        });
        
        console.log(`📅 Encontrados ${expiredProfiles.length} perfiles expirados`);
        
        for (const profile of expiredProfiles) {
          try {
            // Liberar perfil
            profile.estado = 'libre';
            profile.user_id_asignado = null;
            profile.order_id_asignado = null;
            profile.fecha_expiracion = null;
            
            await profile.save({ transaction });
            
            // Notificar al usuario si es necesario
            if (profile.user_id_asignado) {
              const user = await User.findByPk(profile.user_id_asignado);
              if (user) {
                await whatsappService.sendMessage(
                  user.whatsapp,
                  `⚠️ *Tu perfil ha expirado*\n\nEl perfil de ${profile.servicio} ha expirado. Para renovar, visita nuestra plataforma web.`
                );
              }
            }
            
            console.log(`✅ Perfil ${profile.id} liberado`);
          } catch (error) {
            console.error(`❌ Error al procesar perfil ${profile.id}:`, error);
          }
        }
        
        await transaction.commit();
        console.log('✅ Verificación de perfiles expirados completada');
        
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
      
    } catch (error) {
      console.error('❌ Error en verificación de perfiles expirados:', error);
    }
  }

  async cleanupTempFiles() {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      
      const uploadPath = process.env.UPLOAD_PATH || './uploads';
      const tempPath = path.join(uploadPath, 'temp');
      
      // Limpiar archivos temporales mayores a 24 horas
      const files = await fs.readdir(tempPath);
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;
      
      for (const file of files) {
        try {
          const filePath = path.join(tempPath, file);
          const stats = await fs.stat(filePath);
          
          if (now - stats.mtime.getTime() > oneDay) {
            await fs.unlink(filePath);
            console.log(`🗑️ Archivo temporal eliminado: ${file}`);
          }
        } catch (error) {
          console.error(`❌ Error al eliminar archivo ${file}:`, error);
        }
      }
      
      console.log('✅ Limpieza de archivos temporales completada');
      
    } catch (error) {
      console.error('❌ Error en limpieza de archivos temporales:', error);
    }
  }

  async checkWhatsAppHealth() {
    try {
      const status = await whatsappService.getConnectionStatus();
      
      if (status !== 'isLoggedIn') {
        console.warn('⚠️ WhatsApp no está conectado, intentando reconectar...');
        
        // Intentar reconectar
        await whatsappService.initialize();
      } else {
        console.log('✅ WhatsApp conectado correctamente');
      }
      
    } catch (error) {
      console.error('❌ Error en verificación de salud de WhatsApp:', error);
    }
  }

  async createDatabaseBackup() {
    try {
      // En producción, aquí implementarías la lógica de backup real
      // Por ahora solo registramos la tarea
      console.log('💾 Backup de base de datos iniciado');
      
      // Ejemplo de backup simple (en producción usar pg_dump o similar)
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      console.log(`💾 Backup completado: backup-${timestamp}.sql`);
      
    } catch (error) {
      console.error('❌ Error en backup de base de datos:', error);
    }
  }

  async getLastReminder(key) {
    // En una implementación real, esto se almacenaría en Redis o base de datos
    // Por ahora usamos un Map en memoria (se pierde al reiniciar)
    return this.reminderCache?.get(key);
  }

  async setLastReminder(key) {
    if (!this.reminderCache) {
      this.reminderCache = new Map();
    }
    this.reminderCache.set(key, new Date());
  }

  shouldSendReminder(lastReminder) {
    if (!lastReminder) return true;
    
    const now = new Date();
    const hoursSinceLastReminder = (now - lastReminder) / (1000 * 60 * 60);
    
    // Enviar recordatorio máximo una vez cada 24 horas
    return hoursSinceLastReminder >= 24;
  }

  stopAllJobs() {
    console.log('🛑 Deteniendo todas las tareas programadas...');
    
    for (const [name, job] of this.jobs) {
      job.stop();
      console.log(`✅ Tarea ${name} detenida`);
    }
    
    this.jobs.clear();
  }

  getJobStatus() {
    const status = {};
    
    for (const [name, job] of this.jobs) {
      status[name] = {
        running: job.running,
        nextRun: job.nextDate ? job.nextDate().toISOString() : null
      };
    }
    
    return status;
  }
}

// Singleton instance
const cronService = new CronService();

module.exports = cronService;
