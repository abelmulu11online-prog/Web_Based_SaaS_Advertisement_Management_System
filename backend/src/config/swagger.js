import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './index.js';

// Swagger definition
const swaggerDefinition = {
  openapi: '3.0.3',
  info: {
    title: 'Local Discovery & Self-Advertising Platform API',
    version: '1.0.0',
    description: 'Interactive API documentation for the backend services.',
  },
  servers: [
    {
      url: `http://localhost:${config.port}`,
      description: 'Local development server',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      SuccessResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Operation successful' },
          data: { type: 'object', additionalProperties: true },
        },
        required: ['success', 'message', 'data'],
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Something went wrong' },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'INTERNAL_ERROR' },
            },
            required: ['code'],
          },
        },
        required: ['success', 'message', 'error'],
      },
      ValidationErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Validation failed' },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'VALIDATION_ERROR' },
              issues: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    path: { type: 'string', example: 'body.email' },
                    message: { type: 'string', example: 'Invalid email' },
                  },
                  required: ['path', 'message'],
                },
              },
            },
            required: ['code', 'issues'],
          },
        },
        required: ['success', 'message', 'error'],
      },
    },
  },
  security: [{ BearerAuth: [] }],
};

// Options for swagger-jsdoc - we point to the whole src folder for annotations.
const options = {
  swaggerDefinition,
  apis: ['./src/**/*.js'], // Path to the API docs
};

export const swaggerSpec = swaggerJsdoc(options);
