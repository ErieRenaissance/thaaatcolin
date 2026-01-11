// =============================================================================
// FERALIS PLATFORM - LOGGING INTERCEPTOR
// =============================================================================

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    // Add request ID if not present
    if (!request.headers['x-request-id']) {
      request.headers['x-request-id'] = uuidv4();
    }
    const requestId = request.headers['x-request-id'] as string;

    // Add request ID to response headers
    response.setHeader('X-Request-ID', requestId);

    const { method, url, ip } = request;
    const userAgent = request.headers['user-agent'] || '';
    const userId = (request as any).user?.id || 'anonymous';

    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const { statusCode } = response;

          this.logger.log(
            `${method} ${url} ${statusCode} ${duration}ms - ${userId}`,
            {
              requestId,
              method,
              url,
              statusCode,
              duration,
              userId,
              ip,
              userAgent: userAgent.substring(0, 100),
            },
          );
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          const statusCode = error.status || 500;

          this.logger.error(
            `${method} ${url} ${statusCode} ${duration}ms - ${userId}`,
            {
              requestId,
              method,
              url,
              statusCode,
              duration,
              userId,
              ip,
              error: error.message,
            },
          );
        },
      }),
    );
  }
}
