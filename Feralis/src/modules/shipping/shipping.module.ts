import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';

import { CarriersService } from './carriers/carriers.service';
import { CarriersController } from './carriers/carriers.controller';
import { ShipmentsService } from './shipments/shipments.service';
import { ShipmentsController } from './shipments/shipments.controller';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [CarriersController, ShipmentsController],
  providers: [CarriersService, ShipmentsService],
  exports: [CarriersService, ShipmentsService],
})
export class ShippingModule {}
