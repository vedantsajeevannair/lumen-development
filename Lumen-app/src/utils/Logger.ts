export interface Logger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

export class ConsoleLogger implements Logger {
  private format(
    level: "INFO" | "WARN" | "ERROR",
    message: string,
    meta?: Record<string, unknown>
  ): string {
    const timestamp = new Date().toISOString();
    const metaString = meta ? ` | Meta: ${JSON.stringify(meta)}` : "";
    return `[${timestamp}] [${level}] ${message}${metaString}`;
  }

  info(message: string, meta?: Record<string, unknown>): void {
    console.log(this.format("INFO", message, meta));
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    console.warn(this.format("WARN", message, meta));
  }

  error(message: string, meta?: Record<string, unknown>): void {
    console.error(this.format("ERROR", message, meta));
  }
}

let activeLogger: Logger | null = null;

export function createLogger(): Logger {
  if (!activeLogger) {
    activeLogger = new ConsoleLogger();
  }
  return activeLogger;
}
