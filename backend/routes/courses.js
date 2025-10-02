const express = require('express');
const Course = require('../models/Course');
const User = require('../models/User');
const { authMiddleware, adminMiddleware, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/courses
// @desc    Obtener todos los cursos
// @access  Public (con auth opcional para mostrar estado de inscripción)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { category, level, search, limit = 10, page = 1 } = req.query;
    
    // Construir filtros
    const filters = { isActive: true };
    
    if (category) filters.category = new RegExp(category, 'i');
    if (level) filters.level = level;
    if (search) {
      filters.$or = [
        { title: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const courses = await Course.find(filters)
      .populate('instructor', 'firstName lastName fullName')
      .populate('videos', 'title duration')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Course.countDocuments(filters);

    res.json({
      success: true,
      courses: courses.map(course => ({
        id: course._id,
        title: course.title,
        description: course.description,
        instructor: course.instructor ? {
          id: course.instructor._id,
          name: course.instructor.fullName
        } : null,
        category: course.category,
        level: course.level,
        thumbnail: course.thumbnail,
        price: course.price,
        duration: course.duration,
        videoCount: course.videoCount,
        enrolledCount: course.enrolledCount,
        tags: course.tags,
        isEnrolled: req.user ? course.enrolledStudents.some(studentId => 
          studentId.toString() === req.user._id.toString()
        ) : false,
        createdAt: course.createdAt
      })),
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total
      }
    });

  } catch (error) {
    console.error('Error obteniendo cursos:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor'
    });
  }
});

// @route   POST /api/courses
// @desc    Crear nuevo curso
// @access  Private (Admin)
router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      level = 'beginner',
      thumbnail = '',
      price = 0,
      tags = [],
      requirements = [],
      whatYouWillLearn = []
    } = req.body;

    if (!title || !description || !category) {
      return res.status(400).json({
        success: false,
        message: 'Título, descripción y categoría son requeridos'
      });
    }

    const course = new Course({
      title,
      description,
      instructor: req.user._id,
      category,
      level,
      thumbnail,
      price: parseFloat(price) || 0,
      tags: Array.isArray(tags) ? tags : [],
      requirements: Array.isArray(requirements) ? requirements : [],
      whatYouWillLearn: Array.isArray(whatYouWillLearn) ? whatYouWillLearn : []
    });

    await course.save();

    res.status(201).json({
      success: true,
      message: 'Curso creado exitosamente',
      course: {
        id: course._id,
        title: course.title,
        description: course.description,
        category: course.category,
        level: course.level,
        thumbnail: course.thumbnail,
        price: course.price,
        tags: course.tags,
        requirements: course.requirements,
        whatYouWillLearn: course.whatYouWillLearn,
        createdAt: course.createdAt
      }
    });

  } catch (error) {
    console.error('Error creando curso:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor'
    });
  }
});

// @route   GET /api/courses/:id
// @desc    Obtener un curso específico
// @access  Public (con auth opcional para mostrar estado de inscripción)
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('instructor', 'firstName lastName fullName avatar')
      .populate('videos', 'title description duration order thumbnail views')
      .populate('files', 'title description fileType fileSize originalName');

    if (!course || !course.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Curso no encontrado'
      });
    }

    const isEnrolled = req.user ? course.enrolledStudents.some(studentId => 
      studentId.toString() === req.user._id.toString()
    ) : false;

    const isAdmin = req.user ? req.user.role === 'admin' : false;

    // Si el usuario no está inscrito y no es admin, ocultar algunos datos
    const videoData = (isEnrolled || isAdmin) ? course.videos.map(video => ({
      id: video._id,
      title: video.title,
      description: video.description,
      duration: video.duration,
      formattedDuration: video.formattedDuration,
      order: video.order,
      thumbnail: video.thumbnail,
      views: video.views,
      videoUrl: video.videoUrl
    })).sort((a, b) => a.order - b.order) : course.videos.map(video => ({
      id: video._id,
      title: video.title,
      description: video.description,
      duration: video.duration,
      formattedDuration: video.formattedDuration,
      order: video.order
    })).sort((a, b) => a.order - b.order);

    const fileData = (isEnrolled || isAdmin) ? course.files.map(file => ({
      id: file._id,
      title: file.title,
      description: file.description,
      fileType: file.fileType,
      fileSize: file.fileSize,
      formattedSize: file.formattedSize,
      originalName: file.originalName,
      downloadUrl: file.downloadUrl
    })) : [];

    res.json({
      success: true,
      course: {
        id: course._id,
        title: course.title,
        description: course.description,
        instructor: {
          id: course.instructor._id,
          name: course.instructor.fullName,
          avatar: course.instructor.avatar
        },
        category: course.category,
        level: course.level,
        thumbnail: course.thumbnail,
        price: course.price,
        duration: course.duration,
        tags: course.tags,
        requirements: course.requirements,
        whatYouWillLearn: course.whatYouWillLearn,
        videoCount: course.videoCount,
        enrolledCount: course.enrolledCount,
        videos: videoData,
        files: fileData,
        isEnrolled,
        createdAt: course.createdAt,
        updatedAt: course.updatedAt
      }
    });

  } catch (error) {
    console.error('Error obteniendo curso:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor'
    });
  }
});

// @route   PUT /api/courses/:id
// @desc    Actualizar curso
// @access  Private (Admin)
router.put('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      level,
      thumbnail,
      price,
      tags,
      requirements,
      whatYouWillLearn
    } = req.body;

    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Curso no encontrado'
      });
    }

    // Actualizar campos
    if (title) course.title = title;
    if (description) course.description = description;
    if (category) course.category = category;
    if (level) course.level = level;
    if (thumbnail !== undefined) course.thumbnail = thumbnail;
    if (price !== undefined) course.price = parseFloat(price) || 0;
    if (tags !== undefined) course.tags = Array.isArray(tags) ? tags : [];
    if (requirements !== undefined) course.requirements = Array.isArray(requirements) ? requirements : [];
    if (whatYouWillLearn !== undefined) course.whatYouWillLearn = Array.isArray(whatYouWillLearn) ? whatYouWillLearn : [];

    await course.save();

    res.json({
      success: true,
      message: 'Curso actualizado exitosamente',
      course: {
        id: course._id,
        title: course.title,
        description: course.description,
        category: course.category,
        level: course.level,
        thumbnail: course.thumbnail,
        price: course.price,
        tags: course.tags,
        requirements: course.requirements,
        whatYouWillLearn: course.whatYouWillLearn,
        updatedAt: course.updatedAt
      }
    });

  } catch (error) {
    console.error('Error actualizando curso:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor'
    });
  }
});

// @route   POST /api/courses/:id/enroll
// @desc    Inscribirse en un curso
// @access  Private
router.post('/:id/enroll', authMiddleware, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course || !course.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Curso no encontrado'
      });
    }

    // Verificar si ya está inscrito
    const isAlreadyEnrolled = course.enrolledStudents.some(studentId => 
      studentId.toString() === req.user._id.toString()
    );

    if (isAlreadyEnrolled) {
      return res.status(400).json({
        success: false,
        message: 'Ya estás inscrito en este curso'
      });
    }

    // Agregar estudiante al curso
    course.enrolledStudents.push(req.user._id);
    await course.save();

    // Agregar curso al usuario
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { enrolledCourses: course._id }
    });

    res.json({
      success: true,
      message: 'Te has inscrito exitosamente al curso'
    });

  } catch (error) {
    console.error('Error inscribiendo en curso:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor'
    });
  }
});

// @route   DELETE /api/courses/:id/enroll
// @desc    Desinscribirse de un curso
// @access  Private
router.delete('/:id/enroll', authMiddleware, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Curso no encontrado'
      });
    }

    // Remover estudiante del curso
    course.enrolledStudents = course.enrolledStudents.filter(studentId => 
      studentId.toString() !== req.user._id.toString()
    );
    await course.save();

    // Remover curso del usuario
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { enrolledCourses: course._id }
    });

    res.json({
      success: true,
      message: 'Te has desinscrito del curso exitosamente'
    });

  } catch (error) {
    console.error('Error desinscribiendo del curso:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor'
    });
  }
});

// @route   GET /api/courses/user/enrolled
// @desc    Obtener cursos inscritos del usuario
// @access  Private
router.get('/user/enrolled', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'enrolledCourses',
      populate: [
        { path: 'instructor', select: 'firstName lastName fullName' },
        { path: 'videos', select: 'title duration' }
      ]
    });

    const enrolledCourses = user.enrolledCourses.map(course => ({
      id: course._id,
      title: course.title,
      description: course.description,
      instructor: {
        id: course.instructor._id,
        name: course.instructor.fullName
      },
      category: course.category,
      level: course.level,
      thumbnail: course.thumbnail,
      videoCount: course.videoCount,
      duration: course.duration,
      createdAt: course.createdAt
    }));

    res.json({
      success: true,
      courses: enrolledCourses
    });

  } catch (error) {
    console.error('Error obteniendo cursos inscritos:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor'
    });
  }
});

// @route   DELETE /api/courses/:id
// @desc    Eliminar curso
// @access  Private (Admin)
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Curso no encontrado'
      });
    }

    // Marcar como inactivo en lugar de eliminar completamente
    course.isActive = false;
    await course.save();

    res.json({
      success: true,
      message: 'Curso eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando curso:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor'
    });
  }
});

module.exports = router;