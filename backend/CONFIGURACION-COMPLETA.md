# 🚀 GUÍA COMPLETA DE CONFIGURACIÓN - Streaming System

## 📋 **PASOS OBLIGATORIOS PARA CONFIGURAR EL SISTEMA**

### **PASO 1: INSTALAR POSTGRESQL (OBLIGATORIO)**

#### **Opción A: Windows**
1. Descargar PostgreSQL desde: https://www.postgresql.org/download/windows/
2. Instalar con las siguientes configuraciones:
   - Puerto: `5432` (por defecto)
   - Usuario: `postgres`
   - Contraseña: **CREA UNA CONTRASEÑA SEGURA** (la necesitarás)
   - Base de datos: `postgres` (por defecto)

#### **Opción B: macOS**
```bash
# Con Homebrew
brew install postgresql
brew services start postgresql

# Crear usuario
createuser -s postgres
```

#### **Opción C: Linux (Ubuntu/Debian)**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Cambiar a usuario postgres
sudo -u postgres psql

# Crear contraseña
ALTER USER postgres PASSWORD 'TU_CONTRASEÑA_AQUI';
\q
```

### **PASO 2: CREAR LA BASE DE DATOS**

```sql
-- Conectar a PostgreSQL
psql -U postgres -h localhost

-- Crear base de datos
CREATE DATABASE streaming_system;

-- Verificar que se creó
\l

-- Salir
\q
```

### **PASO 3: CONFIGURAR VARIABLES DE ENTORNO**

1. **Copiar el archivo de ejemplo:**
```bash
cd backend
cp env.example .env
```

2. **Editar el archivo `.env` con TUS DATOS:**

```env
# ========================================
# CONFIGURACIÓN OBLIGATORIA DEL SISTEMA
# ========================================

# Server Configuration
PORT=3001
NODE_ENV=development

# ========================================
# BASE DE DATOS - POSTGRESQL (OBLIGATORIO)
# ========================================
DB_HOST=localhost
DB_PORT=5432
DB_NAME=streaming_system
DB_USER=postgres
DB_PASSWORD=TU_CONTRASEÑA_DE_POSTGRESQL_AQUI

# ========================================
# AUTENTICACIÓN JWT (OBLIGATORIO)
# ========================================
JWT_SECRET=GENERA_UNA_CLAVE_SECRETA_FUERTE_AQUI
JWT_EXPIRES_IN=7d

# ========================================
# CONFIGURACIÓN DE ARCHIVOS (OBLIGATORIO)
# ========================================
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760

# ========================================
# WHATSAPP - VENOM BOT (OBLIGATORIO)
# ========================================
WHATSAPP_SESSION_PATH=./whatsapp-sessions

# ========================================
# OCR - TESSERACT (OBLIGATORIO)
# ========================================
TESSERACT_LANG=spa+eng
OCR_CONFIDENCE_THRESHOLD=0.6
OCR_MAX_RETRIES=3
OCR_TIMEOUT=30000
AMOUNT_TOLERANCE=0.01

# ========================================
# RATE LIMITING (OBLIGATORIO)
# ========================================
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# ========================================
# SEGURIDAD (OBLIGATORIO)
# ========================================
BCRYPT_ROUNDS=12
CORS_ORIGIN=http://localhost:3000

# ========================================
# LOGGING (OPCIONAL)
# ========================================
LOG_LEVEL=info

# ========================================
# LÓGICA DE NEGOCIO (OPCIONAL)
# ========================================
VIP_ORDERS_THRESHOLD=10
VIP_SPENDING_THRESHOLD=1000
RENEWAL_REMINDER_DAYS=3
PROFILE_EXPIRATION_CHECK_INTERVAL=3600000
```

### **PASO 4: GENERAR CLAVE SECRETA JWT (OBLIGATORIO)**

#### **Opción A: Con Node.js**
```bash
cd backend
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### **Opción B: Con OpenSSL**
```bash
openssl rand -hex 32
```

#### **Opción C: Online (solo para desarrollo)**
- Ve a: https://generate-secret.vercel.app/32
- Copia la clave generada

**⚠️ IMPORTANTE:** Reemplaza `GENERA_UNA_CLAVE_SECRETA_FUERTE_AQUI` con la clave que generaste.

### **PASO 5: INSTALAR DEPENDENCIAS**

```bash
cd backend
npm install
```

### **PASO 6: CREAR CARPETAS NECESARIAS**

```bash
# En la carpeta backend
mkdir uploads
mkdir whatsapp-sessions
mkdir logs
```

### **PASO 7: CONFIGURAR BASE DE DATOS**

```bash
# Configurar base de datos completa
npm run setup
```

### **PASO 8: VERIFICAR CONFIGURACIÓN**

```bash
# Verificar que todo esté funcionando
npm run verify
```

### **PASO 9: INICIAR EL SISTEMA**

```bash
# Modo desarrollo
npm run dev

# Modo producción
npm start
```

## 🔐 **DATOS QUE DEBES PROPORCIONAR**

### **1. BASE DE DATOS POSTGRESQL (OBLIGATORIO)**
- ✅ **Host**: `localhost` (si está en tu máquina)
- ✅ **Puerto**: `5432` (por defecto)
- ✅ **Nombre de BD**: `streaming_system`
- ✅ **Usuario**: `postgres`
- ✅ **Contraseña**: **LA QUE CREASTE AL INSTALAR POSTGRESQL**

### **2. CLAVE SECRETA JWT (OBLIGATORIO)**
- ✅ **JWT_SECRET**: Clave de 32 caracteres hexadecimales
- ✅ **JWT_EXPIRES_IN**: `7d` (7 días) o el tiempo que prefieras

### **3. CONFIGURACIÓN DE ARCHIVOS (OBLIGATORIO)**
- ✅ **UPLOAD_PATH**: `./uploads` (carpeta para comprobantes)
- ✅ **MAX_FILE_SIZE**: `10485760` (10MB máximo por archivo)

### **4. WHATSAPP (OBLIGATORIO)**
- ✅ **WHATSAPP_SESSION_PATH**: `./whatsapp-sessions`
- ⚠️ **NOTA**: Al iniciar por primera vez, se abrirá un navegador para escanear QR

### **5. OCR (OBLIGATORIO)**
- ✅ **TESSERACT_LANG**: `spa+eng` (español + inglés)
- ✅ **OCR_CONFIDENCE_THRESHOLD**: `0.6` (60% de confianza)
- ✅ **AMOUNT_TOLERANCE**: `0.01` (1 centavo de tolerancia)

## 🚨 **PROBLEMAS COMUNES Y SOLUCIONES**

### **Error: "No se pudo conectar a la base de datos"**
```bash
# Verificar que PostgreSQL esté ejecutándose
# Windows: Servicios > PostgreSQL
# macOS: brew services list
# Linux: sudo systemctl status postgresql

# Verificar credenciales
psql -U postgres -h localhost -d streaming_system
```

### **Error: "JWT_SECRET is not defined"**
```bash
# Verificar que el archivo .env existe
ls -la .env

# Verificar que JWT_SECRET esté definido
cat .env | grep JWT_SECRET
```

### **Error: "Permission denied" en carpetas**
```bash
# Dar permisos a las carpetas
chmod 755 uploads
chmod 755 whatsapp-sessions
chmod 755 logs
```

### **Error: "Tesseract not found"**
```bash
# El sistema descargará Tesseract automáticamente
# Solo asegúrate de tener conexión a internet
```

## 📱 **CONFIGURACIÓN DE WHATSAPP**

### **Primera vez:**
1. Ejecutar `npm run dev`
2. Se abrirá un navegador automáticamente
3. Escanear el código QR con tu WhatsApp
4. Confirmar la conexión

### **Configuración automática:**
- El sistema se reconectará automáticamente
- Las sesiones se guardan en `./whatsapp-sessions`
- No necesitas re-escanear cada vez

## 🔍 **VERIFICACIÓN FINAL**

### **1. Health Check:**
```bash
curl http://localhost:3001/health
```

**Respuesta esperada:**
```json
{
  "status": "OK",
  "database": "Connected",
  "whatsapp": "Connected",
  "cron": "Active"
}
```

### **2. Login de prueba:**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@streamingpro.com","password":"admin123"}'
```

**Respuesta esperada:**
```json
{
  "message": "Login exitoso",
  "user": {...},
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "code": "LOGIN_SUCCESS"
}
```

## 📞 **SOPORTE Y TROUBLESHOOTING**

### **Si algo no funciona:**

1. **Verificar logs:**
```bash
npm run dev
# Revisar los logs en la consola
```

2. **Verificar base de datos:**
```bash
npm run verify
```

3. **Limpiar y reinstalar:**
```bash
npm run clean
npm run setup
npm run verify
npm run dev
```

### **Comandos útiles:**
```bash
# Ver estado del sistema
npm run verify

# Limpiar base de datos
npm run clean

# Reconfigurar todo
npm run clean && npm run setup

# Ver logs en tiempo real
npm run dev
```

## 🎯 **RESUMEN DE LO QUE DEBES HACER:**

1. ✅ **Instalar PostgreSQL** y crear la base de datos
2. ✅ **Crear archivo `.env`** con tus credenciales
3. ✅ **Generar clave JWT** secreta
4. ✅ **Instalar dependencias** con `npm install`
5. ✅ **Crear carpetas** necesarias
6. ✅ **Configurar BD** con `npm run setup`
7. ✅ **Verificar** con `npm run verify`
8. ✅ **Iniciar** con `npm run dev`

## 🚀 **¡LISTO PARA USAR!**

Una vez completados estos pasos, tu sistema estará completamente funcional con:
- ✅ Base de datos configurada
- ✅ Usuarios de prueba creados
- ✅ Servicios de streaming configurados
- ✅ WhatsApp conectado
- ✅ OCR funcionando
- ✅ API completamente operativa

**¿Necesitas ayuda con algún paso específico?**
