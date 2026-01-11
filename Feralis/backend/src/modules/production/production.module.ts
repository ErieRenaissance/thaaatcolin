import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';

// Work Centers
import { WorkCentersService } from './production/work-centers/work-centers.service';
import { WorkCentersController } from './production/work-centers/work-centers.controller';

// Machines
import { MachinesService } from './production/machines/machines.service';
import { MachinesController } from './production/machines/machines.controller';

// Work Orders
import { WorkOrdersService } from './production/work-orders/work-orders.service';
import { WorkOrdersController } from './production/work-orders/work-orders.controller';

// Labor
import { LaborService } from './production/labor/labor.service';
import { LaborController } from './production/labor/labor.controller';

// Scheduling
import { SchedulingService } from './production/scheduling/scheduling.service';
import { SchedulingController } from './production/scheduling/scheduling.controller';

@Module({
  imports: [
    PrismaModule,
    AuditModule,
  ],
  controllers: [
    WorkCentersController,
    MachinesController,
    WorkOrdersController,
    LaborController,
    SchedulingController,
  ],
  providers: [
    WorkCentersService,
    MachinesService,
    WorkOrdersService,
    LaborService,
    SchedulingService,
  ],
  exports: [
    WorkCentersService,
    MachinesService,
    WorkOrdersService,
    LaborService,
    SchedulingService,
  ],
})
export class ProductionModule {}
