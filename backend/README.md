# 🎬 Sistema de Streaming - Backend

## 🚀 **DESCRIPCIÓN DEL SISTEMA**

Sistema completo de gestión de servicios de streaming con roles diferenciados:

### **👤 USUARIOS CLIENTES:**
- **Solicitar servicios** de streaming (Netflix, Disney+, HBO Max, etc.)
- **Subir comprobantes** de pago
- **Ver estado** de sus órdenes
- **Cancelar órdenes** pendientes
- **Recibir credenciales** por WhatsApp

### **👨‍💼 ADMINISTRADORES:**
- **Ver todas las solicitudes** del sistema
- **Aprobar/Rechazar** órdenes
- **Dashboard completo** con estadísticas
- **Gestión de cuentas** y perfiles
- **Notificaciones automáticas** por WhatsApp

## 🏗️ **ARQUITECTURA DEL SISTEMA**

### **📊 FLUJO DE TRABAJO:**
```
Cliente → Solicita Servicio → Estado: PENDIENTE
    ↓
Cliente → Sube Comprobante → Estado: VALIDANDO
    ↓
Admin → Revisa → Aprueba/Rechaza → Estado: APROBADO/RECHAZADO
    ↓
Sistema → Asigna Perfiles → Estado: ACTIVO
    ↓
WhatsApp → Envía Credenciales
```

### **🔐 ROLES Y PERMISOS:**
- **`cliente`**: Crear órdenes, subir comprobantes, ver sus órdenes
- **`admin`**: Ver todas las órdenes, aprobar/rechazar, dashboard completo

## 🛠️ **INSTALACIÓN Y CONFIGURACIÓN**

### **📋 REQUISITOS:**
- Node.js 18+
- PostgreSQL 12+
- NPM o Yarn

### **⚡ INSTALACIÓN RÁPIDA:**
```bash
# 1. Instalar dependencias
npm install

# 2. Configuración automática
npm run config

# 3. Verificar configuración
npm run verify

# 4. Iniciar servidor
npm run dev
```

### **🔧 CONFIGURACIÓN MANUAL:**
```bash
# 1. Copiar variables de entorno
cp env.example .env

# 2. Editar .env con tus datos
nano .env

# 3. Configurar base de datos
npm run setup

# 4. Iniciar servidor
npm run dev
```

## 📡 **ENDPOINTS DE LA API**

### **🔐 AUTENTICACIÓN:**
- `POST /api/auth/login` - Login de usuario
- `POST /api/auth/register` - Registro de usuario
- `GET /api/auth/profile` - Perfil del usuario

### **📋 ÓRDENES (CLIENTES):**
- `POST /api/orders` - Crear nueva orden
- `GET /api/orders` - Ver órdenes del usuario
- `GET /api/orders/:id` - Ver orden específica
- `PUT /api/orders/:id/upload-proof` - Subir comprobante
- `PUT /api/orders/:id/cancel` - Cancelar orden

### **👨‍💼 ADMINISTRACIÓN:**
- `GET /api/orders` - Ver todas las órdenes (admin)
- `GET /api/orders/admin/dashboard` - Dashboard completo
- `PUT /api/orders/:id/approve` - Aprobar orden
- `PUT /api/orders/:id/reject` - Rechazar orden

### **🏥 SISTEMA:**
- `GET /health` - Estado del servidor
- `GET /api/admin/dashboard` - Dashboard general

## 🧪 **PRUEBAS DEL SISTEMA**

### **✅ EJECUTAR PRUEBAS COMPLETAS:**
```bash
npm run test-system
```

### **📊 LO QUE PRUEBA:**
1. **Servidor funcionando** ✅
2. **Autenticación** ✅
3. **Roles y permisos** ✅
4. **Admin ve órdenes** ✅
5. **Cliente crea órdenes** ✅
6. **Admin aprueba órdenes** ✅
7. **Dashboard funcionando** ✅

## 🎯 **FUNCIONALIDADES PRINCIPALES**

### **🤖 AUTOMATIZACIÓN:**
- **OCR automático** para validar comprobantes
- **Asignación automática** de perfiles
- **Envío automático** de credenciales por WhatsApp
- **Notificaciones automáticas** de estado

### **📱 INTEGRACIÓN WHATSAPP:**
- **Credenciales automáticas** al aprobar
- **Notificaciones de rechazo** con motivo
- **Recordatorios** de vencimiento
- **Soporte al cliente** automatizado

### **🔍 VALIDACIÓN INTELIGENTE:**
- **Verificación OCR** de comprobantes
- **Validación de montos** automática
- **Detección de fraudes** básica
- **Escala de confianza** configurable

## 📊 **ESTADÍSTICAS Y REPORTES**

### **📈 DASHBOARD ADMIN:**
- **Total de órdenes** por estado
- **Órdenes pendientes** de revisión
- **Órdenes recientes** (últimas 10)
- **Estadísticas** de servicios
- **Métricas** de ingresos

### **📋 REPORTES DISPONIBLES:**
- **Órdenes por servicio** y estado
- **Rendimiento** por período
- **Usuarios más activos**
- **Servicios más populares**

## 🔒 **SEGURIDAD**

### **🛡️ MEDIDAS IMPLEMENTADAS:**
- **JWT tokens** con expiración
- **Rate limiting** por IP y usuario
- **Validación de entrada** estricta
- **Middleware de autenticación** robusto
- **Verificación de roles** en cada endpoint
- **Logs de actividad** completos

### **🔐 AUTENTICACIÓN:**
- **Bcrypt** para hash de contraseñas
- **Bloqueo temporal** por intentos fallidos
- **Sesiones seguras** con JWT
- **Refresh tokens** opcionales

## 🚀 **DESPLIEGUE**

### **🌐 PRODUCCIÓN:**
```bash
# 1. Configurar variables de entorno
NODE_ENV=production
PORT=3001

# 2. Instalar dependencias de producción
npm install --production

# 3. Iniciar servidor
npm start
```

### **🐳 DOCKER:**
```bash
# Construir imagen
docker build -t streaming-backend .

# Ejecutar contenedor
docker run -p 3001:3001 streaming-backend
```

## 📚 **CREDENCIALES DE PRUEBA**

### **👨‍💼 ADMINISTRADOR:**
- **Email**: `admin@streamingpro.com`
- **Contraseña**: `admin123`
- **WhatsApp**: `+593964092002`
- **Rol**: `admin`

### **👤 CLIENTE DE PRUEBA:**
- **Email**: `test@example.com`
- **Contraseña**: `test123`
- **WhatsApp**: `+593964092003`
- **Rol**: `cliente`

## 🔧 **COMANDOS ÚTILES**

### **📊 GESTIÓN DE BASE DE DATOS:**
```bash
npm run setup      # Configurar base de datos
npm run clean      # Limpiar base de datos
npm run verify     # Verificar configuración
```

### **🧪 PRUEBAS Y DIAGNÓSTICO:**
```bash
npm run test-system    # Pruebas completas del sistema
npm run test          # Pruebas unitarias (Jest)
```

### **🔄 DESARROLLO:**
```bash
npm run dev           # Servidor con nodemon
npm start            # Servidor de producción
```

## 📞 **SOPORTE Y CONTACTO**

### **🐛 REPORTAR PROBLEMAS:**
1. **Verificar logs** del servidor
2. **Ejecutar pruebas**: `npm run test-system`
3. **Revisar configuración**: `npm run verify`
4. **Limpiar base de datos**: `npm run clean && npm run setup`

### **📖 DOCUMENTACIÓN ADICIONAL:**
- `CONFIGURACION-COMPLETA.md` - Configuración detallada
- `env.example` - Variables de entorno
- `src/models/` - Modelos de base de datos
- `src/routes/` - Endpoints de la API

## 🎉 **¡SISTEMA LISTO!**

Tu sistema de streaming está completamente configurado y funcional. 

**Próximos pasos:**
1. **Probar el sistema**: `npm run test-system`
2. **Crear frontend** que consuma esta API
3. **Configurar WhatsApp** con tokens reales
4. **Personalizar servicios** según tus necesidades

---

**🎬 ¡Disfruta tu sistema de streaming profesional! 🎬**
