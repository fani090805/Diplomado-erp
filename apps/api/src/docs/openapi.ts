export const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'ERP API',
    version: '1.0.0',
    description: 'API REST versionada para ERP modular multi-empresa.'
  },
  servers: [
    {
      url: 'http://localhost:4000/api/v1',
      description: 'Servidor local de desarrollo'
    }
  ],
  paths: {
    '/api/v1/health': {
      get: {
        summary: 'Health check',
        responses: {
          '200': {
            description: 'API disponible',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string' },
                    api: { type: 'string' },
                    database: { type: 'string' },
                    timestamp: { type: 'string', format: 'date-time' },
                    uptime: { type: 'number' }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
} as const;
