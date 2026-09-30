'use strict';

const mongoose = require('mongoose');

const costCenterSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['MATERIALES', 'MANO_DE_OBRA', 'MAQUINARIA', 'FLETES', 'SUBCONTRATOS', 'INDIRECTOS'],
      default: 'MATERIALES',
    },
    budget: { type: Number, required: true, min: 0, default: 0 },
    executedAmount: { type: Number, required: true, min: 0, default: 0 },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
);

costCenterSchema.index({ companyId: 1, projectId: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('CostCenter', costCenterSchema);
