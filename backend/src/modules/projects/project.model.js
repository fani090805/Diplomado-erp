'use strict';

const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    location: { type: String, trim: true, default: '' },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', default: null },
    budget: { type: Number, required: true, min: 0, default: 0 },
    executedAmount: { type: Number, required: true, min: 0, default: 0 },
    status: {
      type: String,
      enum: ['PLANEADA', 'EN_PROCESO', 'PAUSADA', 'FINALIZADA', 'CANCELADA'],
      default: 'PLANEADA',
      index: true,
    },
    startDate: { type: Date, default: null },
    estimatedEndDate: { type: Date, default: null },
    actualEndDate: { type: Date, default: null },
    managerName: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

projectSchema.index({ companyId: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('Project', projectSchema);
