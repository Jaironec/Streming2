# 🎬 Sistema de Streaming - StreamingPro

Un sistema completo y moderno para la gestión de cuentas de streaming con validación automática OCR, envío de accesos por WhatsApp y panel de administración.

## ✨ Características Principales

### 🎯 Frontend (Next.js + TailwindCSS)
- **Catálogo de servicios** con filtros por servicio, perfiles y meses
- **Carrito de compras** intuitivo y responsive
- **Formulario de checkout** con validación en tiempo real
- **Subida de comprobantes** de pago
- **Panel de usuario** con historial de compras
- **Diseño moderno** y completamente responsive

### 🔧 Backend (Node.js + Express)
- **API RESTful** con validación de datos
- **Autenticación JWT** con roles de usuario y admin
- **Validación OCR automática** de comprobantes de pago
- **Gestión de cuentas** y perfiles de streaming
- **Envío automático** de accesos por WhatsApp
- **Sistema de notificaciones** y recordatorios

### 🗄️ Base de Datos (PostgreSQL)
- **Modelos optimizados** para streaming
- **Relaciones eficientes** entre usuarios, órdenes y perfiles
- **Manejo de estados** de órdenes y pagos
- **Auditoría completa** de transacciones

### 🤖 Automatización
- **OCR con Tesseract.js** para validación de comprobantes
- **WhatsApp Bot** con Venom para envío automático
- **Tareas programadas** para renovaciones y limpieza
- **Notificaciones automáticas** de vencimiento

## 🚀 Instalación y Configuración

### Prerrequisitos
- Node.js 18+ 
- PostgreSQL 13+
- npm o yarn

### 1. Clonar el repositorio
```bash
git clone https://github.com/tu-usuario/streaming-system.git
cd streaming-system
```

### 2. Instalar dependencias del frontend
```bash
npm install
```

### 3. Instalar dependencias del backend
```bash
cd backend
npm install
```

### 4. Configurar variables de entorno
```bash
# En el directorio backend
cp env.example .env
```

Editar `.env` con tus configuraciones:
```env
# Base de datos
DB_HOST=localhost
DB_PORT=5432
DB_NAME=streaming_system
DB_USER=postgres
DB_PASSWORD=tu_password

# JWT
JWT_SECRET=tu_super_secret_key

# WhatsApp
WHATSAPP_SESSION_PATH=./whatsapp-sessions

# OCR
TESSERACT_LANG=spa+eng
```

### 5. Configurar base de datos
```sql
-- Crear base de datos
CREATE DATABASE streaming_system;

-- El sistema creará las tablas automáticamente
```

### 6. Ejecutar el sistema

#### Frontend (puerto 3000)
```bash
npm run dev
```

#### Backend (puerto 3001)
```bash
cd backend
npm run dev
```

## 📱 Uso del Sistema

### Para Clientes
1. **Navegar al catálogo** de servicios disponibles
2. **Seleccionar plan** (servicio, perfiles, meses)
3. **Agregar al carrito** y proceder al checkout
4. **Completar formulario** con datos personales
5. **Subir comprobante** de pago
6. **Recibir accesos** por WhatsApp en 5-10 minutos

### Para Administradores
1. **Acceder al panel admin** con credenciales de administrador
2. **Revisar órdenes pendientes** y en validación
3. **Validar comprobantes** manualmente si es necesario
4. **Aprobar/rechazar** pagos con un clic
5. **Gestionar cuentas** y perfiles disponibles
6. **Monitorear sistema** y estadísticas

## 🏗️ Arquitectura del Sistema

### Estructura de Directorios
```
streaming-system/
├── app/                    # Frontend Next.js
│   ├── components/        # Componentes React
│   ├── store/            # Estado global (Zustand)
│   └── globals.css       # Estilos globales
├── backend/               # Backend Node.js
│   ├── src/
│   │   ├── config/       # Configuración
│   │   ├── models/       # Modelos de base de datos
│   │   ├── routes/       # Rutas de API
│   │   ├── services/     # Lógica de negocio
│   │   └── middleware/   # Middleware personalizado
│   └── uploads/          # Archivos subidos
└── docs/                 # Documentación
```

### Flujo de Datos
```
Cliente → Frontend → Backend → Base de Datos
   ↓
Comprobante → OCR → Validación → WhatsApp
   ↓
Admin Panel → Gestión → Asignación de Perfiles
```

## 🔐 Seguridad

- **Autenticación JWT** con refresh tokens
- **Encriptación bcrypt** para contraseñas
- **Rate limiting** para prevenir abusos
- **Validación de archivos** y sanitización
- **CORS configurado** para producción
- **Helmet.js** para headers de seguridad

## 📊 API Endpoints

### Autenticación
- `POST /api/auth/register` - Registro de usuario
- `POST /api/auth/login` - Inicio de sesión
- `POST /api/auth/refresh` - Renovar token

### Órdenes
- `POST /api/orders` - Crear nueva orden
- `GET /api/orders` - Listar órdenes del usuario
- `GET /api/orders/:id` - Obtener orden específica
- `PUT /api/orders/:id/upload-proof` - Subir comprobante

### Administración
- `GET /api/admin/orders` - Listar todas las órdenes
- `PUT /api/admin/orders/:id/approve` - Aprobar orden
- `PUT /api/admin/orders/:id/reject` - Rechazar orden
- `GET /api/admin/dashboard` - Estadísticas del sistema

### WhatsApp
- `POST /api/whatsapp/send-access` - Enviar accesos
- `GET /api/whatsapp/status` - Estado de conexión

## 🤖 Servicios Automatizados

### OCR Service
- **Tesseract.js** para extracción de texto
- **Validación automática** de montos y fechas
- **Confianza configurable** para aprobación automática
- **Fallback a validación manual** cuando es necesario

### WhatsApp Service
- **Venom Bot** para automatización
- **Envío automático** de credenciales
- **Recordatorios** de renovación
- **Soporte automático** con comandos básicos

### Cron Service
- **Recordatorios** de vencimiento (3 días antes)
- **Limpieza** de archivos temporales
- **Verificación** de perfiles expirados
- **Backup** automático de base de datos

## 🧪 Testing

```bash
# Frontend
npm run test

# Backend
cd backend
npm test
```

## 📦 Despliegue

### Frontend (Vercel/Netlify)
```bash
npm run build
npm run start
```

### Backend (Docker)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

### Variables de Producción
```env
NODE_ENV=production
DB_HOST=tu_host_produccion
DB_PASSWORD=password_seguro_produccion
JWT_SECRET=secret_muy_largo_y_complejo
CORS_ORIGIN=https://tu-dominio.com
```

## 🔧 Configuración Avanzada

### WhatsApp Bot
1. **Instalar dependencias** del sistema
2. **Configurar Venom Bot** con tu número
3. **Escanear código QR** para autenticación
4. **Configurar respuestas automáticas**

### OCR Personalizado
- **Ajustar patrones** de extracción
- **Configurar idiomas** soportados
- **Personalizar reglas** de validación
- **Optimizar confianza** para tu caso de uso

### Base de Datos
- **Índices optimizados** para consultas frecuentes
- **Particionamiento** para grandes volúmenes
- **Backup automático** con retención configurable
- **Monitoreo** de performance

## 📈 Monitoreo y Logs

- **Morgan** para logs HTTP
- **Winston** para logs de aplicación
- **Métricas** de performance
- **Alertas** automáticas para errores críticos

## 🤝 Contribución

1. **Fork** el proyecto
2. **Crear rama** para tu feature (`git checkout -b feature/AmazingFeature`)
3. **Commit** tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. **Push** a la rama (`git push origin feature/AmazingFeature`)
5. **Abrir Pull Request**

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 🆘 Soporte

- **Documentación**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/tu-usuario/streaming-system/issues)
- **Email**: soporte@streamingpro.com
- **WhatsApp**: +1234567890

## 🙏 Agradecimientos

- **Tesseract.js** por el servicio OCR
- **Venom Bot** por la automatización de WhatsApp
- **TailwindCSS** por el sistema de diseño
- **Next.js** por el framework de React
- **Express.js** por el servidor Node.js

---

**Desarrollado con ❤️ por el equipo de StreamingPro**

*Sistema profesional para gestión de streaming - Simple, Seguro, Automatizado*
# Streming
