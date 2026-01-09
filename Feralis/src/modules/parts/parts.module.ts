// =============================================================================
// FERALIS PLATFORM - PARTS MODULE
// =============================================================================

import { Module } from '@nestjs/common';
import { PartsService } from './parts.service';
import { PartsController } from './parts.controller';
import { PartRevisionsController } from './part-revisions.controller';
import { PartOperationsController } from './part-operations.controller';

@Module({
  controllers: [
    PartsController,
    PartRevisionsController,
    PartOperationsController,
  ],
  providers: [PartsService],
  exports: [PartsService],
})
export class PartsModule {}
