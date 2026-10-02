export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "ERP API",
    version: "1.0.0",
    description: "API REST versionada para ERP modular multi-empresa.",
  },
  servers: [
    {
      url: "http://localhost:4000/api/v1",
      description: "Servidor local de desarrollo",
    },
  ],
  paths: {
    "/auth/login": {
      post: {
        summary: "Iniciar sesión",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Sesión emitida" },
          "401": { description: "Credenciales inválidas" },
        },
      },
    },
    "/auth/refresh": {
      post: {
        summary: "Rotar refresh token",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["refreshToken"],
                properties: { refreshToken: { type: "string" } },
              },
            },
          },
        },
        responses: {
          "200": { description: "Tokens rotados" },
          "401": { description: "Refresh token inválido" },
        },
      },
    },
    "/auth/logout": {
      post: {
        summary: "Revocar refresh token",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["refreshToken"],
                properties: { refreshToken: { type: "string" } },
              },
            },
          },
        },
        responses: { "204": { description: "Sesión cerrada" } },
      },
    },
    "/auth/me": {
      get: {
        summary: "Consultar usuario de la sesión",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Perfil del usuario" },
          "401": { description: "Token inválido" },
        },
      },
    },
    "/health": {
      get: {
        summary: "Health check",
        responses: {
          "200": {
            description: "API disponible",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string" },
                    api: { type: "string" },
                    database: { type: "string" },
                    timestamp: { type: "string", format: "date-time" },
                    uptime: { type: "number" },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
  },
} as const;
