# 🎬 StreamingPro - Sistema de Gestión de Streaming

Sistema completo para la gestión de servicios de streaming con validación OCR, WhatsApp automático y panel de administración.

## 🚀 Características Principales

### ✅ **Frontend (Next.js + TailwindCSS)**
- **Catálogo de servicios** con filtros de perfiles y meses
- **Carrito de compras** con cálculo automático de descuentos
- **Sistema de autenticación** completo (registro, login, logout)
- **Dashboard de usuario** con historial de órdenes
- **Formulario de subida** de comprobantes de pago
- **Panel de administración** para gestión de órdenes

### ✅ **Backend (Node.js + Express)**
- **API REST completa** con autenticación JWT
- **Validación automática OCR** con Tesseract.js
- **Integración WhatsApp** con Venom Bot
- **Tareas programadas** con node-cron
- **Base de datos PostgreSQL** con Sequelize ORM
- **Middleware de seguridad** completo

### ✅ **Funcionalidades del Sistema**
- **Generación automática** de órdenes con ID único
- **Validación OCR** de comprobantes de pago
- **Asignación automática** de perfiles de streaming
- **Notificaciones WhatsApp** automáticas
- **Recordatorios de renovación** programados
- **Backups automáticos** de base de datos

## 🛠️ Tecnologías Utilizadas

| Componente | Tecnología |
|------------|------------|
| **Frontend** | Next.js 14, React 18, TailwindCSS |
| **Backend** | Node.js, Express.js, Sequelize |
| **Base de Datos** | PostgreSQL |
| **OCR** | Tesseract.js |
| **WhatsApp** | Venom Bot |
| **Autenticación** | JWT, bcrypt |
| **Tareas Programadas** | node-cron |
| **Validación** | express-validator |

## 📋 Requisitos del Sistema

### **Software Requerido**
- **Node.js** 18+ y npm
- **PostgreSQL** 12+
- **Tesseract OCR** (para procesamiento de imágenes)
- **Chrome/Chromium** (para WhatsApp Bot)

### **Sistema Operativo**
- ✅ Windows 10/11
- ✅ macOS 10.15+
- ✅ Ubuntu 20.04+ / CentOS 8+

## 🚀 Instalación Rápida

### **1. Clonar el Repositorio**
```bash
git clone <repository-url>
cd Streming2
```

### **2. Configurar Backend**
```bash
cd backend

# Instalar dependencias
npm install

# Crear archivo .env (se crea automáticamente)
# Verificar configuración en .env

# Poblar base de datos con datos de prueba
node seed-database.js

# Iniciar servidor
npm run dev
```

### **3. Configurar Frontend**
```bash
# En otra terminal, desde la raíz del proyecto
npm install

# Iniciar frontend
npm run dev
```

### **4. Acceder al Sistema**
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001/api
- **Health Check:** http://localhost:3001/health

## 🔧 Configuración Detallada

### **Variables de Entorno (.env)**
```bash
# Server Configuration
PORT=3001
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=streaming_system
DB_USER=postgres
DB_PASSWORD=tu_password

# JWT Configuration
JWT_SECRET=tu_jwt_secret
JWT_EXPIRES_IN=7d

# File Upload Configuration
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760

# WhatsApp Configuration
WHATSAPP_SESSION_PATH=./whatsapp-sessions

# OCR Configuration
TESSERACT_LANG=spa+eng

# Security
BCRYPT_ROUNDS=12
CORS_ORIGIN=http://localhost:3000
```

### **Base de Datos PostgreSQL**
```sql
-- Crear base de datos
CREATE DATABASE streaming_system;

-- El sistema creará automáticamente todas las tablas
-- Ejecutar seed-database.js para datos de prueba
```

## 👥 Usuarios de Prueba

### **Administrador**
- **Email:** admin@streamingpro.com
- **Password:** admin123
- **Rol:** Administrador completo

### **Usuario Cliente**
- **Email:** test@example.com
- **Password:** test123
- **Rol:** Cliente estándar

## 📱 Flujo de Uso del Sistema

### **1. Registro e Inicio de Sesión**
```
Usuario → Registro → Login → Dashboard
```

### **2. Creación de Orden**
```
Dashboard → Seleccionar Servicio → Configurar Perfiles/Meses → Crear Orden
```

### **3. Subida de Comprobante**
```
Orden Creada → Subir Comprobante → Validación OCR → Estado Actualizado
```

### **4. Proceso de Aprobación**
```
Admin → Revisar Comprobante + OCR → Aprobar/Rechazar → Asignar Perfil
```

### **5. Entrega de Accesos**
```
Orden Aprobada → Asignación Automática de Perfil → WhatsApp Automático → Cliente Recibe Credenciales
```

## 🔍 Estructura de la Base de Datos

### **Tablas Principales**
- **`users`** - Usuarios del sistema (cliente/admin)
- **`orders`** - Órdenes de servicios
- **`payments`** - Comprobantes de pago y resultados OCR
- **`accounts`** - Cuentas de streaming disponibles
- **`profiles`** - Perfiles individuales por cuenta

### **Relaciones**
```
User (1) → (N) Orders
Order (1) → (1) Payment
Account (1) → (N) Profiles
Profile (N) → (1) User (cuando está asignado)
```

## 🚨 Solución de Problemas

### **Error: "initializeWhatsApp is not a function"**
```bash
# Verificar que el servicio esté correctamente exportado
# El sistema continuará funcionando sin WhatsApp
```

### **Error de Conexión a PostgreSQL**
```bash
# Verificar que PostgreSQL esté ejecutándose
# Verificar credenciales en .env
# Verificar que la base de datos exista
```

### **Error de Dependencias**
```bash
# Reinstalar dependencias
rm -rf node_modules package-lock.json
npm install
```

### **WhatsApp no se Conecta**
```bash
# Verificar que Chrome/Chromium esté instalado
# Verificar permisos de red
# Revisar logs del servidor
```

## 📊 Monitoreo y Mantenimiento

### **Logs del Sistema**
```bash
# Backend logs
tail -f backend/logs/app.log

# WhatsApp logs
tail -f backend/logs/whatsapp.log

# Cron jobs logs
tail -f backend/logs/cron.log
```

### **Backups Automáticos**
- **Frecuencia:** Semanal (domingo 3:00 AM)
- **Ubicación:** `backend/backups/`
- **Retención:** Últimos 4 backups

### **Tareas Programadas (Cron)**
- **Recordatorios de renovación:** Diario 9:00 AM
- **Verificación de perfiles:** Cada hora
- **Limpieza de archivos:** Diario 2:00 AM
- **Monitoreo WhatsApp:** Cada 30 minutos
- **Backup de BD:** Semanal domingo 3:00 AM

## 🔒 Seguridad

### **Medidas Implementadas**
- **Autenticación JWT** con expiración
- **Encriptación bcrypt** para contraseñas
- **Validación de entrada** con express-validator
- **Rate limiting** para prevenir spam
- **CORS configurado** para orígenes específicos
- **Helmet** para headers de seguridad

### **Roles de Usuario**
- **Cliente:** Crear órdenes, subir comprobantes, ver historial
- **Admin:** Gestión completa, aprobar/rechazar, ver estadísticas

## 📈 Escalabilidad

### **Optimizaciones Implementadas**
- **Connection pooling** para PostgreSQL
- **Compresión gzip** para respuestas
- **Caché de recordatorios** para evitar spam
- **Validación OCR** asíncrona
- **Manejo de errores** granular

### **Recomendaciones para Producción**
- **Load balancer** para múltiples instancias
- **Redis** para caché y sesiones
- **CDN** para archivos estáticos
- **Monitoreo** con herramientas como PM2
- **Logs centralizados** con ELK Stack

## 🤝 Contribución

### **Estructura del Proyecto**
```
Streming2/
├── app/                    # Frontend Next.js
│   ├── auth/              # Páginas de autenticación
│   ├── dashboard/         # Dashboard de usuario
│   ├── admin/             # Panel de administración
│   └── orders/            # Gestión de órdenes
├── backend/               # Backend Node.js
│   ├── src/
│   │   ├── models/        # Modelos de base de datos
│   │   ├── routes/        # Rutas de la API
│   │   ├── services/      # Servicios (OCR, WhatsApp, Cron)
│   │   └── middleware/    # Middleware de autenticación
│   └── scripts/           # Scripts de utilidad
└── components/            # Componentes React reutilizables
```

### **Convenciones de Código**
- **ESLint** para linting de JavaScript/TypeScript
- **Prettier** para formateo de código
- **Conventional Commits** para mensajes de commit
- **JSDoc** para documentación de funciones

## 📞 Soporte

### **Canales de Ayuda**
- **Documentación:** Este README
- **Issues:** GitHub Issues
- **WhatsApp:** Integrado en el sistema
- **Logs:** Archivos de log del servidor

### **Comandos de Diagnóstico**
```bash
# Verificar estado del sistema
curl http://localhost:3001/health

# Verificar base de datos
cd backend && node test-db.js

# Verificar dependencias
npm audit

# Verificar logs
tail -f backend/logs/*.log
```

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🎯 Roadmap

### **Versión 1.1 (Próxima)**
- [ ] Panel de analytics avanzado
- [ ] Integración con más servicios de streaming
- [ ] Sistema de referidos
- [ ] API para aplicaciones móviles

### **Versión 1.2 (Futura)**
- [ ] Dashboard en tiempo real
- [ ] Notificaciones push
- [ ] Sistema de tickets de soporte
- [ ] Integración con pasarelas de pago

---

**🎉 ¡Gracias por usar StreamingPro!**

Si tienes alguna pregunta o necesitas ayuda, no dudes en crear un issue o contactarnos.
