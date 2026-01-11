// =============================================================================
// FERALIS PLATFORM - UPDATE ROLE DTO
// =============================================================================

import { PartialType } from '@nestjs/swagger';
import { CreateRoleDto } from './create-role.dto';

export class UpdateRoleDto extends PartialType(CreateRoleDto) {}
