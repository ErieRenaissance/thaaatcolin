import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { PackagingService } from './packaging/packaging.service';
import { PackagingController } from './packaging/packaging.controller';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [PackagingController],
  providers: [PackagingService],
  exports: [PackagingService],
})
export class PackagingModule {}
