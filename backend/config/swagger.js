const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const {
  ROLES,
  CONSULTATION_STATUS,
  PRESCRIPTION_STATUS,
  ORDER_STATUS,
  PAYMENT_STATUS,
  PAYMENT_METHODS,
  SPECIALIZATIONS,
  BLOOD_GROUPS,
  GENDERS,
} = require('../utils/constants');

const port = process.env.PORT || 5001;
const serverUrl = process.env.API_BASE_URL || `http://localhost:${port}`;
const bearerSecurity = [{ bearerAuth: [] }];

const idParam = (name, description) => ({
  name,
  in: 'path',
  required: true,
  description,
  schema: { type: 'string', example: '65f1c9b6f4b4f4d8a5f5d123' },
});

const q = (name, schema = { type: 'string' }, description) => ({
  name,
  in: 'query',
  schema,
  description,
});

const pagination = [
  q('page', { type: 'integer', minimum: 1, default: 1 }),
  q('limit', { type: 'integer', minimum: 1, maximum: 50, default: 10 }),
];

const jsonBody = (schema, required = true) => ({
  required,
  content: { 'application/json': { schema } },
});

const formBody = (schema, required = false) => ({
  required,
  content: {
    'multipart/form-data': { schema },
    'application/json': { schema },
  },
});

const ok = (description = 'Successful response', schema = '#/components/schemas/ApiResponse') => ({
  description,
  content: { 'application/json': { schema: { $ref: schema } } },
});

const errors = {
  400: { $ref: '#/components/responses/BadRequest' },
  401: { $ref: '#/components/responses/Unauthorized' },
  403: { $ref: '#/components/responses/Forbidden' },
  404: { $ref: '#/components/responses/NotFound' },
  422: { $ref: '#/components/responses/ValidationError' },
};

const paths = {};
const add = (path, method, tag, summary, options = {}) => {
  paths[path] ||= {};
  paths[path][method] = {
    tags: [tag],
    summary,
    ...(options.auth ? { security: bearerSecurity } : {}),
    ...(options.parameters ? { parameters: options.parameters } : {}),
    ...(options.requestBody ? { requestBody: options.requestBody } : {}),
    responses: {
      [options.status || 200]: ok(options.response),
      ...(options.errors || {}),
    },
  };
};

add('/api/health', 'get', 'Health', 'Check API, database, uptime, and environment', {
  response: 'Health status',
  status: 200,
});

add('/api/auth/register', 'post', 'Auth', 'Register a patient or doctor', {
  status: 201,
  requestBody: jsonBody({ $ref: '#/components/schemas/RegisterRequest' }),
  errors: { 409: errors[400], 422: errors[422] },
});
add('/api/auth/login', 'post', 'Auth', 'Login and receive access and refresh tokens', {
  requestBody: jsonBody({ $ref: '#/components/schemas/LoginRequest' }),
  errors: { 401: errors[401], 422: errors[422] },
});
add('/api/auth/logout', 'post', 'Auth', 'Logout current user', { auth: true, errors: { 401: errors[401] } });
add('/api/auth/me', 'get', 'Auth', 'Get current user and role profile', { auth: true, errors: { 401: errors[401] } });
add('/api/auth/refresh', 'post', 'Auth', 'Refresh JWT tokens', {
  requestBody: jsonBody({ $ref: '#/components/schemas/RefreshTokenRequest' }),
  errors: { 400: errors[400], 401: errors[401] },
});
add('/api/auth/verify-email/{token}', 'get', 'Auth', 'Verify email from email link token', {
  parameters: [idParam('token', 'Email verification token')],
  errors: { 400: errors[400] },
});
add('/api/auth/forgot-password', 'post', 'Auth', 'Send password reset email', {
  requestBody: jsonBody({ type: 'object', required: ['email'], properties: { email: { type: 'string', format: 'email' } } }),
  errors: { 404: errors[404], 422: errors[422] },
});
add('/api/auth/reset-password/{token}', 'put', 'Auth', 'Reset password using reset token', {
  parameters: [idParam('token', 'Password reset token')],
  requestBody: jsonBody({ type: 'object', required: ['password'], properties: { password: { type: 'string', minLength: 6 } } }),
  errors: { 400: errors[400], 422: errors[422] },
});
add('/api/auth/change-password', 'put', 'Auth', 'Change password for current user', {
  auth: true,
  requestBody: jsonBody({ $ref: '#/components/schemas/ChangePasswordRequest' }),
  errors: { 400: errors[400], 401: errors[401], 422: errors[422] },
});

add('/api/doctors', 'get', 'Doctors', 'List doctors with filters and pagination', {
  parameters: [
    q('specialty', { type: 'string', enum: SPECIALIZATIONS }),
    q('online', { type: 'boolean' }),
    q('verified', { type: 'boolean' }),
    q('minRating', { type: 'number', minimum: 0, maximum: 5 }),
    q('minPrice', { type: 'number', minimum: 0 }),
    q('maxPrice', { type: 'number', minimum: 0 }),
    q('search'),
    q('sort', { type: 'string', enum: ['rating', 'price_asc', 'price_desc', 'experience', 'consultations'] }),
    ...pagination,
  ],
  response: 'Paginated doctors',
});
add('/api/doctors/specialty/{specialty}', 'get', 'Doctors', 'List doctors by specialization', {
  parameters: [{ name: 'specialty', in: 'path', required: true, schema: { type: 'string', enum: SPECIALIZATIONS } }],
});
add('/api/doctors/profile', 'get', 'Doctors', 'Get current doctor profile', { auth: true, errors: { 401: errors[401], 403: errors[403] } });
add('/api/doctors/profile', 'put', 'Doctors', 'Update current doctor profile and avatar', {
  auth: true,
  requestBody: formBody({ $ref: '#/components/schemas/DoctorUpdateRequest' }),
  errors: { 401: errors[401], 403: errors[403], 422: errors[422] },
});
add('/api/doctors/status', 'put', 'Doctors', 'Toggle current doctor online status', {
  auth: true,
  requestBody: jsonBody({ type: 'object', required: ['online'], properties: { online: { type: 'boolean', example: true } } }),
  errors: { 401: errors[401], 403: errors[403] },
});
add('/api/doctors/consultations', 'get', 'Doctors', 'List current doctor consultations', {
  auth: true,
  parameters: [q('status', { type: 'string', enum: Object.values(CONSULTATION_STATUS) }), ...pagination],
  response: 'Paginated consultations',
});
add('/api/doctors/dashboard', 'get', 'Doctors', 'Get current doctor dashboard', { auth: true, errors: { 401: errors[401], 403: errors[403] } });
add('/api/doctors/{id}', 'get', 'Doctors', 'Get public doctor profile by doctor profile ID', {
  parameters: [idParam('id', 'Doctor profile ID')],
  errors: { 404: errors[404], 422: errors[422] },
});
add('/api/doctors/{id}/review', 'post', 'Doctors', 'Review a doctor after a completed consultation', {
  auth: true,
  parameters: [idParam('id', 'Doctor profile ID')],
  requestBody: jsonBody({ $ref: '#/components/schemas/ReviewRequest' }),
  errors: { 401: errors[401], 403: errors[403], 422: errors[422] },
});

add('/api/patients/search', 'get', 'Patients', 'Search patients as a doctor', {
  auth: true,
  parameters: [q('q'), q('search'), ...pagination],
  errors: { 401: errors[401], 403: errors[403] },
});
add('/api/patients/dashboard', 'get', 'Patients', 'Get current patient dashboard', { auth: true });
add('/api/patients/profile', 'get', 'Patients', 'Get current patient profile', { auth: true });
add('/api/patients/profile', 'put', 'Patients', 'Update current patient profile and avatar', {
  auth: true,
  requestBody: formBody({ $ref: '#/components/schemas/PatientUpdateRequest' }),
  errors: { 401: errors[401], 403: errors[403], 422: errors[422] },
});
add('/api/patients/prescriptions', 'get', 'Patients', 'List current patient prescriptions', { auth: true, parameters: pagination });
add('/api/patients/prescriptions/active', 'get', 'Patients', 'List active prescriptions for current patient', { auth: true });
add('/api/patients/prescriptions/{id}', 'get', 'Patients', 'Get one current patient prescription', {
  auth: true,
  parameters: [idParam('id', 'Prescription ID')],
  errors: { 401: errors[401], 404: errors[404] },
});
add('/api/patients/consultations', 'get', 'Patients', 'List current patient consultations', {
  auth: true,
  parameters: [q('status', { type: 'string', enum: Object.values(CONSULTATION_STATUS) }), ...pagination],
});

add('/api/consultations', 'post', 'Consultations', 'Start a consultation with a doctor', {
  auth: true,
  status: 201,
  requestBody: jsonBody({ $ref: '#/components/schemas/StartConsultationRequest' }),
  errors: { 401: errors[401], 403: errors[403], 422: errors[422] },
});
add('/api/consultations/pending', 'get', 'Consultations', 'List pending consultations for current doctor', { auth: true });
add('/api/consultations/{id}', 'get', 'Consultations', 'Get consultation by ID', { auth: true, parameters: [idParam('id', 'Consultation ID')] });
add('/api/consultations/{id}/accept', 'put', 'Consultations', 'Accept a pending consultation as doctor', { auth: true, parameters: [idParam('id', 'Consultation ID')] });
add('/api/consultations/{id}/end', 'put', 'Consultations', 'End an active consultation', {
  auth: true,
  parameters: [idParam('id', 'Consultation ID')],
  requestBody: jsonBody({ type: 'object', properties: { notes: { type: 'string' } } }, false),
});
add('/api/consultations/{id}/leave', 'put', 'Consultations', 'Leave a consultation room', { parameters: [idParam('id', 'Consultation ID')] });
add('/api/consultations/{id}/cancel', 'put', 'Consultations', 'Cancel a consultation', { auth: true, parameters: [idParam('id', 'Consultation ID')] });
add('/api/consultations/{id}/messages', 'get', 'Consultations', 'Get consultation message history', {
  auth: true,
  parameters: [idParam('id', 'Consultation ID'), q('limit', { type: 'integer', default: 100 })],
});
add('/api/consultations/{id}/messages', 'post', 'Consultations', 'Send a consultation text message or document', {
  auth: true,
  status: 201,
  parameters: [idParam('id', 'Consultation ID')],
  requestBody: formBody({ $ref: '#/components/schemas/MessageRequest' }),
});

add('/api/prescriptions', 'get', 'Prescriptions', 'List prescriptions issued by current doctor', { auth: true, parameters: pagination });
add('/api/prescriptions', 'post', 'Prescriptions', 'Create an e-prescription as doctor', {
  auth: true,
  status: 201,
  requestBody: jsonBody({ $ref: '#/components/schemas/CreatePrescriptionRequest' }),
  errors: { 401: errors[401], 403: errors[403], 422: errors[422] },
});
add('/api/prescriptions/{id}', 'get', 'Prescriptions', 'Get prescription by ID', { auth: true, parameters: [idParam('id', 'Prescription ID')] });
add('/api/prescriptions/{id}', 'delete', 'Prescriptions', 'Cancel a prescription as doctor', { auth: true, parameters: [idParam('id', 'Prescription ID')] });
add('/api/prescriptions/{id}/status', 'put', 'Prescriptions', 'Update prescription status as doctor', {
  auth: true,
  parameters: [idParam('id', 'Prescription ID')],
  requestBody: jsonBody({ type: 'object', required: ['status'], properties: { status: { type: 'string', enum: Object.values(PRESCRIPTION_STATUS) } } }),
});

add('/api/orders', 'get', 'Orders', 'List orders for current patient or admin', {
  auth: true,
  parameters: [q('status', { type: 'string', enum: Object.values(ORDER_STATUS) }), q('patientId', { type: 'string' }, 'Admin only'), ...pagination],
  response: 'Paginated orders',
});
add('/api/orders', 'post', 'Orders', 'Create a medicine order as patient', {
  auth: true,
  status: 201,
  requestBody: jsonBody({ $ref: '#/components/schemas/CreateOrderRequest' }),
});
add('/api/orders/{id}', 'get', 'Orders', 'Get order by ID', { auth: true, parameters: [idParam('id', 'Order ID')] });
add('/api/orders/{id}/status', 'put', 'Orders', 'Update order status as admin', {
  auth: true,
  parameters: [idParam('id', 'Order ID')],
  requestBody: jsonBody({ $ref: '#/components/schemas/UpdateOrderStatusRequest' }),
});
add('/api/orders/{id}/cancel', 'put', 'Orders', 'Cancel an order', {
  auth: true,
  parameters: [idParam('id', 'Order ID')],
  requestBody: jsonBody({ type: 'object', properties: { reason: { type: 'string', maxLength: 300 } } }, false),
});

add('/api/admin/dashboard', 'get', 'Admin', 'Get admin dashboard stats', { auth: true, errors: { 401: errors[401], 403: errors[403] } });
add('/api/admin/users', 'get', 'Admin', 'List users with role profiles', {
  auth: true,
  parameters: [q('role', { type: 'string', enum: Object.values(ROLES) }), q('isActive', { type: 'boolean' }), q('search'), ...pagination],
  response: 'Paginated users',
});
add('/api/admin/users', 'post', 'Admin', 'Create a user and matching profile', {
  auth: true,
  status: 201,
  requestBody: jsonBody({ $ref: '#/components/schemas/AdminUserRequest' }),
});
add('/api/admin/users/{id}', 'get', 'Admin', 'Get user and profile by ID', { auth: true, parameters: [idParam('id', 'User ID')] });
add('/api/admin/users/{id}', 'put', 'Admin', 'Update user and profile', {
  auth: true,
  parameters: [idParam('id', 'User ID')],
  requestBody: jsonBody({ $ref: '#/components/schemas/AdminUserRequest' }, false),
});
add('/api/admin/users/{id}', 'delete', 'Admin', 'Deactivate user', { auth: true, parameters: [idParam('id', 'User ID')] });
add('/api/admin/users/{id}/restore', 'put', 'Admin', 'Restore deactivated user', { auth: true, parameters: [idParam('id', 'User ID')] });
add('/api/admin/orders', 'get', 'Admin', 'List all orders', {
  auth: true,
  parameters: [q('status', { type: 'string', enum: Object.values(ORDER_STATUS) }), q('patientId'), ...pagination],
  response: 'Paginated orders',
});
add('/api/admin/orders/{id}', 'get', 'Admin', 'Get any order by ID', { auth: true, parameters: [idParam('id', 'Order ID')] });
add('/api/admin/orders/{id}/status', 'put', 'Admin', 'Update order or payment status', {
  auth: true,
  parameters: [idParam('id', 'Order ID')],
  requestBody: jsonBody({ $ref: '#/components/schemas/UpdateOrderStatusRequest' }),
});
add('/api/admin/orders/{id}/cancel', 'put', 'Admin', 'Cancel any order', {
  auth: true,
  parameters: [idParam('id', 'Order ID')],
  requestBody: jsonBody({ type: 'object', properties: { reason: { type: 'string', maxLength: 300 } } }, false),
});

const openApiDefinition = {
  openapi: '3.0.3',
  info: {
    title: 'MediLink API',
    version: '1.0.0',
    description:
      'REST API for MediLink telemedicine: authentication, doctors, patients, consultations, prescriptions, orders, admin operations, and Socket.io signaling support.',
    contact: { name: 'The DOMinators' },
  },
  servers: [{ url: serverUrl, description: 'Configured API server' }],
  tags: [
    'Health',
    'Auth',
    'Doctors',
    'Patients',
    'Consultations',
    'Prescriptions',
    'Orders',
    'Admin',
  ].map((name) => ({ name })),
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Use the `data.token` value returned from `/api/auth/login`.',
      },
    },
    responses: {
      BadRequest: { description: 'Invalid request', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      Unauthorized: { description: 'Missing, invalid, or expired token', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      Forbidden: { description: 'Role is not authorized for this action', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      NotFound: { description: 'Resource not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      ValidationError: { description: 'Validation failed', content: { 'application/json': { schema: { $ref: '#/components/schemas/ValidationErrorResponse' } } } },
    },
    schemas: {
      ApiResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: { type: 'object', nullable: true },
          message: { type: 'string', nullable: true },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Not authorized' },
        },
      },
      ValidationErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Validation failed' },
          errors: { type: 'array', items: { type: 'object' } },
        },
      },
      User: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          name: { type: 'string', example: 'Rahul Jha' },
          email: { type: 'string', format: 'email', example: 'patient1@medilink.com' },
          role: { type: 'string', enum: Object.values(ROLES) },
          phone: { type: 'string' },
          avatar: { type: 'string', nullable: true },
          isEmailVerified: { type: 'boolean' },
          isActive: { type: 'boolean' },
        },
      },
      RegisterRequest: {
        type: 'object',
        required: ['name', 'email', 'password'],
        properties: {
          name: { type: 'string', example: 'Dr. Test' },
          email: { type: 'string', format: 'email', example: 'doctor@test.com' },
          password: { type: 'string', minLength: 6, example: 'password123' },
          role: { type: 'string', enum: [ROLES.PATIENT, ROLES.DOCTOR], default: ROLES.PATIENT },
          phone: { type: 'string', example: '+919876543210' },
          specialization: { type: 'string', enum: SPECIALIZATIONS, example: 'Cardiologist' },
          qualification: { type: 'string', example: 'MBBS, MD' },
          regNo: { type: 'string', example: 'MCI-TEST-001' },
          price: { type: 'number', example: 500 },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'patient1@medilink.com' },
          password: { type: 'string', example: 'pass123' },
        },
      },
      RefreshTokenRequest: {
        type: 'object',
        required: ['refreshToken'],
        properties: { refreshToken: { type: 'string' } },
      },
      ChangePasswordRequest: {
        type: 'object',
        required: ['currentPassword', 'newPassword'],
        properties: {
          currentPassword: { type: 'string', example: 'pass123' },
          newPassword: { type: 'string', minLength: 6, example: 'newpass123' },
        },
      },
      PatientUpdateRequest: {
        type: 'object',
        properties: {
          avatar: { type: 'string', format: 'binary' },
          name: { type: 'string' },
          phone: { type: 'string' },
          age: { type: 'integer', minimum: 0, maximum: 150 },
          gender: { type: 'string', enum: GENDERS },
          weight: { type: 'number' },
          height: { type: 'number' },
          bloodGroup: { type: 'string', enum: BLOOD_GROUPS },
          allergies: { type: 'array', items: { type: 'string' } },
          chronicConditions: { type: 'array', items: { type: 'string' } },
        },
      },
      DoctorUpdateRequest: {
        type: 'object',
        properties: {
          avatar: { type: 'string', format: 'binary' },
          name: { type: 'string' },
          phone: { type: 'string' },
          bio: { type: 'string', maxLength: 500 },
          experience: { type: 'integer', minimum: 0 },
          price: { type: 'number', minimum: 0 },
          languages: { type: 'array', items: { type: 'string' } },
          availability: { type: 'array', items: { type: 'object' } },
          hospital: { type: 'object' },
          qualification: { type: 'string' },
        },
      },
      ReviewRequest: {
        type: 'object',
        required: ['rating', 'consultationId'],
        properties: {
          rating: { type: 'integer', minimum: 1, maximum: 5, example: 5 },
          consultationId: { type: 'string' },
          comment: { type: 'string', maxLength: 500 },
        },
      },
      StartConsultationRequest: {
        type: 'object',
        required: ['doctorId'],
        properties: {
          doctorId: { type: 'string' },
          reason: { type: 'string', maxLength: 300, example: 'Fever and headache' },
        },
      },
      MessageRequest: {
        type: 'object',
        properties: {
          text: { type: 'string', maxLength: 2000 },
          document: { type: 'string', format: 'binary' },
        },
      },
      Medicine: {
        type: 'object',
        required: ['name', 'dosage', 'frequency', 'duration'],
        properties: {
          name: { type: 'string', example: 'Amlodipine' },
          dosage: { type: 'string', example: '5mg' },
          frequency: { type: 'string', example: 'Once daily' },
          duration: { type: 'string', example: '30 days' },
          instructions: { type: 'string' },
          quantity: { type: 'integer', minimum: 1, default: 1 },
          unitPrice: { type: 'number', minimum: 0, example: 50 },
        },
      },
      CreatePrescriptionRequest: {
        type: 'object',
        required: ['patientId', 'diagnosis', 'medicines'],
        properties: {
          patientId: { type: 'string' },
          consultationId: { type: 'string' },
          diagnosis: { type: 'string', example: 'Hypertension' },
          symptoms: { type: 'array', items: { type: 'string' } },
          medicines: { type: 'array', minItems: 1, items: { $ref: '#/components/schemas/Medicine' } },
          labTests: { type: 'array', items: { type: 'string' } },
          advice: { type: 'string' },
          followUpDate: { type: 'string', format: 'date-time' },
          notes: { type: 'string' },
        },
      },
      ShippingAddress: {
        type: 'object',
        required: ['name', 'phone', 'street', 'city', 'state', 'country', 'pincode'],
        properties: {
          name: { type: 'string', example: 'Rahul Jha' },
          phone: { type: 'string', example: '+919876543210' },
          street: { type: 'string', example: '221 Wellness Street' },
          city: { type: 'string', example: 'Mumbai' },
          state: { type: 'string', example: 'Maharashtra' },
          country: { type: 'string', example: 'India' },
          pincode: { type: 'string', example: '400001' },
        },
      },
      CreateOrderRequest: {
        type: 'object',
        required: ['shippingAddress'],
        properties: {
          prescriptionId: { type: 'string' },
          items: { type: 'array', items: { $ref: '#/components/schemas/Medicine' } },
          shippingAddress: { $ref: '#/components/schemas/ShippingAddress' },
          paymentMethod: { type: 'string', enum: PAYMENT_METHODS, default: 'cod' },
          deliveryFee: { type: 'number', minimum: 0 },
          tax: { type: 'number', minimum: 0 },
          discount: { type: 'number', minimum: 0 },
          notes: { type: 'string', maxLength: 500 },
        },
      },
      UpdateOrderStatusRequest: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: Object.values(ORDER_STATUS) },
          paymentStatus: { type: 'string', enum: Object.values(PAYMENT_STATUS) },
          note: { type: 'string', maxLength: 300 },
        },
      },
      AdminUserRequest: {
        allOf: [
          { $ref: '#/components/schemas/RegisterRequest' },
          {
            type: 'object',
            properties: {
              role: { type: 'string', enum: Object.values(ROLES) },
              isActive: { type: 'boolean' },
              isEmailVerified: { type: 'boolean' },
              patientProfile: { $ref: '#/components/schemas/PatientUpdateRequest' },
              doctorProfile: { $ref: '#/components/schemas/DoctorUpdateRequest' },
            },
          },
        ],
      },
    },
  },
  paths,
};

const swaggerSpec = swaggerJSDoc({
  definition: openApiDefinition,
  apis: [],
});

const swaggerUiOptions = {
  customSiteTitle: 'MediLink API Docs',
  explorer: true,
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'none',
    filter: true,
  },
};

module.exports = {
  swaggerUi,
  swaggerSpec,
  swaggerUiOptions,
};
