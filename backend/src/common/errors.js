'use strict';

const ApiError = require('../utils/ApiError');

class BadRequestError extends ApiError {
  constructor(message = 'Solicitud inválida.', details) {
    super(400, message, { code: 'BAD_REQUEST', details });
  }
}

class ForbiddenError extends ApiError {
  constructor(message = 'No tiene permisos para realizar esta acción.', details) {
    super(403, message, { code: 'FORBIDDEN', details });
  }
}

class NotFoundError extends ApiError {
  constructor(message = 'Recurso no encontrado.', details) {
    super(404, message, { code: 'NOT_FOUND', details });
  }
}

class ConflictError extends ApiError {
  constructor(message = 'El recurso ya existe.', details) {
    super(409, message, { code: 'CONFLICT', details });
  }
}

class ValidationError extends ApiError {
  constructor(message = 'Los datos enviados no son válidos.', details) {
    super(422, message, { code: 'VALIDATION_ERROR', details });
  }
}

module.exports = {
  ApiError,
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
};