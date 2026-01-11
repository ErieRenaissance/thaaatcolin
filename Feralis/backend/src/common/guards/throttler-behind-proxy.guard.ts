// =============================================================================
// FERALIS PLATFORM - THROTTLER GUARD (PROXY-AWARE)
// =============================================================================

import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class ThrottlerBehindProxyGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Get the real IP behind a proxy/load balancer
    return (
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.headers['x-real-ip'] ||
      req.connection?.remoteAddress ||
      req.ip
    );
  }

  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    // Skip throttling for health checks
    const request = context.switchToHttp().getRequest();
    if (request.url === '/health' || request.url === '/api/health') {
      return true;
    }
    return false;
  }
}
