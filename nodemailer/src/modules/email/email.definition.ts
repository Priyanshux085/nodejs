/**
 * email.definition.ts
 *
 * Type definitions, DTOs, and service interface for the Email module.
 * Kept separate from implementation so consumers can import types without
 * pulling in service dependencies.
 */

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

/** A single email address, optionally with a display name. */
export interface EmailAddress {
  address: string;
  name?: string;
}

/** Result returned from every email send operation. */
export interface EmailSendResult {
  /** Nodemailer message ID */
  messageId: string;
  /**
   * Addresses that were accepted by the SMTP server.
   * Type mirrors nodemailer's accepted field.
   */
  accepted: (string | { name: string; address: string })[];
  /**
   * Addresses that were rejected by the SMTP server.
   */
  rejected: (string | { name: string; address: string })[];
  /** Raw SMTP response string */
  smtpResponse: string;
}

// ---------------------------------------------------------------------------
// Scenario 1 – Simple / Transactional Email
// ---------------------------------------------------------------------------

/** Input for sending a plain transactional email. */
export interface SendSimpleEmailInput {
  /** Recipient email address(es) */
  to: string | string[];
  /** Email subject line */
  subject: string;
  /**
   * Plain-text body. Shown in email clients that don't render HTML
   * and used as the accessible alternative when `html` is also supplied.
   */
  text?: string;
  /** HTML body. Takes precedence over `text` when both are supplied. */
  html?: string;
  /**
   * Optional custom "From" address.
   * Falls back to SMTP_FROM env var.
   */
  from?: string;
  /** Optional Reply-To address */
  replyTo?: string;
}

// ---------------------------------------------------------------------------
// Scenario 2 – Template-based Email (OTP / Welcome)
// ---------------------------------------------------------------------------

/** Recognised template identifiers. */
export type EmailTemplateName = "welcome" | "otp" | "notification";

/** Data required by the "welcome" template. */
export interface WelcomeTemplatePayload {
  template: "welcome";
  name: string;
  ctaUrl: string;
  ctaLabel?: string;
  appName?: string;
}

/** Data required by the "otp" template. */
export interface OtpTemplatePayload {
  template: "otp";
  name: string;
  otp: string;
  expiresInMinutes?: number;
  appName?: string;
}

/** Data required by the "notification" template. */
export interface NotificationTemplatePayload {
  template: "notification";
  name: string;
  title: string;
  description: string;
  items?: { label: string; value: string }[];
  appName?: string;
}

export type TemplatePayload =
  | WelcomeTemplatePayload
  | OtpTemplatePayload
  | NotificationTemplatePayload;

/** Input for sending a template-rendered email. */
export interface SendTemplateEmailInput {
  /** Recipient email address(es) */
  to: string | string[];
  /** Email subject line */
  subject: string;
  /** Template data (discriminated union on `template` field) */
  templateData: TemplatePayload;
  /** Optional custom "From" address */
  from?: string;
  /** Optional Reply-To address */
  replyTo?: string;
}

// ---------------------------------------------------------------------------
// Scenario 3 – Bulk Email with Attachments
// ---------------------------------------------------------------------------

/** An email attachment descriptor. */
export interface EmailAttachment {
  /** Filename displayed to the recipient */
  filename: string;
  /**
   * File content as a Base64-encoded string.
   * The service will decode this before passing to nodemailer.
   */
  content: string;
  /** MIME content type, e.g. "application/pdf" or "image/png" */
  contentType?: string;
}

/** Input for sending a bulk email (multiple recipients + attachments). */
export interface SendBulkEmailInput {
  /** Primary recipient address(es) */
  to: string[];
  /** CC recipients */
  cc?: string[];
  /** BCC recipients (hidden from other recipients) */
  bcc?: string[];
  /** Email subject line */
  subject: string;
  /** Plain-text body */
  text?: string;
  /** HTML body */
  html?: string;
  /** List of file attachments (Base64-encoded content) */
  attachments?: EmailAttachment[];
  /** Optional custom "From" address */
  from?: string;
  /** Optional Reply-To address */
  replyTo?: string;
}

// ---------------------------------------------------------------------------
// Service Interface
// ---------------------------------------------------------------------------

export interface IEmailService {
  /**
   * Scenario 1: Send a plain transactional email.
   * Suitable for simple notifications where a full template is not needed.
   */
  sendSimpleEmail(input: SendSimpleEmailInput): Promise<EmailSendResult>;

  /**
   * Scenario 2: Render an HTML template and send the result.
   * Supports "welcome", "otp", and "notification" template types.
   */
  sendTemplateEmail(input: SendTemplateEmailInput): Promise<EmailSendResult>;

  /**
   * Scenario 3: Send an email to multiple recipients with optional attachments.
   * Supports CC, BCC, and Base64-encoded file attachments.
   */
  sendBulkEmail(input: SendBulkEmailInput): Promise<EmailSendResult>;
}
