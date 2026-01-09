// =============================================================================
// FERALIS PLATFORM - UPDATE CUSTOMER DTO
// =============================================================================

import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateCustomerDto } from './create-customer.dto';

export class UpdateCustomerDto extends PartialType(
  OmitType(CreateCustomerDto, ['code'] as const),
) {
  // Code can be updated but requires validation
  code?: string;
}
