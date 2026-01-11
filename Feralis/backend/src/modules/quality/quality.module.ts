import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';

// Inspections
import { InspectionsService } from './inspections/inspections.service';
import { InspectionsController } from './inspections/inspections.controller';

// NCRs
import { NCRService } from './ncrs/ncrs.service';
import { NCRController } from './ncrs/ncrs.controller';

// CAPAs
import { CAPAService } from './capas/capas.service';
import { CAPAController } from './capas/capas.controller';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [
    InspectionsController,
    NCRController,
    CAPAController,
  ],
  providers: [
    InspectionsService,
    NCRService,
    CAPAService,
  ],
  exports: [
    InspectionsService,
    NCRService,
    CAPAService,
  ],
})
export class QualityModule {}
