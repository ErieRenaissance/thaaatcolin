// =============================================================================
// FERALIS PLATFORM - UPDATE LOCATION DTO
// =============================================================================

import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateLocationDto } from './create-location.dto';

export class UpdateLocationDto extends PartialType(
  OmitType(CreateLocationDto, ['facilityId', 'code'] as const),
) {}
