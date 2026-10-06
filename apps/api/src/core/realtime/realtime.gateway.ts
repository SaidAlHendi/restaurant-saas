import { WebSocketGateway } from '@nestjs/websockets';

/** Stub Socket.io gateway — auth and rooms in a later milestone. */
@WebSocketGateway({ namespace: '/rt', cors: { origin: true } })
export class RealtimeGateway {}
