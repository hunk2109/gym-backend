import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OutboxService } from './outbox.service';
import { GetOutboxQueryDto } from './dto/enqueue-notification.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('outbox')
@UseGuards(JwtAuthGuard)
export class OutboxController {
  constructor(private readonly outboxService: OutboxService) {}

  @Get('stats')
  async getStats() {
    return this.outboxService.getQueueStats();
  }

  @Get('items')
  async getItems(@Query() query: GetOutboxQueryDto) {
    return this.outboxService.getOutboxHistory(query);
  }

  @Post(':id/retry')
  async retryMessage(@Param('id') id: string) {
    return this.outboxService.retryMessage(id);
  }

  @Delete(':id')
  async cancelMessage(@Param('id') id: string) {
    await this.outboxService.cancelMessage(id);
    return { success: true, message: 'Mensaje eliminado del Outbox' };
  }
}
