// =============================================================================
// FERALIS PLATFORM - NOTIFICATIONS CONTROLLER
// =============================================================================

import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get user notifications' })
  @ApiResponse({ status: 200, description: 'Notifications retrieved successfully' })
  async findAll(
    @CurrentUser() currentUser: any,
    @Query('unreadOnly') unreadOnly?: boolean,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.notificationsService.findForUser(currentUser.id, {
      unreadOnly,
      limit: limit ? parseInt(String(limit), 10) : undefined,
      offset: offset ? parseInt(String(offset), 10) : undefined,
    });
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  async getUnreadCount(@CurrentUser() currentUser: any) {
    const count = await this.notificationsService.getUnreadCount(currentUser.id);
    return { count };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  async markAsRead(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: any,
  ) {
    return this.notificationsService.markAsRead(id, currentUser.id);
  }

  @Post('mark-all-read')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@CurrentUser() currentUser: any) {
    const count = await this.notificationsService.markAllAsRead(currentUser.id);
    return { message: `${count} notifications marked as read` };
  }

  @Patch(':id/dismiss')
  @ApiOperation({ summary: 'Dismiss notification' })
  async dismiss(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: any,
  ) {
    return this.notificationsService.dismiss(id, currentUser.id);
  }

  @Post('dismiss-all')
  @ApiOperation({ summary: 'Dismiss all notifications' })
  async dismissAll(@CurrentUser() currentUser: any) {
    const count = await this.notificationsService.dismissAll(currentUser.id);
    return { message: `${count} notifications dismissed` };
  }
}
