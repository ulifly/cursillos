const express = require('express');
const fs = require('fs');
const path = require('path');
const Video = require('../models/Video');
const Course = require('../models/Course');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { uploadVideo, handleMulterError, getFileInfo, deleteFile } = require('../middleware/upload');

const router = express.Router();

// @route   POST /api/videos/upload
// @desc    Subir video
// @access  Private (Admin)
router.post('/upload', authMiddleware, adminMiddleware, uploadVideo.single('video'), handleMulterError, async (req, res) => {
  try {
    const { title, description, courseId, order = 0 } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionó archivo de video'
      });
    }

    if (!title || !courseId) {
      // Eliminar archivo si faltan datos
      await deleteFile(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'Título y curso son requeridos'
      });
    }

    // Verificar que el curso existe
    const course = await Course.findById(courseId);
    if (!course) {
      await deleteFile(req.file.path);
      return res.status(404).json({
        success: false,
        message: 'Curso no encontrado'
      });
    }

    const fileInfo = getFileInfo(req.file);

    // Crear nuevo video
    const video = new Video({
      title,
      description: description || '',
      filename: fileInfo.filename,
      originalName: fileInfo.originalName,
      filePath: fileInfo.filePath,
      fileSize: fileInfo.fileSize,
      mimeType: fileInfo.mimeType,
      course: courseId,
      order: parseInt(order) || 0,
      uploadedBy: req.user._id
    });

    await video.save();

    // Agregar video al curso
    await Course.findByIdAndUpdate(courseId, {
      $addToSet: { videos: video._id }
    });

    res.status(201).json({
      success: true,
      message: 'Video subido exitosamente',
      video: {
        id: video._id,
        title: video.title,
        description: video.description,
        filename: video.filename,
        originalName: video.originalName,
        fileSize: video.fileSize,
        formattedSize: video.formattedSize,
        mimeType: video.mimeType,
        course: video.course,
        order: video.order,
        videoUrl: video.videoUrl,
        createdAt: video.createdAt
      }
    });

  } catch (error) {
    // Eliminar archivo en caso de error
    if (req.file) {
      await deleteFile(req.file.path);
    }
    console.error('Error subiendo video:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor'
    });
  }
});

// @route   GET /api/videos/stream/:id
// @desc    Streaming de video
// @access  Private
router.get('/stream/:id', authMiddleware, async (req, res) => {
  try {
    const video = await Video.findById(req.params.id).populate('course', 'title enrolledStudents');
    
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video no encontrado'
      });
    }

    // Verificar que el usuario tiene acceso al curso
    const isEnrolled = video.course.enrolledStudents.some(studentId => 
      studentId.toString() === req.user._id.toString()
    );
    
    const isAdmin = req.user.role === 'admin';

    if (!isEnrolled && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'No tienes acceso a este video'
      });
    }

    const videoPath = video.filePath;
    
    // Verificar que el archivo existe
    if (!fs.existsSync(videoPath)) {
      return res.status(404).json({
        success: false,
        message: 'Archivo de video no encontrado'
      });
    }

    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      // Streaming con ranges para permitir seek
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(videoPath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': video.mimeType || 'video/mp4',
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      // Sin ranges
      const head = {
        'Content-Length': fileSize,
        'Content-Type': video.mimeType || 'video/mp4',
      };
      res.writeHead(200, head);
      fs.createReadStream(videoPath).pipe(res);
    }

    // Incrementar contador de vistas (sin await para no bloquear el streaming)
    Video.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } }).exec();

  } catch (error) {
    console.error('Error en streaming de video:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor'
    });
  }
});

// @route   GET /api/videos/course/:courseId
// @desc    Obtener videos de un curso
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

    const videos = await Video.find({ 
      course: req.params.courseId,
      isActive: true 
    }).sort({ order: 1, createdAt: 1 });

    res.json({
      success: true,
      videos: videos.map(video => ({
        id: video._id,
        title: video.title,
        description: video.description,
        order: video.order,
        duration: video.duration,
        formattedDuration: video.formattedDuration,
        thumbnail: video.thumbnail,
        videoUrl: video.videoUrl,
        views: video.views,
        createdAt: video.createdAt
      }))
    });

  } catch (error) {
    console.error('Error obteniendo videos del curso:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor'
    });
  }
});

// @route   GET /api/videos/:id
// @desc    Obtener información de un video
// @access  Private
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const video = await Video.findById(req.params.id).populate('course', 'title enrolledStudents');
    
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video no encontrado'
      });
    }

    // Verificar acceso
    const isEnrolled = video.course.enrolledStudents.some(studentId => 
      studentId.toString() === req.user._id.toString()
    );
    
    const isAdmin = req.user.role === 'admin';

    if (!isEnrolled && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'No tienes acceso a este video'
      });
    }

    res.json({
      success: true,
      video: {
        id: video._id,
        title: video.title,
        description: video.description,
        order: video.order,
        duration: video.duration,
        formattedDuration: video.formattedDuration,
        fileSize: video.fileSize,
        formattedSize: video.formattedSize,
        thumbnail: video.thumbnail,
        videoUrl: video.videoUrl,
        views: video.views,
        course: {
          id: video.course._id,
          title: video.course.title
        },
        createdAt: video.createdAt,
        updatedAt: video.updatedAt
      }
    });

  } catch (error) {
    console.error('Error obteniendo video:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor'
    });
  }
});

// @route   PUT /api/videos/:id
// @desc    Actualizar información de video
// @access  Private (Admin)
router.put('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { title, description, order, thumbnail } = req.body;

    const video = await Video.findById(req.params.id);
    
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video no encontrado'
      });
    }

    // Actualizar campos
    if (title) video.title = title;
    if (description !== undefined) video.description = description;
    if (order !== undefined) video.order = parseInt(order);
    if (thumbnail !== undefined) video.thumbnail = thumbnail;

    await video.save();

    res.json({
      success: true,
      message: 'Video actualizado exitosamente',
      video: {
        id: video._id,
        title: video.title,
        description: video.description,
        order: video.order,
        thumbnail: video.thumbnail,
        updatedAt: video.updatedAt
      }
    });

  } catch (error) {
    console.error('Error actualizando video:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor'
    });
  }
});

// @route   DELETE /api/videos/:id
// @desc    Eliminar video
// @access  Private (Admin)
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video no encontrado'
      });
    }

    // Eliminar archivo del sistema
    try {
      await deleteFile(video.filePath);
    } catch (error) {
      console.warn('No se pudo eliminar el archivo físico:', error.message);
    }

    // Eliminar video de la base de datos
    await Video.findByIdAndDelete(req.params.id);

    // Eliminar referencia del curso
    await Course.findByIdAndUpdate(video.course, {
      $pull: { videos: video._id }
    });

    res.json({
      success: true,
      message: 'Video eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando video:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor'
    });
  }
});

module.exports = router;