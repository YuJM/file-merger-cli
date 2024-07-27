import * as winston from "winston";
import { config } from "./config";

class Logger {
    private static instance: Logger;
    private infoLogger: winston.Logger;
    private errorLogger: winston.Logger | null = null;

    private constructor() {
        this.infoLogger = winston.createLogger({
            level: "info",
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.printf(({ timestamp, level, message }) => {
                    return `${timestamp} - ${level}: ${message}`;
                })
            ),
            transports: [],
        });
    }

    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    public setupLoggers(logEnabled: boolean): void {
        if (logEnabled) {
            this.infoLogger.add(
                new winston.transports.File({
                    filename: config.logFile,
                    maxsize: config.maxLogSize,
                    maxFiles: config.maxLogFiles,
                })
            );
        } else {
            this.infoLogger.add(new winston.transports.Console({ silent: true }));
        }
    }

    public info(message: string): void {
        this.infoLogger.info(message);
    }

    public error(message: string): void {
        if (!this.errorLogger) {
            this.errorLogger = winston.createLogger({
                level: "error",
                format: winston.format.combine(
                    winston.format.timestamp(),
                    winston.format.printf(({ timestamp, level, message }) => {
                        return `${timestamp} - ${level}: ${message}`;
                    })
                ),
                transports: [
                    new winston.transports.File({
                        filename: config.errorLogFile,
                        maxsize: config.maxLogSize,
                        maxFiles: config.maxLogFiles,
                    }),
                ],
            });
        }
        this.errorLogger.error(message);
    }
}

export const logger = Logger.getInstance();