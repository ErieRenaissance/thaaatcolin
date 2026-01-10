/**
 * Feralis Manufacturing Platform
 * Prisma Service
 * 
 * This service provides the Prisma client instance for database operations.
 * It handles connection lifecycle and extends Prisma with soft delete functionality.
 */

import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient<Prisma.PrismaClientOptions, 'query' | 'error' | 'info' | 'warn'>
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' },
      ],
    });

    // Log queries in development
    if (process.env.NODE_ENV === 'development') {
      this.$on('query', (e) => {
        this.logger.debug(`Query: ${e.query}`);
        this.logger.debug(`Params: ${e.params}`);
        this.logger.debug(`Duration: ${e.duration}ms`);
      });
    }

    // Always log errors
    this.$on('error', (e) => {
      this.logger.error(`Database error: ${e.message}`);
    });
  }

  async onModuleInit(): Promise<void> {
    this.logger.log('Connecting to database...');
    await this.$connect();
    this.logger.log('Connected to database');
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Disconnecting from database...');
    await this.$disconnect();
    this.logger.log('Disconnected from database');
  }

  /**
   * Execute a raw query with proper error handling
   */
  async executeRaw<T = unknown>(query: string, params?: any[]): Promise<T[]> {
    try {
      if (params && params.length > 0) {
        return await this.$queryRawUnsafe<T[]>(query, ...params);
      }
      return await this.$queryRawUnsafe<T[]>(query);
    } catch (error) {
      this.logger.error(`Raw query failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Execute a raw command (INSERT, UPDATE, DELETE) with proper error handling
   */
  async executeCommand(query: string, params?: any[]): Promise<number> {
    try {
      if (params && params.length > 0) {
        return await this.$executeRawUnsafe(query, ...params);
      }
      return await this.$executeRawUnsafe(query);
    } catch (error) {
      this.logger.error(`Raw command failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Clean database for testing purposes
   * WARNING: Only use in test environment!
   */
  async cleanDatabase(): Promise<void> {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('cleanDatabase can only be used in test environment');
    }

    const tablenames = await this.$queryRaw<
      Array<{ tablename: string }>
    >`SELECT tablename FROM pg_tables WHERE schemaname='public'`;

    const tables = tablenames
      .map(({ tablename }) => tablename)
      .filter((name) => name !== '_prisma_migrations')
      .map((name) => `"public"."${name}"`)
      .join(', ');

    if (tables.length > 0) {
      await this.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
    }
  }

  /**
   * Health check for database connection
   */
  async healthCheck(): Promise<{ status: 'ok' | 'error'; latencyMs: number; message?: string }> {
    const start = Date.now();
    try {
      await this.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        latencyMs: Date.now() - start,
      };
    } catch (error) {
      return {
        status: 'error',
        latencyMs: Date.now() - start,
        message: error.message,
      };
    }
  }
}
