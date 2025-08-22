#!/bin/bash

echo "🎬 Instalando Sistema de Streaming - StreamingPro"
echo "=================================================="

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado. Por favor instala Node.js 18+ primero."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js versión 18+ es requerida. Versión actual: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detectado"

# Verificar npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm no está instalado."
    exit 1
fi

echo "✅ npm $(npm -v) detectado"

# Instalar dependencias del frontend
echo ""
echo "📦 Instalando dependencias del frontend..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Dependencias del frontend instaladas"
else
    echo "❌ Error al instalar dependencias del frontend"
    exit 1
fi

# Instalar dependencias del backend
echo ""
echo "🔧 Instalando dependencias del backend..."
cd backend
npm install

if [ $? -eq 0 ]; then
    echo "✅ Dependencias del backend instaladas"
else
    echo "❌ Error al instalar dependencias del backend"
    exit 1
fi

# Crear directorios necesarios
echo ""
echo "📁 Creando directorios necesarios..."
mkdir -p uploads/temp
mkdir -p whatsapp-sessions
mkdir -p logs

echo "✅ Directorios creados"

# Configurar archivo .env
echo ""
echo "⚙️ Configurando variables de entorno..."
if [ ! -f .env ]; then
    cp env.example .env
    echo "✅ Archivo .env creado desde env.example"
    echo "⚠️  IMPORTANTE: Edita el archivo .env con tus configuraciones"
else
    echo "✅ Archivo .env ya existe"
fi

# Volver al directorio raíz
cd ..

echo ""
echo "🎉 ¡Instalación completada exitosamente!"
echo ""
echo "📋 Próximos pasos:"
echo "1. Configura tu base de datos PostgreSQL"
echo "2. Edita backend/.env con tus credenciales"
echo "3. Ejecuta 'npm run dev' para el frontend"
echo "4. Ejecuta 'cd backend && npm run dev' para el backend"
echo ""
echo "🌐 URLs del sistema:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:3001"
echo "   Health:   http://localhost:3001/health"
echo ""
echo "📚 Documentación: README.md"
echo "🆘 Soporte: Revisa el README para más información"
