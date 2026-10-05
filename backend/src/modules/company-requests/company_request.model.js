'use strict';

const mongoose = require('mongoose');

const INDUSTRIES = ['comercio', 'construccion', 'manufactura', 'servicios', 'otro'];
const REQUEST_STATUSES = ['pending', 'approved', 'rejected'];

/**
 * COMPANY_REQUEST — Solicitud pública de alta de una empresa nueva.
 * Colección: company_requests (entidad de PLATAFORMA: no lleva companyId).
 *
 * Mientras está 'pending' no existe empresa ni usuario; el Super Admin la
 * aprueba (se crea la empresa y el solicitante queda como administrador)
 * o la rechaza. Al revisarla se elimina el passwordHash.
 */
const companyRequestSchema = new mongoose.Schema(
  {
    company: {
      name: {
        type: String,
        required: [true, 'El nombre de la empresa es obligatorio.'],
        trim: true,
        minlength: 2,
        maxlength: 120,
      },
      legalName: { type: String, trim: true, maxlength: 160 },
      taxId: { type: String, trim: true, uppercase: true, maxlength: 30 },
      industry: { type: String, enum: INDUSTRIES, required: true },
      phone: { type: String, trim: true, maxlength: 30 },
      city: { type: String, trim: true, maxlength: 100 },
    },
    applicant: {
      name: { type: String, required: [true, 'El nombre es obligatorio.'], trim: true, maxlength: 100 },
      lastName: { type: String, trim: true, maxlength: 100 },
      email: {
        type: String,
        required: [true, 'El correo es obligatorio.'],
        lowercase: true,
        trim: true,
        maxlength: 120,
      },
      // Sólo existe mientras la solicitud está pendiente; nunca se devuelve.
      passwordHash: { type: String, select: false },
    },
    status: { type: String, enum: REQUEST_STATUSES, default: 'pending' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    rejectionReason: { type: String, trim: true, maxlength: 500, default: null },
    createdCompanyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', default: null },
  },
  { timestamps: true, collection: 'company_requests' }
);

companyRequestSchema.index({ status: 1, createdAt: -1 });
companyRequestSchema.index({ 'applicant.email': 1 });
// Una sola solicitud pendiente por correo (respaldo ante envíos simultáneos).
companyRequestSchema.index(
  { 'applicant.email': 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'pending' } }
);

module.exports = mongoose.model('CompanyRequest', companyRequestSchema);
module.exports.INDUSTRIES = INDUSTRIES;
module.exports.REQUEST_STATUSES = REQUEST_STATUSES;
