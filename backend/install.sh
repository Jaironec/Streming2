#!/bin/bash

echo "🚀 Instalando Sistema de Streaming con OCR y WhatsApp"
echo "=================================================="

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir con color
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Verificar si Node.js está instalado
if ! command -v node &> /dev/null; then
    print_error "Node.js no está instalado. Por favor instala Node.js 18+ primero."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js versión 18+ es requerida. Versión actual: $(node -v)"
    exit 1
fi

print_status "Node.js $(node -v) detectado"

# Verificar si npm está instalado
if ! command -v npm &> /dev/null; then
    print_error "npm no está instalado. Por favor instala npm primero."
    exit 1
fi

print_status "npm $(npm -v) detectado"

# Verificar si PostgreSQL está instalado
if ! command -v psql &> /dev/null; then
    print_warning "PostgreSQL no está instalado. Por favor instala PostgreSQL primero."
    print_info "En Ubuntu/Debian: sudo apt-get install postgresql postgresql-contrib"
    print_info "En macOS: brew install postgresql"
    print_info "En Windows: Descarga desde https://www.postgresql.org/download/windows/"
    exit 1
fi

print_status "PostgreSQL detectado"

# Crear archivo .env si no existe
if [ ! -f .env ]; then
    print_info "Creando archivo .env..."
    cat > .env << EOF
# Server Configuration
PORT=3001
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=streaming_system
DB_USER=postgres
DB_PASSWORD=2514jajaJAJA
DB_DIALECT=postgres

# JWT Configuration
JWT_SECRET=2fae26c694cee31edd9d0afad302267c
JWT_EXPIRES_IN=7d

# File Upload Configuration
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760

# WhatsApp Configuration (Venom Bot)
WHATSAPP_SESSION_PATH=./whatsapp-sessions

# OCR Configuration
TESSERACT_LANG=spa+eng

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Security
BCRYPT_ROUNDS=12
CORS_ORIGIN=http://localhost:3000

# Logging
LOG_LEVEL=info

# Timezone for cron jobs
CRON_TIMEZONE=America/Mexico_City
EOF
    print_status "Archivo .env creado"
else
    print_info "Archivo .env ya existe"
fi

# Crear directorios necesarios
print_info "Creando directorios necesarios..."
mkdir -p uploads/temp
mkdir -p uploads/comprobantes
mkdir -p whatsapp-sessions
mkdir -p backups
mkdir -p logs

print_status "Directorios creados"

# Instalar dependencias
print_info "Instalando dependencias de Node.js..."
npm install

if [ $? -eq 0 ]; then
    print_status "Dependencias instaladas correctamente"
else
    print_error "Error al instalar dependencias"
    exit 1
fi

# Verificar conexión a la base de datos
print_info "Verificando conexión a la base de datos..."

# Intentar conectar a PostgreSQL
if psql -h localhost -U postgres -d streaming_system -c "\q" 2>/dev/null; then
    print_status "Conexión a la base de datos exitosa"
else
    print_warning "No se pudo conectar a la base de datos"
    print_info "Creando base de datos 'streaming_system'..."
    
    # Crear base de datos si no existe
    if createdb -h localhost -U postgres streaming_system 2>/dev/null; then
        print_status "Base de datos 'streaming_system' creada"
    else
        print_error "No se pudo crear la base de datos"
        print_info "Por favor crea manualmente la base de datos 'streaming_system' en PostgreSQL"
        print_info "Comando: createdb -h localhost -U postgres streaming_system"
    fi
fi

# Verificar si Tesseract está instalado
if ! command -v tesseract &> /dev/null; then
    print_warning "Tesseract OCR no está instalado"
    print_info "Instalando Tesseract OCR..."
    
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        if command -v apt-get &> /dev/null; then
            sudo apt-get update
            sudo apt-get install -y tesseract-ocr tesseract-ocr-spa
        elif command -v yum &> /dev/null; then
            sudo yum install -y tesseract tesseract-langpack-spa
        else
            print_error "No se pudo instalar Tesseract. Instala manualmente."
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            brew install tesseract tesseract-lang
        else
            print_error "Homebrew no está instalado. Instala Tesseract manualmente."
        fi
    else
        print_error "Sistema operativo no soportado. Instala Tesseract manualmente."
    fi
else
    print_status "Tesseract OCR detectado"
fi

# Verificar si Chrome/Chromium está instalado para WhatsApp
if ! command -v google-chrome &> /dev/null && ! command -v chromium-browser &> /dev/null && ! command -v chromium &> /dev/null; then
    print_warning "Chrome/Chromium no está instalado (requerido para WhatsApp)"
    print_info "Instalando Google Chrome..."
    
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if command -v apt-get &> /dev/null; then
            wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
            echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee /etc/apt/sources.list.d/google-chrome.list
            sudo apt-get update
            sudo apt-get install -y google-chrome-stable
        else
            print_error "No se pudo instalar Chrome. Instala manualmente."
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        print_info "En macOS, instala Chrome desde https://www.google.com/chrome/"
    else
        print_error "Sistema operativo no soportado. Instala Chrome manualmente."
    fi
else
    print_status "Chrome/Chromium detectado"
fi

# Crear script de inicio
cat > start.sh << 'EOF'
#!/bin/bash

echo "🚀 Iniciando Sistema de Streaming..."

# Verificar si el archivo .env existe
if [ ! -f .env ]; then
    echo "❌ Archivo .env no encontrado. Ejecuta install.sh primero."
    exit 1
fi

# Cargar variables de entorno
export $(cat .env | grep -v '^#' | xargs)

# Verificar conexión a la base de datos
echo "🔌 Verificando conexión a la base de datos..."
if ! psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "\q" 2>/dev/null; then
    echo "❌ No se puede conectar a la base de datos"
    echo "Verifica que PostgreSQL esté ejecutándose y las credenciales sean correctas"
    exit 1
fi

echo "✅ Base de datos conectada"

# Iniciar servidor
echo "🚀 Iniciando servidor..."
npm run dev
EOF

chmod +x start.sh

# Crear script de producción
cat > start-prod.sh << 'EOF'
#!/bin/bash

echo "🚀 Iniciando Sistema de Streaming en modo producción..."

# Verificar si el archivo .env existe
if [ ! -f .env ]; then
    echo "❌ Archivo .env no encontrado. Ejecuta install.sh primero."
    exit 1
fi

# Cargar variables de entorno
export $(cat .env | grep -v '^#' | xargs)

# Verificar conexión a la base de datos
echo "🔌 Verificando conexión a la base de datos..."
if ! psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "\q" 2>/dev/null; then
    echo "❌ No se puede conectar a la base de datos"
    echo "Verifica que PostgreSQL esté ejecutándose y las credenciales sean correctas"
    exit 1
fi

echo "✅ Base de datos conectada"

# Iniciar servidor en modo producción
echo "🚀 Iniciando servidor en modo producción..."
NODE_ENV=production npm start
EOF

chmod +x start-prod.sh

# Crear script de backup
cat > backup.sh << 'EOF'
#!/bin/bash

echo "💾 Creando backup de la base de datos..."

# Cargar variables de entorno
export $(cat .env | grep -v '^#' | xargs)

# Crear directorio de backups si no existe
mkdir -p backups

# Crear backup con timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="backups/backup_${TIMESTAMP}.sql"

echo "📁 Creando backup: $BACKUP_FILE"

# Crear backup usando pg_dump
PGPASSWORD="$DB_PASSWORD" pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME > $BACKUP_FILE

if [ $? -eq 0 ]; then
    echo "✅ Backup creado exitosamente: $BACKUP_FILE"
    
    # Comprimir backup
    gzip $BACKUP_FILE
    echo "🗜️  Backup comprimido: ${BACKUP_FILE}.gz"
    
    # Mantener solo los últimos 10 backups
    ls -t backups/*.gz | tail -n +11 | xargs -r rm
    echo "🧹 Backups antiguos eliminados"
else
    echo "❌ Error al crear backup"
    exit 1
fi
EOF

chmod +x backup.sh

# Crear script de restore
cat > restore.sh << 'EOF'
#!/bin/bash

if [ $# -eq 0 ]; then
    echo "❌ Uso: ./restore.sh <archivo_backup>"
    echo "Ejemplo: ./restore.sh backups/backup_20231201_143022.sql.gz"
    exit 1
fi

BACKUP_FILE=$1

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Archivo de backup no encontrado: $BACKUP_FILE"
    exit 1
fi

echo "🔄 Restaurando backup: $BACKUP_FILE"

# Cargar variables de entorno
export $(cat .env | grep -v '^#' | xargs)

# Verificar si es un archivo comprimido
if [[ $BACKUP_FILE == *.gz ]]; then
    echo "📁 Descomprimiendo backup..."
    gunzip -c $BACKUP_FILE | PGPASSWORD="$DB_PASSWORD" psql -h $DB_HOST -U $DB_USER -d $DB_NAME
else
    PGPASSWORD="$DB_PASSWORD" psql -h $DB_HOST -U $DB_USER -d $DB_NAME < $BACKUP_FILE
fi

if [ $? -eq 0 ]; then
    echo "✅ Backup restaurado exitosamente"
else
    echo "❌ Error al restaurar backup"
    exit 1
fi
EOF

chmod +x restore.sh

# Crear archivo README
cat > README.md << 'EOF'
# Sistema de Streaming con OCR y WhatsApp

## 🚀 Características

- **Frontend**: Next.js con TailwindCSS
- **Backend**: Node.js con Express
- **Base de datos**: PostgreSQL con Sequelize
- **OCR**: Tesseract.js para validación de comprobantes
- **WhatsApp**: Venom Bot para envío automático de accesos
- **Autenticación**: JWT con roles de usuario y admin
- **Cron Jobs**: Automatización de tareas (renovaciones, limpieza, etc.)

## 📋 Requisitos Previos

- Node.js 18+
- PostgreSQL 12+
- Tesseract OCR
- Google Chrome/Chromium (para WhatsApp)

## 🛠️ Instalación

1. **Clonar el repositorio**
   ```bash
   git clone <url-del-repositorio>
   cd streaming-system/backend
   ```

2. **Ejecutar script de instalación**
   ```bash
   chmod +x install.sh
   ./install.sh
   ```

3. **Configurar base de datos**
   - Asegúrate de que PostgreSQL esté ejecutándose
   - Las credenciales están en el archivo `.env`

## 🚀 Uso

### Desarrollo
```bash
./start.sh
```

### Producción
```bash
./start-prod.sh
```

### Backup de base de datos
```bash
./backup.sh
```

### Restaurar backup
```bash
./restore.sh backups/backup_20231201_143022.sql.gz
```

## 📱 Configuración de WhatsApp

1. Al iniciar por primera vez, se abrirá Chrome
2. Escanea el código QR con tu WhatsApp
3. Confirma la conexión en tu teléfono
4. El bot estará listo para enviar mensajes automáticos

## 🔧 Variables de Entorno

- `DB_HOST`: Host de PostgreSQL (default: localhost)
- `DB_PORT`: Puerto de PostgreSQL (default: 5432)
- `DB_NAME`: Nombre de la base de datos (default: streaming_system)
- `DB_USER`: Usuario de PostgreSQL (default: postgres)
- `DB_PASSWORD`: Contraseña de PostgreSQL
- `JWT_SECRET`: Secreto para JWT
- `WHATSAPP_SESSION_PATH`: Ruta para sesiones de WhatsApp
- `TESSERACT_LANG`: Idioma para OCR (default: spa+eng)

## 📊 Estructura de la Base de Datos

- **users**: Usuarios del sistema (clientes y admins)
- **orders**: Órdenes de servicios de streaming
- **payments**: Comprobantes de pago y resultados OCR
- **accounts**: Cuentas de streaming disponibles
- **profiles**: Perfiles de las cuentas (asignados a usuarios)

## 🔐 Endpoints de la API

### Autenticación
- `POST /api/auth/register` - Registro de usuario
- `POST /api/auth/login` - Login de usuario
- `POST /api/auth/logout` - Logout de usuario
- `GET /api/auth/profile` - Obtener perfil
- `PUT /api/auth/profile` - Actualizar perfil

### Órdenes
- `POST /api/orders` - Crear orden
- `GET /api/orders` - Listar órdenes del usuario
- `GET /api/orders/:id` - Obtener orden específica
- `PUT /api/orders/:id/upload-proof` - Subir comprobante

### Admin
- `GET /api/admin/dashboard` - Dashboard de administración
- `GET /api/admin/orders` - Listar todas las órdenes
- `PUT /api/admin/orders/:id/approve` - Aprobar orden
- `PUT /api/admin/orders/:id/reject` - Rechazar orden

### WhatsApp
- `GET /api/whatsapp/status` - Estado del servicio
- `POST /api/whatsapp/send-message` - Enviar mensaje personalizado
- `POST /api/whatsapp/send-access` - Enviar accesos por WhatsApp

## 🔍 Monitoreo

- **Health Check**: `GET /health`
- **Logs**: Se guardan en el directorio `logs/`
- **Backups**: Automáticos cada domingo a las 3:00 AM

## 🆘 Soporte

Si encuentras problemas:

1. Verifica que PostgreSQL esté ejecutándose
2. Revisa los logs del servidor
3. Asegúrate de que todas las dependencias estén instaladas
4. Verifica la configuración en el archivo `.env`

## 📝 Licencia

MIT License
EOF

print_status "Scripts y documentación creados"

echo ""
echo "🎉 ¡Instalación completada!"
echo ""
echo "📋 Próximos pasos:"
echo "1. Verifica que PostgreSQL esté ejecutándose"
echo "2. Ajusta las credenciales en el archivo .env si es necesario"
echo "3. Ejecuta './start.sh' para iniciar el servidor"
echo "4. Abre http://localhost:3001/health para verificar que funcione"
echo ""
echo "📚 Documentación disponible en README.md"
echo "🔄 Scripts disponibles:"
echo "   - start.sh (desarrollo)"
echo "   - start-prod.sh (producción)"
echo "   - backup.sh (crear backup)"
echo "   - restore.sh (restaurar backup)"
echo ""
echo "🚀 ¡Tu sistema de streaming está listo!"
