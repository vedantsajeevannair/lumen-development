import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || [
      'http://localhost:5173',
      'http://localhost:8081',
      'http://localhost:19006',
      'exp://10.24.81.55:8081',
      'http://10.24.81.55:8081',
    ],
  },
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const authHeader = client.handshake.headers.authorization;
      if (!authHeader) {
        throw new Error('No authorization header');
      }

      const token = authHeader.split(' ')[1];
      const payload = this.jwtService.verify(token);

      // Join a room specific to the user for direct notifications
      client.join(`user_${payload.sub}`);

      // If user is department/admin, join department rooms
      if (['DEPARTMENT', 'ADMIN', 'SUPER_ADMIN'].includes(payload.role)) {
        client.join('department_updates');
      }

      this.logger.log(`Client connected: ${client.id} (User: ${payload.sub})`);
    } catch (error: any) {
      const errMsg: string = error?.message || String(error);
      if (errMsg.includes('jwt expired')) {
        this.logger.debug(`Connection rejected: ${errMsg}`);
      } else {
        this.logger.warn(`Connection rejected: ${errMsg}`);
      }
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // Called by other services to broadcast updates
  emitComplaintUpdate(complaintId: string, update: any) {
    this.server.emit(`complaint_${complaintId}_update`, update);
    this.server
      .to('department_updates')
      .emit('complaint_status_changed', update);
  }

  emitTimelineAdded(complaintId: string, event: any) {
    this.server.emit(`complaint_${complaintId}_timeline`, event);
  }

  @SubscribeMessage('join_complaint')
  handleJoinComplaint(
    @ConnectedSocket() client: Socket,
    @MessageBody() complaintId: string,
  ) {
    client.join(`complaint_${complaintId}`);
    return { event: 'joined', data: complaintId };
  }

  @SubscribeMessage('leave_complaint')
  handleLeaveComplaint(
    @ConnectedSocket() client: Socket,
    @MessageBody() complaintId: string,
  ) {
    client.leave(`complaint_${complaintId}`);
    return { event: 'left', data: complaintId };
  }
}
