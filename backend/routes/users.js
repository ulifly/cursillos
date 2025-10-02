const express = require('express');
const User = require('../models/User');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/users
// @desc    Obtener todos los usuarios (Admin)
// @access  Private (Admin)
router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 10, search, role } = req.query;
    
    // Construir filtros
    const filters = {};
    
    if (search) {
      filters.$or = [
        { firstName: new RegExp(search, 'i') },
        { lastName: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') }
      ];
    }
    
    if (role) {
      filters.role = role;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const users = await User.find(filters)
      .select('-password')
      .populate('enrolledCourses', 'title')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await User.countDocuments(filters);

    res.json({
      success: true,
      users: users.map(user => ({
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        role: user.role,
        avatar: user.avatar,
        isActive: user.isActive,
        enrolledCourses: user.enrolledCourses.map(course => ({
          id: course._id,
          title: course.title
        })),
        lastLogin: user.lastLogin,
        createdAt: user.createdAt
      })),
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total
      }
    });

  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor'
    });
  }
});

// @route   GET /api/users/:id
// @desc    Obtener un usuario específico
// @access  Private (Admin o el mismo usuario)
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    // Verificar si es admin o el mismo usuario
    if (req.user.role !== 'admin' && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado'
      });
    }

    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('enrolledCourses', 'title description instructor category level thumbnail');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        role: user.role,
        avatar: user.avatar,
        isActive: user.isActive,
        enrolledCourses: user.enrolledCourses.map(course => ({
          id: course._id,
          title: course.title,
          description: course.description,
          instructor: course.instructor,
          category: course.category,
          level: course.level,
          thumbnail: course.thumbnail
        })),
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });

  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor'
    });
  }
});

// @route   PUT /api/users/:id
// @desc    Actualizar usuario
// @access  Private (Admin o el mismo usuario)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    // Verificar si es admin o el mismo usuario
    if (req.user.role !== 'admin' && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado'
      });
    }

    const { firstName, lastName, avatar, role, isActive } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Actualizar campos básicos
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (avatar !== undefined) user.avatar = avatar;

    // Solo admin puede cambiar role e isActive
    if (req.user.role === 'admin') {
      if (role && ['student', 'admin'].includes(role)) user.role = role;
      if (isActive !== undefined) user.isActive = isActive;
    }

    await user.save();

    res.json({
      success: true,
      message: 'Usuario actualizado exitosamente',
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        role: user.role,
        avatar: user.avatar,
        isActive: user.isActive,
        updatedAt: user.updatedAt
      }
    });

  } catch (error) {
    console.error('Error actualizando usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor'
    });
  }
});

// @route   PUT /api/users/:id/role
// @desc    Cambiar rol de usuario
// @access  Private (Admin)
router.put('/:id/role', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { role } = req.body;

    if (!role || !['student', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Rol inválido. Debe ser "student" o "admin"'
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Prevenir que el usuario se quite a sí mismo el rol de admin
    if (req.user._id.toString() === req.params.id && role === 'student') {
      return res.status(400).json({
        success: false,
        message: 'No puedes quitar tu propio rol de administrador'
      });
    }

    user.role = role;
    await user.save();

    res.json({
      success: true,
      message: `Rol de usuario cambiado a ${role} exitosamente`,
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        updatedAt: user.updatedAt
      }
    });

  } catch (error) {
    console.error('Error cambiando rol de usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor'
    });
  }
});

// @route   PUT /api/users/:id/status
// @desc    Cambiar estado de usuario (activo/inactivo)
// @access  Private (Admin)
router.put('/:id/status', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Estado inválido. Debe ser true o false'
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Prevenir que el usuario se desactive a sí mismo
    if (req.user._id.toString() === req.params.id && !isActive) {
      return res.status(400).json({
        success: false,
        message: 'No puedes desactivar tu propia cuenta'
      });
    }

    user.isActive = isActive;
    await user.save();

    res.json({
      success: true,
      message: `Usuario ${isActive ? 'activado' : 'desactivado'} exitosamente`,
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        isActive: user.isActive,
        updatedAt: user.updatedAt
      }
    });

  } catch (error) {
    console.error('Error cambiando estado de usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor'
    });
  }
});

// @route   DELETE /api/users/:id
// @desc    Eliminar usuario
// @access  Private (Admin)
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Prevenir que el usuario se elimine a sí mismo
    if (req.user._id.toString() === req.params.id) {
      return res.status(400).json({
        success: false,
        message: 'No puedes eliminar tu propia cuenta'
      });
    }

    // En lugar de eliminar completamente, desactivar la cuenta
    user.isActive = false;
    user.email = `deleted_${Date.now()}_${user.email}`; // Para evitar conflictos de email único
    await user.save();

    res.json({
      success: true,
      message: 'Usuario eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor'
    });
  }
});

// @route   GET /api/users/stats/overview
// @desc    Obtener estadísticas de usuarios
// @access  Private (Admin)
router.get('/stats/overview', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const adminUsers = await User.countDocuments({ role: 'admin', isActive: true });
    const studentUsers = await User.countDocuments({ role: 'student', isActive: true });
    const inactiveUsers = await User.countDocuments({ isActive: false });

    // Usuarios registrados en los últimos 30 días
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentUsers = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
      isActive: true
    });

    res.json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        inactiveUsers,
        adminUsers,
        studentUsers,
        recentUsers
      }
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas de usuarios:', error);
    res.status(500).json({
      success: false,
      message: 'Error del servidor'
    });
  }
});

module.exports = router;