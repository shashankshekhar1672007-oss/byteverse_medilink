const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Medilink API',
      version: '1.0.0',
      description: 'Production-ready telemedicine platform REST API',
      contact: { name: 'Medilink Team', email: 'support@medilink.com' },
    },
    servers: [
      { url: 'http://localhost:5000', description: 'Development' },
      { url: 'https://api.medilink.com', description: 'Production' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['patient', 'doctor', 'admin'] },
            phone: { type: 'string' },
            avatar: { type: 'string', nullable: true },
            isEmailVerified: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Doctor: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            userId: { $ref: '#/components/schemas/User' },
            specialization: { type: 'string' },
            qualification: { type: 'string' },
            regNo: { type: 'string' },
            experience: { type: 'number' },
            rating: { type: 'number' },
            price: { type: 'number' },
            online: { type: 'boolean' },
          },
        },
        Patient: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            userId: { $ref: '#/components/schemas/User' },
            age: { type: 'number' },
            gender: { type: 'string', enum: ['male', 'female', 'other'] },
            bloodGroup: { type: 'string' },
            allergies: { type: 'array', items: { type: 'string' } },
          },
        },
        Prescription: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            rxId: { type: 'string' },
            diagnosis: { type: 'string' },
            medicines: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  dosage: { type: 'string' },
                  frequency: { type: 'string' },
                  duration: { type: 'string' },
                },
              },
            },
            status: { type: 'string', enum: ['active', 'expired', 'cancelled'] },
          },
        },
        Order: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            orderNumber: { type: 'string' },
            patient: { $ref: '#/components/schemas/Patient' },
            prescription: { $ref: '#/components/schemas/Prescription' },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  dosage: { type: 'string' },
                  frequency: { type: 'string' },
                  duration: { type: 'string' },
                  quantity: { type: 'number' },
                  unitPrice: { type: 'number' },
                },
              },
            },
            status: {
              type: 'string',
              enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
            },
            paymentMethod: { type: 'string', enum: ['cod', 'card', 'upi', 'insurance'] },
            paymentStatus: { type: 'string', enum: ['pending', 'paid', 'failed', 'refunded'] },
            subtotal: { type: 'number' },
            deliveryFee: { type: 'number' },
            tax: { type: 'number' },
            discount: { type: 'number' },
            total: { type: 'number' },
          },
        },
        Consultation: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            roomId: { type: 'string' },
            status: { type: 'string', enum: ['pending', 'active', 'completed', 'cancelled'] },
            reason: { type: 'string' },
            startedAt: { type: 'string', format: 'date-time', nullable: true },
          },
        },
        ApiError: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);
module.exports = swaggerSpec;
