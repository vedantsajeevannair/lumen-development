import { ApiProperty } from '@nestjs/swagger';

export class UploadResponseDto {
  @ApiProperty({
    example: 'https://bucket.s3.region.amazonaws.com/path/to/file.jpg',
  })
  url: string;

  @ApiProperty({
    example: 'https://bucket.s3.region.amazonaws.com/path/to/file.jpg',
  })
  imageUrl: string;

  @ApiProperty({ example: 'complaints/images/2026/07/15/uuid.jpg' })
  key: string;

  @ApiProperty({ example: 'lumen-smartcity-storage' })
  bucket: string;

  @ApiProperty({ example: 102400 })
  size: number;

  @ApiProperty({ example: 'image/jpeg' })
  mimeType: string;
}
