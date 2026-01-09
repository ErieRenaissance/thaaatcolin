// =============================================================================
// FERALIS PLATFORM - INVENTORY MODULE
// =============================================================================

import { Module } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { InventoryLocationsController } from './inventory-locations.controller';

@Module({
  controllers: [InventoryController, InventoryLocationsController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
