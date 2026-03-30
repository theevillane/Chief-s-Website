'use strict';

const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi    = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title:       'Jimo East Chief Digital Services API',
      version:     '1.0.0',
      description: 'Production REST API for the Jimo East Location NGAO Digital Portal. Serves 20 villages under Chief John Otieno Otieno.',
      contact: {
        name:  'Jimo East NGAO Office',
        email: 'jimoeast@ngao.go.ke',
      },
      license: { name: 'Kenya Government Open Data', url: 'https://opendata.go.ke' },
    },
    servers: [
      { url: 'http://localhost:5000', description: 'Development Server' },
      { url: 'https://api.jimoeast.go.ke', description: 'Production Server' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token obtained from /api/auth/login',
        },
      },
      schemas: {
        // ── User ──────────────────────────────────────────────────────────────
        User: {
          type: 'object',
          properties: {
            _id:        { type: 'string', example: '665f1a2b3c4d5e6f7a8b9c0d' },
            name:       { type: 'string', example: 'Ryan Tibbs' },
            id_number:  { type: 'string', example: '12345678' },
            phone:      { type: 'string', example: '0712345678' },
            email:      { type: 'string', example: 'ryan@example.com' },
            village:    { type: 'string', example: 'asaye West' },
            role:       { type: 'string', enum: ['citizen','admin','chief','assistant_chief'] },
            verified:   { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        // ── Service Request / Letter ──────────────────────────────────────────
        ServiceRequest: {
          type: 'object',
          properties: {
            _id:         { type: 'string' },
            ref_number:  { type: 'string', example: 'JE-2025-001' },
            letter_type: { type: 'string', enum: ['id_letter','residence','school','conduct','intro_id'] },
            citizen_uid: { type: 'string' },
            village:     { type: 'string' },
            purpose:     { type: 'string' },
            status:      { type: 'string', enum: ['submitted','under_review','approved','rejected','resolved'] },
            letter_pdf_url: { type: 'string' },
            created_at:  { type: 'string', format: 'date-time' },
          },
        },
        // ── Dispute ───────────────────────────────────────────────────────────
        Dispute: {
          type: 'object',
          properties: {
            _id:          { type: 'string' },
            ref_number:   { type: 'string', example: 'JE-D-1023' },
            type:         { type: 'string', enum: ['Land Boundary','Family Conflict','Inheritance','Neighbor Dispute','Water Rights','Other'] },
            parties:      { type: 'string' },
            description:  { type: 'string' },
            village:      { type: 'string' },
            status:       { type: 'string', enum: ['submitted','under_review','hearing_scheduled','resolved','closed'] },
            hearing_date: { type: 'string', format: 'date-time' },
          },
        },
        // ── Error ─────────────────────────────────────────────────────────────
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string',  example: 'Validation failed' },
            errors:  { type: 'array',   items: { type: 'object' } },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
    tags: [
      { name: 'Auth',          description: 'Registration, login, OTP verification' },
      { name: 'Letters',       description: 'Official letter requests and approvals' },
      { name: 'Disputes',      description: 'Community dispute filing and resolution' },
      { name: 'Security',      description: 'Security incident reporting' },
      { name: 'Illicit',       description: 'Confidential illicit activity reports' },
      { name: 'Announcements', description: 'Public announcements and barazas' },
      { name: 'Admin',         description: 'Admin-only analytics and management' },
    ],
  },
  apis: ['./routes/*.js', './controllers/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = { swaggerUi, swaggerSpec };
