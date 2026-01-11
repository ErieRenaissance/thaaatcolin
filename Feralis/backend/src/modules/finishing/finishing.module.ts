import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { AuditModule } from './audit/audit.module';
import { FinishingService } from './finishing/finishing.service';
import { FinishingController } from './finishing/finishing.controller';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [FinishingController],
  providers: [FinishingService],
  exports: [FinishingService],
})
export class FinishingModule {}
