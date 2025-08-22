# 🗄️ Configuración de Base de Datos - Streaming System

## 🚨 Problemas Identificados y Solucionados

### 1. Error de Usuario Duplicado
- **Problema**: El script `seed-database.js` fallaba porque intentaba crear usuarios que ya existían
- **Solución**: Modificado para verificar si los usuarios ya existen antes de crearlos

### 2. Error de Sintaxis en Modelo Order
- **Problema**: La asociación entre `Order` y `Service` causaba errores de sincronización
- **Solución**: Comentada temporalmente la asociación problemática

### 3. Conflictos de Sincronización
- **Problema**: Sequelize intentaba crear tablas con constraints que causaban errores
- **Solución**: Creado script de configuración completa que maneja todo correctamente

## 🛠️ Scripts Disponibles

### Scripts Principales
```bash
# Configuración completa (RECOMENDADO)
npm run setup

# Limpiar base de datos
npm run clean

# Poblar solo servicios
npm run seed-services

# Poblar solo usuarios y cuentas
npm run seed-database

# Iniciar servidor en modo desarrollo
npm run dev
```

## 📋 Pasos para Solucionar los Problemas

### Opción 1: Configuración Completa (Recomendada)
```bash
# 1. Ejecutar configuración completa
npm run setup

# 2. Verificar que todo funciona
npm run dev
```

### Opción 2: Limpieza y Reconstrucción Manual
```bash
# 1. Limpiar base de datos
npm run clean

# 2. Poblar servicios
npm run seed-services

# 3. Poblar usuarios y cuentas
npm run seed-database

# 4. Iniciar servidor
npm run dev
```

## 🔧 Detalles Técnicos

### Cambios Realizados

1. **seed-database.js**: Agregada verificación de usuarios existentes
2. **models/index.js**: Comentada asociación problemática Order-Service
3. **setup-database.js**: Script completo de configuración
4. **clean-database.js**: Script de limpieza de base de datos
5. **package.json**: Agregados scripts útiles

### Estructura de Base de Datos

- **users**: Usuarios del sistema (admin, clientes)
- **services**: Servicios de streaming disponibles
- **accounts**: Cuentas de streaming con perfiles
- **profiles**: Perfiles individuales de cada cuenta
- **orders**: Pedidos de los usuarios
- **payments**: Pagos y validaciones

## 🚀 Inicio Rápido

```bash
# Clonar repositorio
git clone <tu-repo>
cd backend

# Instalar dependencias
npm install

# Configurar variables de entorno
cp env.example .env
# Editar .env con tus credenciales de PostgreSQL

# Configurar base de datos
npm run setup

# Iniciar servidor
npm run dev
```

## 📊 Credenciales de Prueba

### Usuario Administrador
- **Email**: admin@streamingpro.com
- **Password**: admin123
- **Rol**: admin

### Usuario Cliente
- **Email**: test@example.com
- **Password**: test123
- **Rol**: cliente

### Cuentas de Streaming
- **Netflix**: netflix1@streamingpro.com / password1
- **Disney+**: disney1@streamingpro.com / password1
- **HBO Max**: hbomax1@streamingpro.com / password1
- **Amazon Prime**: amazonprime1@streamingpro.com / password1
- **Paramount+**: paramount1@streamingpro.com / password1
- **Apple TV+**: appletv1@streamingpro.com / password1

## 🐛 Solución de Problemas

### Error: "llave duplicada viola restricción de unicidad"
```bash
npm run clean
npm run setup
```

### Error: "error de sintaxis en o cerca de «ON»"
```bash
npm run clean
npm run setup
```

### Error: "Conexión a la base de datos perdida"
- Verificar que PostgreSQL esté ejecutándose
- Verificar credenciales en `.env`
- Verificar que la base de datos `streaming_system` exista

## 📞 Soporte

Si encuentras problemas adicionales:

1. Verifica que PostgreSQL esté ejecutándose
2. Verifica las credenciales en tu archivo `.env`
3. Ejecuta `npm run clean` seguido de `npm run setup`
4. Revisa los logs del servidor para errores específicos

## 🔄 Actualizaciones Futuras

- La asociación Order-Service será restaurada una vez que se resuelvan los problemas de sincronización
- Se implementará un sistema de migraciones más robusto
- Se agregará validación de integridad referencial mejorada
