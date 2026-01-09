// =============================================================================
// FERALIS PLATFORM - ENVIRONMENT VALIDATION SCHEMA
// =============================================================================

// Note: Install joi with: npm install joi
import Joi from 'joi';

export const validationSchema = Joi.object({
  // Application
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'staging')
    .default('development'),
  PORT: Joi.number().default(3000),
  APP_NAME: Joi.string().default('Feralis'),
  APP_URL: Joi.string().uri().default('http://localhost:3000'),
  FRONTEND_URL: Joi.string().uri().default('http://localhost:5173'),

  // Database
  DATABASE_URL: Joi.string().required(),
  DATABASE_HOST: Joi.string().default('localhost'),
  DATABASE_PORT: Joi.number().default(5432),
  DATABASE_NAME: Joi.string().default('feralis'),
  DATABASE_USER: Joi.string().default('feralis'),
  DATABASE_PASSWORD: Joi.string().allow(''),
  DATABASE_SSL: Joi.boolean().default(false),

  // Redis
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').default(''),
  REDIS_DB: Joi.number().default(0),
  REDIS_URL: Joi.string().optional(),

  // MinIO
  MINIO_ENDPOINT: Joi.string().default('localhost'),
  MINIO_PORT: Joi.number().default(9000),
  MINIO_USE_SSL: Joi.boolean().default(false),
  MINIO_ACCESS_KEY: Joi.string().required(),
  MINIO_SECRET_KEY: Joi.string().required(),
  MINIO_BUCKET_FILES: Joi.string().default('feralis-files'),
  MINIO_BUCKET_CAD: Joi.string().default('feralis-cad'),
  MINIO_BUCKET_TEMP: Joi.string().default('feralis-temp'),

  // JWT
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRATION: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRATION: Joi.string().default('7d'),

  // Password Policy
  PASSWORD_MIN_LENGTH: Joi.number().min(8).default(12),
  PASSWORD_REQUIRE_UPPERCASE: Joi.boolean().default(true),
  PASSWORD_REQUIRE_LOWERCASE: Joi.boolean().default(true),
  PASSWORD_REQUIRE_NUMBER: Joi.boolean().default(true),
  PASSWORD_REQUIRE_SPECIAL: Joi.boolean().default(true),
  PASSWORD_CHECK_BREACH: Joi.boolean().default(true),

  // Session
  SESSION_MAX_CONCURRENT: Joi.number().default(5),
  SESSION_TIMEOUT_MINUTES: Joi.number().default(30),
  SESSION_ABSOLUTE_TIMEOUT_HOURS: Joi.number().default(12),

  // MFA
  MFA_ISSUER: Joi.string().default('Feralis'),
  MFA_BACKUP_CODES_COUNT: Joi.number().default(10),

  // Lockout
  LOCKOUT_THRESHOLD: Joi.number().default(5),
  LOCKOUT_DURATION_MINUTES: Joi.number().default(30),

  // Rate Limiting
  THROTTLE_TTL: Joi.number().default(60),
  THROTTLE_LIMIT: Joi.number().default(100),
  THROTTLE_LOGIN_TTL: Joi.number().default(300),
  THROTTLE_LOGIN_LIMIT: Joi.number().default(5),

  // CORS
  CORS_ORIGINS: Joi.string().default('http://localhost:5173'),
  CORS_CREDENTIALS: Joi.boolean().default(true),

  // Logging
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'log', 'debug', 'verbose')
    .default('debug'),
  LOG_FORMAT: Joi.string().valid('json', 'simple').default('json'),

  // Email
  MAIL_HOST: Joi.string().optional(),
  MAIL_PORT: Joi.number().default(587),
  MAIL_USER: Joi.string().optional(),
  MAIL_PASSWORD: Joi.string().optional(),

  // Swagger
  SWAGGER_ENABLED: Joi.boolean().default(true),

  // Audit
  AUDIT_LOG_ENABLED: Joi.boolean().default(true),

  // Encryption
  ENCRYPTION_KEY: Joi.string().min(32).optional(),
});
