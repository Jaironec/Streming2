# 🚀 Streaming System Backend

Backend completo para sistema de streaming con validación OCR, gestión de cuentas y integración WhatsApp.

## 🛠️ Instalación Rápida

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp env.example .env
# Editar .env con tus credenciales de PostgreSQL

# 3. Configurar base de datos
npm run setup

# 4. Iniciar servidor
npm run dev
```

## 📋 Scripts Disponibles

- **`npm run dev`** - Iniciar servidor en modo desarrollo
- **`npm run start`** - Iniciar servidor en producción
- **`npm run setup`** - Configurar base de datos completa
- **`npm run clean`** - Limpiar base de datos
- **`npm run verify`** - Verificar que todo esté funcionando correctamente

## 🗄️ Configuración de Base de Datos

### Opción 1: Configuración Completa (Recomendada)
```bash
npm run setup
```

### Opción 2: Limpieza y Reconfiguración
```bash
npm run clean
npm run setup
```

## 🔐 Credenciales de Prueba

### Usuario Administrador
- **Email**: admin@streamingpro.com
- **Password**: admin123

### Usuario Cliente
- **Email**: test@example.com
- **Password**: test123

## 🌐 Endpoints Principales

- **`/api/auth`** - Autenticación y gestión de usuarios
- **`/api/orders`** - Gestión de pedidos
- **`/api/admin`** - Panel de administración
- **`/api/whatsapp`** - Integración WhatsApp
- **`/health`** - Estado del servidor

## 🔧 Tecnologías

- **Node.js** + **Express**
- **PostgreSQL** + **Sequelize**
- **JWT** para autenticación
- **Tesseract.js** para OCR
- **Venom Bot** para WhatsApp
- **Node-cron** para tareas programadas

## 📁 Estructura del Proyecto

```
src/
├── config/          # Configuración de base de datos
├── middleware/      # Middlewares de autenticación y validación
├── models/          # Modelos de Sequelize
├── routes/          # Rutas de la API
├── services/        # Servicios de negocio
└── server.js        # Archivo principal del servidor
```

## 🚨 Solución de Problemas

### Error de Conexión a Base de Datos
- Verificar que PostgreSQL esté ejecutándose
- Verificar credenciales en `.env`
- Ejecutar `npm run setup`

### Error de Autenticación
- Verificar que JWT_SECRET esté configurado
- Verificar que el usuario exista en la base de datos
- Ejecutar `npm run clean && npm run setup`

## 📞 Soporte

1. Verificar que PostgreSQL esté ejecutándose
2. Verificar las credenciales en `.env`
3. Ejecutar `npm run setup`
4. Revisar logs del servidor

## 🎯 Estado del Proyecto

- ✅ **Base de datos**: Configuración completa funcionando
- ✅ **Autenticación**: Sistema JWT implementado
- ✅ **Modelos**: Todos los modelos funcionando correctamente
- ✅ **API**: Endpoints principales implementados
- ✅ **Seguridad**: Middlewares de autenticación y validación
