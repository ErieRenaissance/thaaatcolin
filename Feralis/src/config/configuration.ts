// =============================================================================
// FERALIS PLATFORM - CONFIGURATION
// =============================================================================

export default () => ({
  // Application
  app: {
    name: process.env.APP_NAME || 'Feralis',
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT, 10) || 3000,
    url: process.env.APP_URL || 'http://localhost:3000',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
    apiPrefix: process.env.API_PREFIX || 'api/v1',
  },

  // Database
  database: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
    name: process.env.DATABASE_NAME || 'feralis',
    user: process.env.DATABASE_USER || 'feralis',
    password: process.env.DATABASE_PASSWORD,
    url: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true',
  },

  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB, 10) || 0,
    url: process.env.REDIS_URL,
  },

  // MinIO / S3
  storage: {
    endpoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT, 10) || 9000,
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY,
    secretKey: process.env.MINIO_SECRET_KEY,
    buckets: {
      files: process.env.MINIO_BUCKET_FILES || 'feralis-files',
      cad: process.env.MINIO_BUCKET_CAD || 'feralis-cad',
      temp: process.env.MINIO_BUCKET_TEMP || 'feralis-temp',
    },
  },

  // JWT & Authentication
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiration: process.env.JWT_ACCESS_EXPIRATION || '15m',
    refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
  },

  // Password Policy
  password: {
    minLength: parseInt(process.env.PASSWORD_MIN_LENGTH, 10) || 12,
    requireUppercase: process.env.PASSWORD_REQUIRE_UPPERCASE !== 'false',
    requireLowercase: process.env.PASSWORD_REQUIRE_LOWERCASE !== 'false',
    requireNumber: process.env.PASSWORD_REQUIRE_NUMBER !== 'false',
    requireSpecial: process.env.PASSWORD_REQUIRE_SPECIAL !== 'false',
    checkBreach: process.env.PASSWORD_CHECK_BREACH !== 'false',
  },

  // Session
  session: {
    maxConcurrent: parseInt(process.env.SESSION_MAX_CONCURRENT, 10) || 5,
    timeoutMinutes: parseInt(process.env.SESSION_TIMEOUT_MINUTES, 10) || 30,
    absoluteTimeoutHours: parseInt(process.env.SESSION_ABSOLUTE_TIMEOUT_HOURS, 10) || 12,
  },

  // MFA
  mfa: {
    issuer: process.env.MFA_ISSUER || 'Feralis',
    backupCodesCount: parseInt(process.env.MFA_BACKUP_CODES_COUNT, 10) || 10,
  },

  // Account Lockout
  lockout: {
    threshold: parseInt(process.env.LOCKOUT_THRESHOLD, 10) || 5,
    durationMinutes: parseInt(process.env.LOCKOUT_DURATION_MINUTES, 10) || 30,
  },

  // Rate Limiting
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL, 10) || 60,
    limit: parseInt(process.env.THROTTLE_LIMIT, 10) || 100,
    loginTtl: parseInt(process.env.THROTTLE_LOGIN_TTL, 10) || 300,
    loginLimit: parseInt(process.env.THROTTLE_LOGIN_LIMIT, 10) || 5,
  },

  // CORS
  cors: {
    origins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173'],
    credentials: process.env.CORS_CREDENTIALS !== 'false',
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'debug',
    format: process.env.LOG_FORMAT || 'json',
    fileEnabled: process.env.LOG_FILE_ENABLED === 'true',
    filePath: process.env.LOG_FILE_PATH || 'logs/app.log',
  },

  // Email
  mail: {
    host: process.env.MAIL_HOST,
    port: parseInt(process.env.MAIL_PORT, 10) || 587,
    secure: process.env.MAIL_SECURE === 'true',
    user: process.env.MAIL_USER,
    password: process.env.MAIL_PASSWORD,
    fromName: process.env.MAIL_FROM_NAME || 'Feralis',
    fromAddress: process.env.MAIL_FROM_ADDRESS || 'noreply@feralis.com',
  },

  // Swagger
  swagger: {
    enabled: process.env.SWAGGER_ENABLED !== 'false',
    title: process.env.SWAGGER_TITLE || 'Feralis API',
    description: process.env.SWAGGER_DESCRIPTION || 'Feralis Manufacturing Operations Platform API',
    version: process.env.SWAGGER_VERSION || '1.0',
    path: process.env.SWAGGER_PATH || 'docs',
  },

  // Audit
  audit: {
    enabled: process.env.AUDIT_LOG_ENABLED !== 'false',
    retentionDays: parseInt(process.env.AUDIT_LOG_RETENTION_DAYS, 10) || 2555,
  },

  // Encryption
  encryption: {
    key: process.env.ENCRYPTION_KEY,
  },
});
