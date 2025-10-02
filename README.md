# 🎓 Plataforma de Cursos con Streaming de Videos

Una aplicación completa para gestionar y transmitir cursos en línea con videos y material adjunto (PDFs, documentos). Los administradores pueden subir videos y organizar material educativo, mientras que los estudiantes pueden ver los cursos y descargar recursos.

## 🚀 Características

### 🔐 Autenticación y Autorización
- **Login/Registro** con email y contraseña
- **JWT** para autenticación segura
- **Roles de usuario**: Administrador y Estudiante
- **Protección de rutas** según roles

### 📹 Gestión de Videos
- **Streaming eficiente** de videos con soporte para seek
- **Upload de videos** (solo administradores)
- **Organización por orden** dentro de cursos
- **Thumbnails** y metadatos
- **Contador de visualizaciones**

### 📚 Gestión de Cursos
- **Creación y edición** de cursos (admin)
- **Categorización y niveles** (principiante, intermedio, avanzado)
- **Sistema de inscripción** para estudiantes
- **Información detallada** con requisitos y objetivos

### 📄 Material Adjunto
- **Upload de archivos** (PDF, DOC, PPT, Excel, imágenes, etc.)
- **Asociación con videos** específicos o cursos generales
- **Descarga segura** para usuarios inscritos
- **Organización por orden**

### 👥 Gestión de Usuarios
- **Panel de administración** para gestionar usuarios
- **Estadísticas** de usuarios y actividad
- **Cambio de roles** y estado de cuentas

## 🛠️ Tecnologías Utilizadas

### Backend
- **Node.js** con Express
- **MongoDB** con Mongoose
- **JWT** para autenticación
- **Multer** para upload de archivos
- **bcryptjs** para hash de contraseñas
- **CORS** para permitir requests del frontend

### Frontend
- **React 18** con TypeScript
- **Material-UI (MUI)** para componentes
- **React Router** para navegación
- **Axios** para peticiones HTTP
- **Context API** para estado global

## 📦 Instalación y Configuración

### Prerrequisitos
- Node.js (v16 o superior)
- MongoDB (local o en la nube)
- npm o yarn

### 1. Clonar el repositorio
```bash
git clone <url-del-repositorio>
cd cursillos
```

### 2. Configurar el Backend
```bash
cd backend
npm install

# Configurar variables de entorno
# Editar el archivo .env con tus configuraciones:
# MONGODB_URI=mongodb://localhost:27017/cursos-streaming
# JWT_SECRET=tu_jwt_secret_super_seguro_aqui
# PORT=5000
```

### 3. Configurar el Frontend
```bash
cd ../frontend
npm install

# El archivo .env ya está configurado con:
# REACT_APP_API_URL=http://localhost:5000/api
```

## 🚀 Ejecución

### 1. Iniciar MongoDB

**Opción A: MongoDB Local (Windows)**
```bash
# Instalar MongoDB Community desde: https://www.mongodb.com/try/download/community
# Después de instalar, ejecutar:
net start MongoDB
# O si está instalado como aplicación:
"C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe" --dbpath "C:\data\db"
```

**Opción B: MongoDB Atlas (Nube - Recomendado)**
1. Crear cuenta gratuita en https://www.mongodb.com/cloud/atlas
2. Crear un cluster gratuito
3. Obtener la cadena de conexión
4. Actualizar `MONGODB_URI` en el archivo `.env` del backend

### 2. Iniciar el Backend
```bash
cd backend
npm run dev
# El servidor estará disponible en http://localhost:5000
```

### 3. Iniciar el Frontend
```bash
cd frontend
npm start
# La aplicación estará disponible en http://localhost:3000
```

## 📋 Estructura del Proyecto

```
cursillos/
├── backend/
│   ├── models/           # Modelos de MongoDB (User, Course, Video, File)
│   ├── routes/           # Rutas de la API
│   │   ├── auth.js       # Autenticación
│   │   ├── courses.js    # Gestión de cursos
│   │   ├── videos.js     # Streaming y gestión de videos
│   │   ├── files.js      # Upload y descarga de archivos
│   │   └── users.js      # Gestión de usuarios
│   ├── middleware/       # Middlewares personalizados
│   │   ├── auth.js       # Autenticación JWT
│   │   └── upload.js     # Multer para upload de archivos
│   ├── uploads/          # Archivos subidos (videos y documentos)
│   └── server.js         # Archivo principal del servidor
├── frontend/
│   ├── src/
│   │   ├── components/   # Componentes React
│   │   │   └── auth/     # Componentes de autenticación
│   │   ├── contexts/     # Context API (AuthContext)
│   │   ├── services/     # Servicios de API (axios)
│   │   ├── types/        # Tipos TypeScript
│   │   └── App.tsx       # Componente principal
│   └── public/           # Archivos estáticos
└── README.md
```

## 🔑 Uso de la Aplicación

### Para Administradores
1. **Registrarse** con role 'admin' o cambiar role desde la base de datos
2. **Crear cursos** con título, descripción, categoría, etc.
3. **Subir videos** asociándolos a cursos específicos
4. **Subir material adjunto** (PDFs, documentos)
5. **Gestionar usuarios** y sus roles

### Para Estudiantes
1. **Registrarse** como estudiante (role por defecto)
2. **Explorar cursos** disponibles
3. **Inscribirse en cursos** de interés
4. **Ver videos** con streaming fluido
5. **Descargar material** adjunto de cursos inscritos

## 🔐 API Endpoints

### Autenticación
- `POST /api/auth/register` - Registro de usuario
- `POST /api/auth/login` - Inicio de sesión
- `GET /api/auth/me` - Obtener usuario actual
- `PUT /api/auth/profile` - Actualizar perfil

### Cursos
- `GET /api/courses` - Obtener todos los cursos
- `POST /api/courses` - Crear curso (admin)
- `GET /api/courses/:id` - Obtener curso específico
- `POST /api/courses/:id/enroll` - Inscribirse en curso

### Videos
- `POST /api/videos/upload` - Subir video (admin)
- `GET /api/videos/stream/:id` - Streaming de video
- `GET /api/videos/course/:courseId` - Videos de un curso

### Archivos
- `POST /api/files/upload` - Subir archivos (admin)
- `GET /api/files/download/:id` - Descargar archivo
- `GET /api/files/course/:courseId` - Archivos de un curso

## 🎨 Características de UI/UX

- **Diseño responsive** con Material-UI
- **Tema personalizable** con colores corporativos
- **Interfaz intuitiva** para administradores y estudiantes
- **Feedback visual** con alertas y loading states
- **Protección de rutas** automática según autenticación

## 🔒 Seguridad

- **Hash de contraseñas** con bcrypt
- **Tokens JWT** con expiración
- **Validación de archivos** por tipo y tamaño
- **Autorización por roles** en todas las operaciones
- **Sanitización de datos** de entrada

## 🚀 Próximas Características

- [ ] **Sistema de pagos** para cursos premium
- [ ] **Comentarios y calificaciones** de cursos
- [ ] **Progreso de video** guardado por usuario
- [ ] **Certificados** de finalización
- [ ] **Búsqueda avanzada** con filtros
- [ ] **Notificaciones** en tiempo real
- [ ] **Chat en vivo** para soporte

## 🤝 Contribución

1. Fork el proyecto
2. Crea tu feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE.md](LICENSE.md) para detalles.

## 👨‍💻 Desarrollado por

Este proyecto fue desarrollado como una solución completa para streaming de cursos educativos, implementando las mejores prácticas en desarrollo web fullstack.

---

¿Necesitas ayuda? Abre un issue o contacta al equipo de desarrollo.