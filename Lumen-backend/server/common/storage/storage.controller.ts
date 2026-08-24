import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from './storage.service';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { UploadResponseDto } from './dto/upload-response.dto';
import {
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZES,
  ALLOWED_MIME_TYPES,
} from './storage.constants';
import { extname } from 'path';

@ApiTags('Storage')
@Controller('storage')
export class StorageController {
  private readonly logger = new Logger(StorageController.name);

  constructor(private readonly storageService: StorageService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a file to S3' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 201, type: UploadResponseDto })
  async uploadFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          // Basic validation will be done here, but custom logic is needed for dynamic sizes
        ],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
  ) {
    this.logger.log('Upload received');
    const extension = extname(file.originalname).toLowerCase().replace('.', '');
    const mimeType = file.mimetype;

    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      throw new HttpException(
        `Invalid file extension. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    let maxSize = MAX_FILE_SIZES.PDF;
    if (ALLOWED_MIME_TYPES.IMAGE.includes(mimeType)) {
      maxSize = MAX_FILE_SIZES.IMAGE;
    } else if (ALLOWED_MIME_TYPES.VIDEO.includes(mimeType)) {
      maxSize = MAX_FILE_SIZES.VIDEO;
    } else if (ALLOWED_MIME_TYPES.PDF.includes(mimeType)) {
      maxSize = MAX_FILE_SIZES.PDF;
    } else {
      throw new HttpException('Invalid file mime type', HttpStatus.BAD_REQUEST);
    }

    if (file.size > maxSize) {
      throw new HttpException(
        `File size exceeds maximum limit of ${maxSize / (1024 * 1024)} MB`,
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.storageService.uploadFile(file);
  }

  @Delete('*')
  @ApiOperation({ summary: 'Delete a file from S3' })
  async deleteFile(@Param('0') key: string) {
    await this.storageService.deleteFile(key);
    return { success: true, message: 'File deleted successfully' };
  }

  @Get('signed-url/*')
  @ApiOperation({ summary: 'Get a presigned URL for a file in S3' })
  async getSignedUrl(@Param('0') key: string) {
    const url = await this.storageService.getSignedUrl(key);
    return { url, expires: '15m' };
  }
}
