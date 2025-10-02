const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    enum: ['pdf', 'doc', 'docx', 'txt', 'ppt', 'pptx', 'xls', 'xlsx', 'zip', 'image', 'other'],
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  video: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video',
    default: null // Puede estar asociado a un video específico o ser material general del curso
  },
  order: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  downloads: {
    type: Number,
    default: 0
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tags: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true
});

// Índice compuesto para curso y orden
fileSchema.index({ course: 1, order: 1 });

// Virtual para obtener la URL de descarga
fileSchema.virtual('downloadUrl').get(function() {
  return `/api/files/download/${this._id}`;
});

// Virtual para obtener el tamaño formateado
fileSchema.virtual('formattedSize').get(function() {
  const bytes = this.fileSize;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
});

// Método estático para determinar el tipo de archivo basado en la extensión
fileSchema.statics.getFileType = function(filename, mimeType) {
  const extension = filename.toLowerCase().split('.').pop();
  
  if (mimeType.includes('pdf') || extension === 'pdf') return 'pdf';
  if (mimeType.includes('word') || ['doc', 'docx'].includes(extension)) return 'doc';
  if (mimeType.includes('text') || extension === 'txt') return 'txt';
  if (mimeType.includes('presentation') || ['ppt', 'pptx'].includes(extension)) return 'ppt';
  if (mimeType.includes('spreadsheet') || ['xls', 'xlsx'].includes(extension)) return 'xls';
  if (mimeType.includes('zip') || ['zip', 'rar', '7z'].includes(extension)) return 'zip';
  if (mimeType.includes('image') || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) return 'image';
  
  return 'other';
};

// Configurar virtuals para que se incluyan en JSON
fileSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('File', fileSchema);