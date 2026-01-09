// =============================================================================
// FERALIS PLATFORM - ASSIGN ROLE DTO
// =============================================================================

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsOptional } from 'class-validator';

export class AssignRoleDto {
  @ApiProperty({
    description: 'Role ID to assign',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  roleId: string;

  @ApiPropertyOptional({
    description: 'Facility ID (for facility-scoped roles)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  facilityId?: string;
}
