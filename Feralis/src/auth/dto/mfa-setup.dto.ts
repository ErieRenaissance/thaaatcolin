// =============================================================================
// FERALIS PLATFORM - MFA SETUP DTO
// =============================================================================

import { ApiProperty } from '@nestjs/swagger';

export class MfaSetupDto {
  @ApiProperty({
    description: 'Base32-encoded secret for TOTP',
    example: 'JBSWY3DPEHPK3PXP',
  })
  secret: string;

  @ApiProperty({
    description: 'OTPAuth URL for QR code generation',
    example: 'otpauth://totp/Feralis:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Feralis',
  })
  otpauthUrl: string;

  @ApiProperty({
    description: 'Data URL for QR code image',
    example: 'data:image/png;base64,...',
  })
  qrCodeDataUrl: string;
}
