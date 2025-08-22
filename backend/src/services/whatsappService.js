const { create, Whatsapp } = require('venom-bot');
const path = require('path');
const fs = require('fs').promises;

class WhatsAppService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.sessionPath = process.env.WHATSAPP_SESSION_PATH || './whatsapp-sessions';
  }

  async initialize() {
    try {
      // Crear directorio de sesiones si no existe
      await this.ensureSessionDirectory();
      
      // Inicializar cliente de WhatsApp
      this.client = await create({
        session: 'streaming-system',
        multidevice: true,
        headless: true,
        useChrome: false,
        debug: process.env.NODE_ENV === 'development',
        logQR: true,
        browserArgs: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });

      // Configurar eventos
      this.setupEvents();
      
      console.log('✅ Servicio de WhatsApp inicializado');
      return true;
    } catch (error) {
      console.error('❌ Error al inicializar WhatsApp:', error);
      return false;
    }
  }

  async ensureSessionDirectory() {
    try {
      await fs.access(this.sessionPath);
    } catch {
      await fs.mkdir(this.sessionPath, { recursive: true });
    }
  }

  setupEvents() {
    if (!this.client) return;

    this.client.onMessage(async (message) => {
      await this.handleIncomingMessage(message);
    });

    this.client.onStateChange((state) => {
      console.log('WhatsApp State:', state);
      this.isConnected = state === 'isLoggedIn';
    });

    this.client.onIncomingCall(async (call) => {
      console.log('Llamada entrante:', call);
      // Rechazar llamadas automáticamente
      await this.client.rejectCall(call.id);
    });
  }

  async handleIncomingMessage(message) {
    try {
      // Solo procesar mensajes de texto
      if (message.type !== 'chat') return;

      const { from, body } = message;
      const lowerBody = body.toLowerCase();

      // Comandos básicos de soporte
      if (lowerBody.includes('ayuda') || lowerBody.includes('help')) {
        await this.sendHelpMessage(from);
      } else if (lowerBody.includes('estado') || lowerBody.includes('status')) {
        await this.sendOrderStatus(from);
      } else if (lowerBody.includes('soporte') || lowerBody.includes('support')) {
        await this.sendSupportMessage(from);
      }
    } catch (error) {
      console.error('Error al procesar mensaje entrante:', error);
    }
  }

  async sendHelpMessage(to) {
    const helpMessage = `🤖 *Sistema de Streaming - Ayuda*

📋 *Comandos disponibles:*
• *ayuda* - Muestra este mensaje
• *estado* - Consulta el estado de tu orden
• *soporte* - Información de contacto para soporte

💡 *Información adicional:*
• Los accesos se envían automáticamente al aprobar tu pago
• Renovaciones se procesan en 24 horas
• Soporte disponible 24/7

¿En qué puedo ayudarte?`;

    await this.sendMessage(to, helpMessage);
  }

  async sendOrderStatus(to) {
    const statusMessage = `📊 *Consulta de Estado*

Para consultar el estado de tu orden, necesito que me proporciones:
• Tu número de orden, o
• Tu email registrado

También puedes consultar directamente en nuestra plataforma web.

¿Tienes alguno de estos datos?`;

    await this.sendMessage(to, statusMessage);
  }

  async sendSupportMessage(to) {
    const supportMessage = `🆘 *Soporte Técnico*

📞 *Contacto directo:*
• WhatsApp: +1234567890
• Email: soporte@streamingpro.com
• Horario: 24/7

🔧 *Problemas comunes:*
• Acceso denegado: Verifica usuario/contraseña
• Perfil bloqueado: Contacta soporte
• Renovación: Procesa en 24 horas

¿Cuál es tu consulta específica?`;

    await this.sendMessage(to, supportMessage);
  }

  async sendAccessCredentials(to, orderData, accountData) {
    try {
      const message = this.formatAccessMessage(orderData, accountData);
      await this.sendMessage(to, message);
      
      console.log(`✅ Accesos enviados a ${to} para orden ${orderData.id}`);
      return true;
    } catch (error) {
      console.error(`❌ Error al enviar accesos a ${to}:`, error);
      return false;
    }
  }

  formatAccessMessage(orderData, accountData) {
    const expirationDate = new Date(orderData.fecha_vencimiento);
    const formattedDate = expirationDate.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return `🎉 *¡Tu orden ha sido aprobada!*

📺 *Servicio:* ${orderData.servicio}
👤 *Perfiles:* ${orderData.perfiles}
📅 *Válido hasta:* ${formattedDate}

🔑 *Credenciales de acceso:*
• *Email:* \`${accountData.email}\`
• *Contraseña:* \`${accountData.password}\`
• *Perfil:* ${accountData.profileName}

📱 *Instrucciones:*
1. Ve a ${this.getServiceUrl(orderData.servicio)}
2. Inicia sesión con las credenciales
3. Selecciona tu perfil asignado
4. ¡Disfruta del contenido!

⚠️ *Importante:*
• No compartas estas credenciales
• Solo usa tu perfil asignado
• Renovación automática disponible

🔄 *Renovar:* Responde "renovar" cuando falten 7 días

¿Necesitas ayuda con algo más?`;

  }

  getServiceUrl(service) {
    const urls = {
      'Netflix': 'netflix.com',
      'Disney+': 'disneyplus.com',
      'HBO Max': 'hbomax.com',
      'Amazon Prime': 'primevideo.com',
      'Paramount+': 'paramountplus.com',
      'Apple TV+': 'tv.apple.com'
    };
    return urls[service] || 'la plataforma correspondiente';
  }

  async sendRenewalReminder(to, orderData) {
    try {
      const daysUntilExp = orderData.daysUntilExpiration();
      const message = `⏰ *Recordatorio de Renovación*

📺 *Servicio:* ${orderData.servicio}
📅 *Vence en:* ${daysUntilExp} día${daysUntilExp !== 1 ? 's' : ''}

🔄 *Renueva ahora y mantén tu acceso sin interrupciones:*
• Precio especial por renovación anticipada
• Proceso automático
• Sin necesidad de nuevo comprobante

💬 *Para renovar:* Responde "renovar" o visita nuestra plataforma web.

¿Te gustaría renovar ahora?`;

      await this.sendMessage(to, message);
      return true;
    } catch (error) {
      console.error(`❌ Error al enviar recordatorio a ${to}:`, error);
      return false;
    }
  }

  async sendPaymentRejected(to, orderData, reason) {
    try {
      const message = `❌ *Pago Rechazado*

📺 *Servicio:* ${orderData.servicio}
💰 *Monto:* $${orderData.monto}
📅 *Fecha:* ${new Date().toLocaleDateString('es-ES')}

🚫 *Motivo:* ${reason}

🔄 *Para resolver:*
1. Verifica que el comprobante sea legible
2. Asegúrate de que el monto coincida
3. Sube un nuevo comprobante en nuestra plataforma

📞 *Soporte:* Si tienes dudas, contacta nuestro equipo.

¿Necesitas ayuda para resolver este problema?`;

      await this.sendMessage(to, message);
      return true;
    } catch (error) {
      console.error(`❌ Error al enviar notificación de rechazo a ${to}:`, error);
      return false;
    }
  }

  async sendMessage(to, message) {
    if (!this.client || !this.isConnected) {
      throw new Error('Cliente de WhatsApp no conectado');
    }

    try {
      await this.client.sendText(to, message);
      return true;
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      throw error;
    }
  }

  async sendImage(to, imagePath, caption = '') {
    if (!this.client || !this.isConnected) {
      throw new Error('Cliente de WhatsApp no conectado');
    }

    try {
      await this.client.sendImage(to, imagePath, 'image', caption);
      return true;
    } catch (error) {
      console.error('Error al enviar imagen:', error);
      throw error;
    }
  }

  async isConnected() {
    return this.isConnected && this.client !== null;
  }

  async getConnectionStatus() {
    if (!this.client) return 'no_initialized';
    
    try {
      const state = await this.client.getState();
      return state;
    } catch (error) {
      return 'error';
    }
  }

  async logout() {
    if (this.client) {
      try {
        await this.client.logout();
        this.isConnected = false;
        console.log('✅ Sesión de WhatsApp cerrada');
      } catch (error) {
        console.error('❌ Error al cerrar sesión:', error);
      }
    }
  }

  async destroy() {
    if (this.client) {
      try {
        await this.logout();
        this.client = null;
        this.isConnected = false;
        console.log('✅ Servicio de WhatsApp destruido');
      } catch (error) {
        console.error('❌ Error al destruir servicio:', error);
      }
    }
  }
}

// Singleton instance
const whatsappService = new WhatsAppService();

module.exports = whatsappService;
