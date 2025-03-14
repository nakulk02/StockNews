import { createLogger, format, transports } from "winston";
const { combine, timestamp, printf, colorize } = format;


const logFormat = printf(({ level, message, timestamp }) => {
    return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
});

let logger;
export default function loggerInit(){
    if(!logger)
    {
        logger= createLogger({
            level: "info",
            format: combine(
                timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
                colorize(),
                logFormat
            ),
            transports: [
                // new transports.Console(),  
                new transports.File({ filename: "./logs/error.log", level: "error" }), 
                new transports.File({ filename: "./logs/combined.log" }) 
            ],
        });
    }
    return logger;
}
