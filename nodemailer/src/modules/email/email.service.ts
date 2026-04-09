/**
 * email.service.ts
 *
 * Implements IEmailService covering 3 email scenarios:
 *
 *  1. sendSimpleEmail   – Plain transactional email (text/HTML)
 *  2. sendTemplateEmail – Styled HTML rendered from a named template
 *  3. sendBulkEmail     – Multi-recipient email with CC, BCC, and attachments
 *
 * All methods delegate transport to the shared `sendMail` helper from
 * `@/lib/mailer`, keeping transport config decoupled from business logic.
 */

import { sendMail } from "@/lib/mailer";
import {
  buildWelcomeTemplate,
  buildOtpTemplate,
  buildNotificationTemplate,
} from "@/lib/email-templates";

import type {
  IEmailService,
  EmailSendResult,
  SendSimpleEmailInput,
  SendTemplateEmailInput,
  SendBulkEmailInput,
  TemplatePayload,
} from "./email.definition";

// ---------------------------------------------------------------------------
// Helper – normalise MailResult → EmailSendResult
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Service implementation
// ---------------------------------------------------------------------------

export class EmailService implements IEmailService {
  // -------------------------------------------------------------------------
  // Scenario 1 – Simple / Transactional Email
  // -------------------------------------------------------------------------

  /**
   * Sends a plain transactional email.
   *
   * **Use cases:** password reset links, account activity alerts,
   * simple one-off notification messages.
   *
   * At least one of `text` or `html` must be provided in the `input`.
   * When both are supplied, `html` is used as the primary body and
   * `text` serves as the accessible plain-text fallback.
   */
  async sendSimpleEmail(input: SendSimpleEmailInput): Promise<EmailSendResult> {
    const result = await sendMail({
      from: input.from, // falls back to SMTP_FROM inside sendMail()
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
      replyTo: input.replyTo,
    });

    return {
      messageId: result.messageId,
      accepted: result.accepted,
      rejected: result.rejected,
      smtpResponse: result.response,
    };
  }

  // -------------------------------------------------------------------------
  // Scenario 2 – Template-based Email
  // -------------------------------------------------------------------------

  /**
   * Renders a named HTML template and sends the resulting email.
   *
   * **Use cases:**
   *  - `"welcome"`      – New user on-boarding email with CTA button
   *  - `"otp"`          – Two-factor / verification code email
   *  - `"notification"` – Styled alert/report with optional data table
   *
   * Template rendering is done server-side (pure string interpolation,
   * no external rendering engine required).
   */
  async sendTemplateEmail(
    input: SendTemplateEmailInput,
  ): Promise<EmailSendResult> {
    const html = this._renderTemplate(input.templateData);

    const result = await sendMail({
      from: input.from,
      to: input.to,
      subject: input.subject,
      html,
      // Plain-text fallback strips the HTML tags
      text: this._stripHtml(html),
      replyTo: input.replyTo,
    });

    return {
      messageId: result.messageId,
      accepted: result.accepted,
      rejected: result.rejected,
      smtpResponse: result.response,
    };
  }

  // -------------------------------------------------------------------------
  // Scenario 3 – Bulk Email with Attachments
  // -------------------------------------------------------------------------

  /**
   * Sends an email to multiple recipients with optional file attachments.
   *
   * **Use cases:** weekly digest reports, invoice delivery, broadcast
   * notifications with supporting documents attached.
   *
   * Attachments are supplied as Base64-encoded strings (content) along with
   * their filename and MIME type. The service decodes them before passing to
   * nodemailer so the API layer doesn't need filesystem access.
   */
  async sendBulkEmail(input: SendBulkEmailInput): Promise<EmailSendResult> {
    // Convert incoming Base64 attachments to nodemailer-compatible format
    const attachments = (input.attachments ?? []).map((att) => ({
      filename: att.filename,
      content: Buffer.from(att.content, "base64"),
      contentType: att.contentType,
    }));

    const result = await sendMail({
      from: input.from,
      to: input.to,
      cc: input.cc,
      bcc: input.bcc,
      subject: input.subject,
      text: input.text,
      html: input.html,
      replyTo: input.replyTo,
      attachments,
    });

    return {
      messageId: result.messageId,
      accepted: result.accepted,
      rejected: result.rejected,
      smtpResponse: result.response,
    };
  }

  // -------------------------------------------------------------------------
  // Private utilities
  // -------------------------------------------------------------------------

  /**
   * Dispatches to the correct template builder based on the discriminator
   * field `templateData.template`.
   */
  private _renderTemplate(data: TemplatePayload): string {
    switch (data.template) {
      case "welcome":
        return buildWelcomeTemplate({
          name: data.name,
          ctaUrl: data.ctaUrl,
          ctaLabel: data.ctaLabel,
          appName: data.appName,
        });

      case "otp":
        return buildOtpTemplate({
          name: data.name,
          otp: data.otp,
          expiresInMinutes: data.expiresInMinutes,
          appName: data.appName,
        });

      case "notification":
        return buildNotificationTemplate({
          name: data.name,
          title: data.title,
          description: data.description,
          items: data.items,
          appName: data.appName,
        });
    }
  }

  /**
   * Naive HTML stripper for generating plain-text fallbacks.
   * Removes tags and collapses whitespace.
   */
  private _stripHtml(html: string): string {
    return html
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim();
  }
}

/** Singleton instance shared across the application. */
export const emailService = new EmailService();
