import "express-session";

declare module "express-session" {
  interface SessionData {
    userId: string;
    userRole: string;
    gymId: string | null;
    pendingOtpUserId?: string;
  }
}

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}
