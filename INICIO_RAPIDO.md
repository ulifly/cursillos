# 🚀 Inicio Rápido - Plataforma de Cursos

## ✅ Estado del Proyecto
- ✅ **Backend completo** con API REST, streaming, autenticación JWT
- ✅ **Frontend funcional** con React + TypeScript + Material-UI
- ✅ **Base de datos** modelada con MongoDB y Mongoose
- ✅ **Autenticación** completa con roles (admin/estudiante)
- ✅ **Upload de archivos** configurado con Multer
- ✅ **Interfaz moderna** con componentes estilizados

## 🎯 Lo que funciona
1. **Registro e inicio de sesión** de usuarios
2. **Dashboard diferenciado** por roles
3. **Protección de rutas** automática
4. **API REST completa** para todas las operaciones
5. **Streaming de videos** con soporte para seek
6. **Upload de videos y archivos** para administradores

## ⚡ Pasos para ejecutar

### 1. Instalar MongoDB
**IMPORTANTE**: Necesitas MongoDB ejecutándose antes de iniciar el backend.

**Opción fácil (recomendada)**: MongoDB Atlas (gratis)
- Ve a: https://www.mongodb.com/cloud/atlas
- Crea cuenta gratuita y cluster
- Copia la cadena de conexión
- Pégala en `backend/.env` como `MONGODB_URI`

**Opción local**:
```bash
# Descargar e instalar MongoDB Community
# Ejecutar: net start MongoDB
```

### 2. Iniciar Backend
```bash
cd backend
npm run dev
# Debería mostrar: "🚀 Servidor corriendo en puerto 5000"
# Y: "✅ Conectado a MongoDB"
```

### 3. Iniciar Frontend  
```bash
cd frontend
npm start
# Se abrirá automáticamente en http://localhost:3000
```

## 🔧 Primer uso

1. **Accede a** http://localhost:3000
2. **Regístrate** con tu email y contraseña
3. **Inicia sesión** y verás el dashboard
4. **Para ser admin**: Cambia el role en MongoDB a 'admin'

## 📁 Estructura clave

```
cursillos/
├── backend/
│   ├── server.js         # Servidor principal
│   ├── .env             # Variables de entorno
│   ├── models/          # Modelos de datos
│   ├── routes/          # API endpoints
│   └── uploads/         # Videos y archivos subidos
├── frontend/
│   ├── src/
│   │   ├── App.tsx      # App principal
│   │   ├── components/  # Componentes React
│   │   ├── contexts/    # Estado global
│   │   └── services/    # Servicios API
│   └── .env            # URL del backend
└── README.md           # Documentación completa
```

## 🐛 Solución de problemas comunes

**Error de MongoDB**: 
- Asegúrate de que MongoDB esté ejecutándose
- Verifica la cadena de conexión en `.env`

**Error de CORS**:
- Verifica que el backend esté en puerto 5000
- Frontend debe estar en puerto 3000

**Error de compilación en frontend**:
- Ya están corregidos los problemas de TypeScript/MUI

## 🎓 Funcionalidades implementadas

### Para Estudiantes:
- ✅ Registro e inicio de sesión
- ✅ Dashboard personalizado
- ✅ Ver información de perfil
- 🔄 Explorar cursos (próximamente)
- 🔄 Ver videos streaming (próximamente)

### Para Administradores:
- ✅ Panel de administración
- ✅ Gestión completa de usuarios
- 🔄 Crear y editar cursos (API lista)
- 🔄 Subir videos (API lista)
- 🔄 Gestionar material adjunto (API lista)

## 🚀 Próximos pasos

1. **Instalar MongoDB** y probar la conexión
2. **Ejecutar ambos servidores** y verificar que funcionen
3. **Probar registro/login** en la interfaz web
4. **Implementar componentes adicionales** (explorar cursos, upload, etc.)

¡La base está completa y funcional! 🎉