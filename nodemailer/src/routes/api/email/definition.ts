import type { FastifyRequest, FastifyReply } from "fastify";
import type { StandardResponse } from "@/lib/response";
import type { EmailSendResult } from "@/modules/email";
import type {
  SendSimpleEmailBody,
  SendTemplateEmailBody,
  SendBulkEmailBody,
} from "@/schemas/email.schema";

export type TEmailSendResponse = StandardResponse<EmailSendResult>;

export interface TBulkEmailSendData extends EmailSendResult {
  totalRecipients: number;
  rejectedCount: number;
}

export type TBulkEmailSendResponse = StandardResponse<TBulkEmailSendData>;

export interface IEmailController {
  /**
   * POST /api/email/send
   * Scenario 1 – Send a plain transactional email.
   */
  sendSimpleEmailHandler(
    request: FastifyRequest<{ Body: SendSimpleEmailBody }>,
    reply: FastifyReply,
  ): Promise<TEmailSendResponse | void>;

  /**
   * POST /api/email/send-template
   * Scenario 2 – Render a named HTML template and send the result.
   */
  sendTemplateEmailHandler(
    request: FastifyRequest<{ Body: SendTemplateEmailBody }>,
    reply: FastifyReply,
  ): Promise<TEmailSendResponse | void>;

  /**
   * POST /api/email/send-bulk
   * Scenario 3 – Send to multiple recipients with attachments.
   */
  sendBulkEmailHandler(
    request: FastifyRequest<{ Body: SendBulkEmailBody }>,
    reply: FastifyReply,
  ): Promise<TBulkEmailSendResponse | void>;
}
