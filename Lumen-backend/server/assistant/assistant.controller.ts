import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AssistantService } from './assistant.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Assistant')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api')
export class AssistantController {
  constructor(private readonly assistant: AssistantService) {}

  /**
   * Open to every signed-in role. The queries it runs are read-only and
   * aggregate: an engineer sees the same picture of the backlog a supervisor
   * does. It answers questions about work already visible in the interface —
   * it does not expose an action the caller could not already take.
   */
  @Post('assistant')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ask a question about the complaint backlog' })
  async ask(@Body() body: { message?: string }) {
    const message = String(body?.message ?? '').trim();
    if (!message) throw new BadRequestException('A message is required.');
    // Bounded because the text is embedded in a model prompt downstream; an
    // unbounded body is both a cost and a prompt-stuffing surface.
    if (message.length > 500) throw new BadRequestException('Message too long.');
    return this.assistant.ask(message);
  }
}
