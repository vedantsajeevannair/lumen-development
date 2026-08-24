import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsObject } from 'class-validator';

export class VerifyIdentityDto {
  @ApiProperty({
    description:
      'The type of document uploaded (e.g., PASSPORT, DRIVERS_LICENSE)',
  })
  @IsString()
  @IsNotEmpty()
  documentType!: string;

  @ApiProperty({
    description:
      'The JSON data/metadata containing the document URLs. Requires idDocumentUrl and selfieUrl.',
    example: { idDocumentUrl: 'https://...', selfieUrl: 'https://...' },
  })
  @IsObject()
  @IsNotEmpty()
  documents!: Record<string, any>;
}
