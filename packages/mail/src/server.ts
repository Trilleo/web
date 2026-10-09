/** Server-only mail: the drivers. Never import this from browser code. */
export * from "./driver";
export {
  SmtpDriver,
  isPermanentFailure,
  toMailError,
  type SmtpConfig,
} from "./smtp";
