import type { FastifyReply } from 'fastify';
import { logger } from '../../../logger/Logger';

export function invalidRequest(reply: FastifyReply, logMessage: string) {
  logger.warn(`invalid request: ${logMessage}`);
  return reply.code(400);
}

export function notFound(reply: FastifyReply, logMessage: string) {
  logger.warn(`not found: ${logMessage}`);
  return reply.code(404);
}
