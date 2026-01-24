import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'EcoFlow Titans API',
            version: '1.0.0',
            description: 'API documentation for EcoFlow Titans - Engineering Change Order Management System',
            contact: {
                name: 'EcoFlow Titans Team',
                email: 'support@ecoflow.com',
            },
        },
        servers: [
            {
                url: 'http://localhost:5000',
                description: 'Development server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Enter your JWT token',
                },
            },
            schemas: {
                User: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid',
                            description: 'User ID',
                        },
                        email: {
                            type: 'string',
                            format: 'email',
                            description: 'User email',
                        },
                        name: {
                            type: 'string',
                            nullable: true,
                            description: 'User name',
                        },
                        role: {
                            type: 'string',
                            enum: ['ENGINEERING_USER', 'APPROVER', 'OPERATIONS_USER', 'ADMIN'],
                            description: 'User role',
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Account creation date',
                        },
                    },
                },
                LoginRequest: {
                    type: 'object',
                    required: ['email', 'password'],
                    properties: {
                        email: {
                            type: 'string',
                            format: 'email',
                            example: 'admin@ecoflow.com',
                        },
                        password: {
                            type: 'string',
                            format: 'password',
                            example: 'admin123',
                        },
                    },
                },
                LoginResponse: {
                    type: 'object',
                    properties: {
                        message: {
                            type: 'string',
                            example: 'Login successful',
                        },
                        token: {
                            type: 'string',
                            description: 'JWT token',
                        },
                        user: {
                            $ref: '#/components/schemas/User',
                        },
                    },
                },
                Error: {
                    type: 'object',
                    properties: {
                        error: {
                            type: 'string',
                            description: 'Error message',
                        },
                    },
                },
            },
        },
        tags: [
            {
                name: 'Auth',
                description: 'Authentication endpoints',
            },
        ],
    },
    apis: ['./src/controllers/*.ts', './src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
