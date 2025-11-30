import "express-session";

declare module "express-session" {
  interface SessionData {
    userId: string;
    userRole: string;
    gymId: string | null;
  }
}

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}
