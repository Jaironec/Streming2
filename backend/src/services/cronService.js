const cron = require('node-cron');
const { Order } = require('../models/Order');
const { Profile } = require('../models/Profile');
const { User } = require('../models/User');
const whatsappService = require('./whatsappService');
const { sequelize } = require('../config/database');
const fs = require('fs').promises;
const path = require('path');

class CronService {
  constructor() {
    this.jobs = new Map();
    this.isRunning = false;
    this.lastExecution = new Map();
    this.executionStats = new Map();
    this.timezone = process.env.CRON_TIMEZONE || 'America/Guayaquil';
  }

  // ===== CONFIGURACIÓN DE TAREAS PROGRAMADAS =====
  setupCronJobs() {
    try {
      console.log('⏰ Configurando tareas programadas...');
      console.log(`🌍 Zona horaria: ${this.timezone}`);
      
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
      
      // Verificación de salud del sistema (ejecutar cada 15 minutos)
      this.scheduleSystemHealthCheck();
      
      // Limpieza de logs antiguos (ejecutar cada día a las 1:00 AM)
      this.scheduleLogCleanup();
      
      console.log('✅ Tareas programadas configuradas exitosamente');
      console.log(`📊 Total de tareas: ${this.jobs.size}`);
      
      // Mostrar resumen de tareas
      this.showJobSummary();
      
    } catch (error) {
      console.error('❌ Error al configurar tareas programadas:', error);
      throw error;
    }
  }

  // ===== PROGRAMACIÓN DE TAREAS =====

  scheduleRenewalReminders() {
    const job = cron.schedule('0 9 * * *', async () => {
      await this.executeJob('renewalReminders', this.checkExpiringOrders.bind(this));
    }, {
      scheduled: true,
      timezone: this.timezone
    });

    this.jobs.set('renewalReminders', job);
    console.log('✅ Tarea de recordatorios de renovación programada (9:00 AM diario)');
  }

  scheduleProfileExpirationCheck() {
    const job = cron.schedule('0 * * * *', async () => {
      await this.executeJob('profileExpirationCheck', this.checkExpiredProfiles.bind(this));
    }, {
      scheduled: true,
      timezone: this.timezone
    });

    this.jobs.set('profileExpirationCheck', job);
    console.log('✅ Tarea de verificación de perfiles expirados programada (cada hora)');
  }

  scheduleCleanupTasks() {
    const job = cron.schedule('0 2 * * *', async () => {
      await this.executeJob('cleanupTasks', this.cleanupTempFiles.bind(this));
    }, {
      scheduled: true,
      timezone: this.timezone
    });

    this.jobs.set('cleanupTasks', job);
    console.log('✅ Tarea de limpieza programada (2:00 AM diario)');
  }

  scheduleWhatsAppHealthCheck() {
    const job = cron.schedule('*/30 * * * *', async () => {
      await this.executeJob('whatsAppHealthCheck', this.checkWhatsAppHealth.bind(this));
    }, {
      scheduled: true,
      timezone: this.timezone
    });

    this.jobs.set('whatsAppHealthCheck', job);
    console.log('✅ Tarea de verificación de salud de WhatsApp programada (cada 30 minutos)');
  }

  scheduleDatabaseBackup() {
    const job = cron.schedule('0 3 * * 0', async () => {
      await this.executeJob('databaseBackup', this.createDatabaseBackup.bind(this));
    }, {
      scheduled: true,
      timezone: this.timezone
    });

    this.jobs.set('databaseBackup', job);
    console.log('✅ Tarea de backup de base de datos programada (3:00 AM domingos)');
  }

  scheduleSystemHealthCheck() {
    const job = cron.schedule('*/15 * * * *', async () => {
      await this.executeJob('systemHealthCheck', this.checkSystemHealth.bind(this));
    }, {
      scheduled: true,
      timezone: this.timezone
    });

    this.jobs.set('systemHealthCheck', job);
    console.log('✅ Tarea de verificación de salud del sistema programada (cada 15 minutos)');
  }

  scheduleLogCleanup() {
    const job = cron.schedule('0 1 * * *', async () => {
      await this.executeJob('logCleanup', this.cleanupOldLogs.bind(this));
    }, {
      scheduled: true,
      timezone: this.timezone
    });

    this.jobs.set('logCleanup', job);
    console.log('✅ Tarea de limpieza de logs programada (1:00 AM diario)');
  }

  // ===== EJECUCIÓN DE TAREAS CON MANEJO DE ERRORES =====

  async executeJob(jobName, jobFunction) {
    if (this.isRunning) {
      console.log(`⏳ Tarea ${jobName} ya está ejecutándose, saltando...`);
      return;
    }

    const startTime = Date.now();
    this.isRunning = true;
    this.lastExecution.set(jobName, new Date());

    try {
      console.log(`🕘 Ejecutando tarea: ${jobName}`);
      await jobFunction();
      
      const duration = Date.now() - startTime;
      this.updateExecutionStats(jobName, true, duration);
      
      console.log(`✅ Tarea ${jobName} completada exitosamente (${duration}ms)`);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.updateExecutionStats(jobName, false, duration);
      
      console.error(`❌ Error en tarea ${jobName}:`, error.message);
      console.error('Stack trace:', error.stack);
      
      // Notificar error crítico
      await this.notifyJobError(jobName, error);
      
    } finally {
      this.isRunning = false;
    }
  }

  // ===== IMPLEMENTACIÓN DE TAREAS =====

  async checkExpiringOrders() {
    try {
      const expiringOrders = await Order.findExpiringOrders(3);
      
      if (expiringOrders.length === 0) {
        console.log('📋 No hay órdenes próximas a vencer');
        return;
      }

      console.log(`📋 Encontradas ${expiringOrders.length} órdenes próximas a vencer`);
      
      for (const order of expiringOrders) {
        try {
          const user = await User.findByPk(order.user_id);
          if (user && whatsappService.isConnected) {
            await whatsappService.sendRenewalReminder(user.whatsapp, order);
            console.log(`📱 Recordatorio enviado a ${user.email} para orden ${order.id}`);
          }
        } catch (userError) {
          console.error(`❌ Error al enviar recordatorio para orden ${order.id}:`, userError.message);
        }
      }
      
    } catch (error) {
      console.error('❌ Error al verificar órdenes próximas a vencer:', error);
      throw error;
    }
  }

  async checkExpiredProfiles() {
    try {
      const expiredProfiles = await Profile.findAll({
        where: {
          estado: 'asignado',
          fecha_expiracion: {
            [sequelize.Op.lt]: new Date()
          }
        }
      });

      if (expiredProfiles.length === 0) {
        console.log('📋 No hay perfiles expirados');
        return;
      }

      console.log(`📋 Encontrados ${expiredProfiles.length} perfiles expirados`);
      
      for (const profile of expiredProfiles) {
        try {
          profile.estado = 'libre';
          profile.user_id_asignado = null;
          profile.order_id_asignado = null;
          profile.fecha_asignacion = null;
          profile.fecha_expiracion = null;
          await profile.save();
          
          console.log(`✅ Perfil ${profile.id} liberado por expiración`);
        } catch (profileError) {
          console.error(`❌ Error al liberar perfil ${profile.id}:`, profileError.message);
        }
      }
      
    } catch (error) {
      console.error('❌ Error al verificar perfiles expirados:', error);
      throw error;
    }
  }

  async cleanupTempFiles() {
    try {
      const tempDir = path.join(__dirname, '../../uploads/temp');
      
      try {
        const files = await fs.readdir(tempDir);
        let deletedCount = 0;
        
        for (const file of files) {
          const filePath = path.join(tempDir, file);
          const stats = await fs.stat(filePath);
          const fileAge = Date.now() - stats.mtime.getTime();
          
          // Eliminar archivos más antiguos de 24 horas
          if (fileAge > 24 * 60 * 60 * 1000) {
            await fs.unlink(filePath);
            deletedCount++;
          }
        }
        
        console.log(`🗑️  Limpieza completada: ${deletedCount} archivos temporales eliminados`);
        
      } catch (dirError) {
        if (dirError.code === 'ENOENT') {
          console.log('📁 Directorio de archivos temporales no existe, creando...');
          await fs.mkdir(tempDir, { recursive: true });
        } else {
          throw dirError;
        }
      }
      
    } catch (error) {
      console.error('❌ Error en limpieza de archivos temporales:', error);
      throw error;
    }
  }

  async checkWhatsAppHealth() {
    try {
      if (whatsappService.isConnected) {
        console.log('✅ WhatsApp está conectado');
      } else {
        console.log('⚠️  WhatsApp no está conectado, intentando reconectar...');
        try {
          await whatsappService.initialize();
          console.log('✅ WhatsApp reconectado exitosamente');
        } catch (reconnectError) {
          console.error('❌ No se pudo reconectar WhatsApp:', reconnectError.message);
        }
      }
    } catch (error) {
      console.error('❌ Error al verificar salud de WhatsApp:', error);
      throw error;
    }
  }

  async createDatabaseBackup() {
    try {
      const backupDir = path.join(__dirname, '../../backups');
      await fs.mkdir(backupDir, { recursive: true });
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(backupDir, `backup-${timestamp}.sql`);
      
      // Crear backup usando pg_dump (requiere que esté instalado)
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      
      const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'streaming_system',
        username: process.env.DB_USER || 'postgres'
      };
      
      const pgDumpCommand = `pg_dump -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.username} -d ${dbConfig.database} > ${backupFile}`;
      
      await execAsync(pgDumpCommand, {
        env: { ...process.env, PGPASSWORD: process.env.DB_PASSWORD }
      });
      
      console.log(`💾 Backup de base de datos creado: ${backupFile}`);
      
      // Limpiar backups antiguos (mantener solo los últimos 7)
      await this.cleanupOldBackups(backupDir, 7);
      
    } catch (error) {
      console.error('❌ Error al crear backup de base de datos:', error);
      // No lanzar error para no interrumpir otras tareas
    }
  }

  async checkSystemHealth() {
    try {
      const health = {
        timestamp: new Date().toISOString(),
        database: 'unknown',
        whatsapp: 'unknown',
        memory: process.memoryUsage(),
        uptime: process.uptime()
      };

      // Verificar base de datos
      try {
        await sequelize.authenticate();
        health.database = 'connected';
      } catch (dbError) {
        health.database = 'disconnected';
        console.warn('⚠️  Base de datos desconectada durante health check');
      }

      // Verificar WhatsApp
      health.whatsapp = whatsappService.isConnected ? 'connected' : 'disconnected';

      // Log de salud del sistema
      if (health.database === 'disconnected' || health.whatsapp === 'disconnected') {
        console.warn('⚠️  Sistema en estado degradado:', health);
      } else {
        console.log('✅ Sistema saludable:', health);
      }

    } catch (error) {
      console.error('❌ Error en health check del sistema:', error);
      // No lanzar error para no interrumpir otras tareas
    }
  }

  async cleanupOldLogs() {
    try {
      const logDir = path.join(__dirname, '../../logs');
      
      try {
        const files = await fs.readdir(logDir);
        let deletedCount = 0;
        
        for (const file of files) {
          if (file.endsWith('.log')) {
            const filePath = path.join(logDir, file);
            const stats = await fs.stat(filePath);
            const fileAge = Date.now() - stats.mtime.getTime();
            
            // Eliminar logs más antiguos de 30 días
            if (fileAge > 30 * 24 * 60 * 60 * 1000) {
              await fs.unlink(filePath);
              deletedCount++;
            }
          }
        }
        
        console.log(`🗑️  Limpieza de logs completada: ${deletedCount} archivos eliminados`);
        
      } catch (dirError) {
        if (dirError.code === 'ENOENT') {
          console.log('📁 Directorio de logs no existe');
        } else {
          throw dirError;
        }
      }
      
    } catch (error) {
      console.error('❌ Error en limpieza de logs:', error);
      // No lanzar error para no interrumpir otras tareas
    }
  }

  // ===== FUNCIONES DE UTILIDAD =====

  async cleanupOldBackups(backupDir, keepCount) {
    try {
      const files = await fs.readdir(backupDir);
      const backupFiles = files
        .filter(file => file.startsWith('backup-') && file.endsWith('.sql'))
        .map(file => ({
          name: file,
          path: path.join(backupDir, file),
          mtime: fs.stat(path.join(backupDir, file)).then(stats => stats.mtime)
        }));

      if (backupFiles.length <= keepCount) return;

      // Ordenar por fecha de modificación (más reciente primero)
      const sortedFiles = await Promise.all(backupFiles);
      sortedFiles.sort((a, b) => b.mtime - a.mtime);

      // Eliminar archivos antiguos
      const filesToDelete = sortedFiles.slice(keepCount);
      for (const file of filesToDelete) {
        await fs.unlink(file.path);
        console.log(`🗑️  Backup antiguo eliminado: ${file.name}`);
      }
      
    } catch (error) {
      console.error('❌ Error al limpiar backups antiguos:', error);
    }
  }

  updateExecutionStats(jobName, success, duration) {
    if (!this.executionStats.has(jobName)) {
      this.executionStats.set(jobName, {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        totalDuration: 0,
        averageDuration: 0,
        lastSuccess: null,
        lastFailure: null
      });
    }

    const stats = this.executionStats.get(jobName);
    stats.totalExecutions++;
    stats.totalDuration += duration;
    stats.averageDuration = stats.totalDuration / stats.totalExecutions;

    if (success) {
      stats.successfulExecutions++;
      stats.lastSuccess = new Date();
    } else {
      stats.failedExecutions++;
      stats.lastFailure = new Date();
    }
  }

  async notifyJobError(jobName, error) {
    try {
      // Aquí podrías implementar notificaciones por email, Slack, etc.
      console.error(`🚨 NOTIFICACIÓN: Error crítico en tarea ${jobName}:`, error.message);
      
      // Por ahora solo log, pero podrías expandir esto
      if (process.env.NODE_ENV === 'production') {
        // En producción, podrías enviar notificación por email o Slack
        console.error('🚨 Error crítico en producción - considerar notificación externa');
      }
      
    } catch (notifyError) {
      console.error('❌ Error al notificar error de tarea:', notifyError);
    }
  }

  showJobSummary() {
    console.log('\n📊 RESUMEN DE TAREAS PROGRAMADAS:');
    console.log('=' .repeat(50));
    
    const jobDetails = [
      { name: 'renewalReminders', description: 'Recordatorios de renovación', schedule: '9:00 AM diario' },
      { name: 'profileExpirationCheck', description: 'Verificación de perfiles expirados', schedule: 'Cada hora' },
      { name: 'cleanupTasks', description: 'Limpieza de archivos temporales', schedule: '2:00 AM diario' },
      { name: 'whatsAppHealthCheck', description: 'Verificación de salud de WhatsApp', schedule: 'Cada 30 minutos' },
      { name: 'databaseBackup', description: 'Backup de base de datos', schedule: '3:00 AM domingos' },
      { name: 'systemHealthCheck', description: 'Verificación de salud del sistema', schedule: 'Cada 15 minutos' },
      { name: 'logCleanup', description: 'Limpieza de logs antiguos', schedule: '1:00 AM diario' }
    ];

    jobDetails.forEach(job => {
      console.log(`⏰ ${job.name}: ${job.description} (${job.schedule})`);
    });
    
    console.log('=' .repeat(50));
  }

  // ===== CONTROL DE TAREAS =====

  stopAllJobs() {
    console.log('🛑 Deteniendo todas las tareas programadas...');
    
    for (const [jobName, job] of this.jobs) {
      try {
        job.stop();
        console.log(`✅ Tarea ${jobName} detenida`);
      } catch (error) {
        console.error(`❌ Error al detener tarea ${jobName}:`, error.message);
      }
    }
    
    this.jobs.clear();
    console.log('✅ Todas las tareas han sido detenidas');
  }

  getJobStatus() {
    const status = {};
    
    for (const [jobName, job] of this.jobs) {
      status[jobName] = {
        running: job.running,
        lastExecution: this.lastExecution.get(jobName),
        stats: this.executionStats.get(jobName) || {}
      };
    }
    
    return status;
  }

  // ===== LIMPIEZA AL CERRAR =====
  
  async cleanup() {
    try {
      console.log('🧹 Limpiando servicio de cron...');
      this.stopAllJobs();
      console.log('✅ Servicio de cron limpiado');
    } catch (error) {
      console.error('❌ Error al limpiar servicio de cron:', error);
    }
  }
}

// Crear instancia singleton
const cronService = new CronService();

// Manejo de cierre graceful
process.on('SIGTERM', async () => {
  console.log('🛑 Recibida señal SIGTERM, limpiando cron service...');
  await cronService.cleanup();
});

process.on('SIGINT', async () => {
  console.log('🛑 Recibida señal SIGINT, limpiando cron service...');
  await cronService.cleanup();
});

module.exports = cronService;
