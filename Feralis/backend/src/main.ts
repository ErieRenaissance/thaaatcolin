// =============================================================================
// FERALIS PLATFORM - MAIN ENTRY POINT
// =============================================================================

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);
  
  // Security middleware
  app.use(helmet());
  app.use(cookieParser());

  // CORS configuration
  app.enableCors({
    origin: configService.get<string>('CORS_ORIGINS')?.split(',') || ['http://localhost:5173'],
    credentials: configService.get<boolean>('CORS_CREDENTIALS') ?? true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Organization-ID'],
  });

  // API versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'api/v',
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      validationError: {
        target: false,
        value: false,
      },
    }),
  );

  // Swagger documentation
  if (configService.get<boolean>('SWAGGER_ENABLED') !== false) {
    const config = new DocumentBuilder()
      .setTitle(configService.get<string>('SWAGGER_TITLE') || 'Feralis API')
      .setDescription(
        configService.get<string>('SWAGGER_DESCRIPTION') ||
          'Feralis Manufacturing Operations Platform API',
      )
      .setVersion(configService.get<string>('SWAGGER_VERSION') || '1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT token',
          in: 'header',
        },
        'JWT-auth',
      )
      .addTag('Auth', 'Authentication endpoints')
      .addTag('Users', 'User management endpoints')
      .addTag('Organizations', 'Organization management endpoints')
      .addTag('Facilities', 'Facility management endpoints')
      .addTag('Roles', 'Role management endpoints')
      .addTag('Permissions', 'Permission management endpoints')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup(
      configService.get<string>('SWAGGER_PATH') || 'docs',
      app,
      document,
      {
        swaggerOptions: {
          persistAuthorization: true,
          tagsSorter: 'alpha',
          operationsSorter: 'alpha',
        },
      },
    );
  }

  // Start server
  const port = configService.get<number>('PORT') || 3000;
  await app.listen(port);
  
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                    FERALIS PLATFORM                           ║
║                                                               ║
║   🚀 Server running on: http://localhost:${port}                 ║
║   📚 API Docs: http://localhost:${port}/docs                     ║
║   🔧 Environment: ${configService.get('NODE_ENV') || 'development'}                           ║
╚═══════════════════════════════════════════════════════════════╝
  `);
}

bootstrap();
