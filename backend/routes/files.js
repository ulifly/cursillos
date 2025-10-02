const express = require('express');
const fs = require('fs');
const path = require('path');
const File = require('../models/File');
const Course = require('../models/Course');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { uploadFile, handleMulterError, getFileInfo, deleteFile } = require('../middleware/upload');

const router = express.Router();

// @route   POST /api/files/upload
// @desc    Subir archivos (PDFs, documentos)
// @access  Private (Admin)
router.post('/upload', authMiddleware, adminMiddleware, uploadFile.array('files', 10), handleMulterError, async (req, res) => {
  try {
    const { courseId, videoId, titles, descriptions, orders } = req.body;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionaron archivos'
      });
    }

    if (!courseId) {
      // Eliminar archivos si faltan datos
      for (const file of req.files) {
        await deleteFile(file.path);
      }
      return res.status(400).json({
        success: false,
        message: 'ID del curso es requerido'
      });
    }

    // Verificar que el curso existe
    const course = await Course.findById(courseId);
    if (!course) {
      for (const file of req.files) {
        await deleteFile(file.path);
      }
      return res.status(404).json({
        success: false,
        message: 'Curso no encontrado'
      });
    }

    const uploadedFiles = [];

    // Procesar cada archivo
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const fileInfo = getFileInfo(file);

      // Obtener título (puede ser array o string único)
      let title;
      if (Array.isArray(titles)) {
        title = titles[i] || fileInfo.originalName;
      } else {
        title = titles || fileInfo.originalName;
      }

      // Obtener descripción
      let description = '';
      if (Array.isArray(descriptions)) {
        description = descriptions[i] || '';
      } else {
        description = descriptions || '';
      }

      // Obtener orden
      let order = 0;
      if (Array.isArray(orders)) {
        order = parseInt(orders[i]) || 0;
      } else {
        order = parseInt(orders) || 0;
      }

      // Determinar tipo de archivo
      const fileType = File.getFileType(fileInfo.originalName, fileInfo.mimeType);

      // Crear nuevo archivo
      const newFile = new File({
        title,
        description,
        filename: fileInfo.filename,
        originalName: fileInfo.originalName,
        filePath: fileInfo.filePath,
        fileSize: fileInfo.fileSize,
        mimeType: fileInfo.mimeType,
        fileType,
        course: courseId,
        video: videoId || null,
        order,
        uploadedBy: req.user._id
      });

      await newFile.save();
      uploadedFiles.push(newFile);

      // Agregar archivo al curso
      await Course.findByIdAndUpdate(courseId, {
        $addToSet: { files: newFile._id }
      });
    }

    res.status(201).json({
      success: true,
      message: `${uploadedFiles.length} archivo(s) subido(s) exitosamente`,
      files: uploadedFiles.map(file => ({
        id: file._id,
        title: file.title,
        description: file.description,
        originalName: file.originalName,
        fileSize: file.fileSize,
        formattedSize: file.formattedSize,
        fileType: file.fileType,
        mimeType: file.mimeType,
        course: file.course,
        video: file.video,
        order: file.order,
        downloadUrl: file.downloadUrl,
        createdAt: file.createdAt
      }))
    });

  } catch (error) {
    // Eliminar archivos en caso de error
    if (req.files) {
      for (const file of req.files) {
        await deleteFile(file.path);
      }
    }
    console.error('Error subiendo archivos:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor'
    });
  }
});

// @route   GET /api/files/download/:id
// @desc    Descargar archivo
// @access  Private
router.get('/download/:id', authMiddleware, async (req, res) => {
  try {
    const file = await File.findById(req.params.id).populate('course', 'enrolledStudents');
    
    if (!file || !file.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Archivo no encontrado'
      });
    }

    // Verificar que el usuario tiene acceso al curso
    const isEnrolled = file.course.enrolledStudents.some(studentId => 
      studentId.toString() === req.user._id.toString()
    );
    
    const isAdmin = req.user.role === 'admin';

    if (!isEnrolled && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'No tienes acceso a este archivo'
      });
    }

    const filePath = file.filePath;
    
    // Verificar que el archivo existe
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Archivo físico no encontrado'
      });
    }

    // Configurar headers para descarga
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.originalName)}"`);
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Length', file.fileSize);

    // Crear stream y enviar archivo
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    // Incrementar contador de descargas (sin await para no bloquear la descarga)
    File.findByIdAndUpdate(req.params.id, { $inc: { downloads: 1 } }).exec();

  } catch (error) {
    console.error('Error en descarga de archivo:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor'
    });
  }
});

// @route   GET /api/files/course/:courseId
// @desc    Obtener archivos de un curso
// @access  Private
router.get('/course/:courseId', authMiddleware, async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Curso no encontrado'
      });
    }

    // Verificar acceso
    const isEnrolled = course.enrolledStudents.some(studentId => 
      studentId.toString() === req.user._id.toString()
    );
    
    const isAdmin = req.user.role === 'admin';

    if (!isEnrolled && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'No tienes acceso a este curso'
      });
    }

    const files = await File.find({ 
      course: req.params.courseId,
      isActive: true 
    }).populate('video', 'title').sort({ order: 1, createdAt: 1 });

    res.json({
      success: true,
      files: files.map(file => ({
        id: file._id,
        title: file.title,
        description: file.description,
        originalName: file.originalName,
        fileSize: file.fileSize,
        formattedSize: file.formattedSize,
        fileType: file.fileType,
        mimeType: file.mimeType,
        order: file.order,
        downloads: file.downloads,
        downloadUrl: file.downloadUrl,
        video: file.video ? {
          id: file.video._id,
          title: file.video.title
        } : null,
        tags: file.tags,
        createdAt: file.createdAt
      }))
    });

  } catch (error) {
    console.error('Error obteniendo archivos del curso:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor'
    });
  }
});

// @route   GET /api/files/video/:videoId
// @desc    Obtener archivos de un video específico
// @access  Private
router.get('/video/:videoId', authMiddleware, async (req, res) => {
  try {
    const files = await File.find({ 
      video: req.params.videoId,
      isActive: true 
    }).populate('course', 'enrolledStudents').sort({ order: 1, createdAt: 1 });

    if (files.length === 0) {
      return res.json({
        success: true,
        files: []
      });
    }

    // Verificar acceso usando el primer archivo (todos deberían tener el mismo curso)
    const course = files[0].course;
    const isEnrolled = course.enrolledStudents.some(studentId => 
      studentId.toString() === req.user._id.toString()
    );
    
    const isAdmin = req.user.role === 'admin';

    if (!isEnrolled && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'No tienes acceso a estos archivos'
      });
    }

    res.json({
      success: true,
      files: files.map(file => ({
        id: file._id,
        title: file.title,
        description: file.description,
        originalName: file.originalName,
        fileSize: file.fileSize,
        formattedSize: file.formattedSize,
        fileType: file.fileType,
        mimeType: file.mimeType,
        order: file.order,
        downloads: file.downloads,
        downloadUrl: file.downloadUrl,
        tags: file.tags,
        createdAt: file.createdAt
      }))
    });

  } catch (error) {
    console.error('Error obteniendo archivos del video:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor'
    });
  }
});

// @route   GET /api/files/:id
// @desc    Obtener información de un archivo
// @access  Private
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const file = await File.findById(req.params.id)
      .populate('course', 'title enrolledStudents')
      .populate('video', 'title');
    
    if (!file || !file.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Archivo no encontrado'
      });
    }

    // Verificar acceso
    const isEnrolled = file.course.enrolledStudents.some(studentId => 
      studentId.toString() === req.user._id.toString()
    );
    
    const isAdmin = req.user.role === 'admin';

    if (!isEnrolled && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'No tienes acceso a este archivo'
      });
    }

    res.json({
      success: true,
      file: {
        id: file._id,
        title: file.title,
        description: file.description,
        originalName: file.originalName,
        fileSize: file.fileSize,
        formattedSize: file.formattedSize,
        fileType: file.fileType,
        mimeType: file.mimeType,
        order: file.order,
        downloads: file.downloads,
        downloadUrl: file.downloadUrl,
        course: {
          id: file.course._id,
          title: file.course.title
        },
        video: file.video ? {
          id: file.video._id,
          title: file.video.title
        } : null,
        tags: file.tags,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt
      }
    });

  } catch (error) {
    console.error('Error obteniendo archivo:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor'
    });
  }
});

// @route   PUT /api/files/:id
// @desc    Actualizar información de archivo
// @access  Private (Admin)
router.put('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { title, description, order, tags, videoId } = req.body;

    const file = await File.findById(req.params.id);
    
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'Archivo no encontrado'
      });
    }

    // Actualizar campos
    if (title) file.title = title;
    if (description !== undefined) file.description = description;
    if (order !== undefined) file.order = parseInt(order);
    if (tags !== undefined) file.tags = Array.isArray(tags) ? tags : [];
    if (videoId !== undefined) file.video = videoId || null;

    await file.save();

    res.json({
      success: true,
      message: 'Archivo actualizado exitosamente',
      file: {
        id: file._id,
        title: file.title,
        description: file.description,
        order: file.order,
        tags: file.tags,
        video: file.video,
        updatedAt: file.updatedAt
      }
    });

  } catch (error) {
    console.error('Error actualizando archivo:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor'
    });
  }
});

// @route   DELETE /api/files/:id
// @desc    Eliminar archivo
// @access  Private (Admin)
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'Archivo no encontrado'
      });
    }

    // Eliminar archivo del sistema
    try {
      await deleteFile(file.filePath);
    } catch (error) {
      console.warn('No se pudo eliminar el archivo físico:', error.message);
    }

    // Eliminar archivo de la base de datos
    await File.findByIdAndDelete(req.params.id);

    // Eliminar referencia del curso
    await Course.findByIdAndUpdate(file.course, {
      $pull: { files: file._id }
    });

    res.json({
      success: true,
      message: 'Archivo eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando archivo:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor'
    });
  }
});

module.exports = router;