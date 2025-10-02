const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Crear directorios si no existen
const ensureDirectoriesExist = () => {
  const dirs = [
    path.join(__dirname, '../uploads'),
    path.join(__dirname, '../uploads/videos'),
    path.join(__dirname, '../uploads/files'),
    path.join(__dirname, '../uploads/thumbnails')
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

ensureDirectoriesExist();

// Configuración de almacenamiento para videos
const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/videos');
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generar nombre único con timestamp y nombre original
    const timestamp = Date.now();
    const originalName = file.originalname.toLowerCase().replace(/\s+/g, '-');
    const extension = path.extname(originalName);
    const nameWithoutExt = path.basename(originalName, extension);
    const uniqueName = `${nameWithoutExt}-${timestamp}${extension}`;
    cb(null, uniqueName);
  }
});

// Configuración de almacenamiento para archivos (PDFs, documentos, etc.)
const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/files');
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const originalName = file.originalname.toLowerCase().replace(/\s+/g, '-');
    const extension = path.extname(originalName);
    const nameWithoutExt = path.basename(originalName, extension);
    const uniqueName = `${nameWithoutExt}-${timestamp}${extension}`;
    cb(null, uniqueName);
  }
});

// Filtro para videos
const videoFileFilter = (req, file, cb) => {
  const allowedVideoTypes = /mp4|mov|avi|mkv|webm|flv|wmv/;
  const extension = allowedVideoTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = /video/.test(file.mimetype);

  if (extension && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos de video (mp4, mov, avi, mkv, webm, flv, wmv)'), false);
  }
};

// Filtro para archivos de documentos
const documentFileFilter = (req, file, cb) => {
  const allowedTypes = /pdf|doc|docx|txt|ppt|pptx|xls|xlsx|zip|rar|7z|jpg|jpeg|png|gif|webp/;
  const extension = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  
  if (extension) {
    return cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido. Solo: PDF, DOC, DOCX, TXT, PPT, PPTX, XLS, XLSX, ZIP, RAR, 7Z, JPG, JPEG, PNG, GIF, WEBP'), false);
  }
};

// Configuración de multer para videos
const uploadVideo = multer({
  storage: videoStorage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB máximo para videos
    files: 1 // Solo un video a la vez
  },
  fileFilter: videoFileFilter
});

// Configuración de multer para archivos de documentos
const uploadFile = multer({
  storage: fileStorage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB máximo para documentos
    files: 10 // Hasta 10 archivos a la vez
  },
  fileFilter: documentFileFilter
});

// Configuración general para cualquier tipo de archivo (con límites más estrictos)
const uploadGeneral = multer({
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB máximo
    files: 5 // Hasta 5 archivos
  }
});

// Middleware para manejar errores de multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          message: 'El archivo es demasiado grande. Límite: 500MB para videos, 50MB para documentos'
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          message: 'Demasiados archivos. Límite: 1 video o 10 documentos por upload'
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          message: 'Campo de archivo inesperado'
        });
      default:
        return res.status(400).json({
          success: false,
          message: 'Error en la subida de archivo: ' + err.message
        });
    }
  } else if (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  next();
};

// Función para obtener información del archivo
const getFileInfo = (file) => {
  return {
    filename: file.filename,
    originalName: file.originalname,
    filePath: file.path,
    fileSize: file.size,
    mimeType: file.mimetype
  };
};

// Función para eliminar archivo del sistema
const deleteFile = (filePath) => {
  return new Promise((resolve, reject) => {
    fs.unlink(filePath, (err) => {
      if (err && err.code !== 'ENOENT') {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

module.exports = {
  uploadVideo,
  uploadFile,
  uploadGeneral,
  handleMulterError,
  getFileInfo,
  deleteFile
};