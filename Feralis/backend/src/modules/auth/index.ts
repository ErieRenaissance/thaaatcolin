// =============================================================================
// FERALIS PLATFORM - AUTH MODULE EXPORTS
// =============================================================================

export * from './auth.module';
export * from './auth.service';
export * from './auth.controller';
export * from './password.service';
export * from './mfa.service';
export * from './token.service';

// Guards
export * from './guards/jwt-auth.guard';
export * from './guards/permissions.guard';
export * from './guards/roles.guard';

// Decorators
export * from './decorators/current-user.decorator';
export * from './decorators/public.decorator';
export * from './decorators/permissions.decorator';
export * from './decorators/roles.decorator';

// Strategies
export * from './strategies/jwt.strategy';
export * from './strategies/jwt-refresh.strategy';
export * from './strategies/local.strategy';

// DTOs
export * from './dto/login.dto';
export * from './dto/mfa-verify.dto';
export * from './dto/refresh-token.dto';
export * from './dto/forgot-password.dto';
export * from './dto/reset-password.dto';
export * from './dto/change-password.dto';
export * from './dto/mfa-setup.dto';
export * from './dto/mfa-enable.dto';
