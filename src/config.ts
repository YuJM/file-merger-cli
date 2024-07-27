export const config = {
    logFile: "merge.log",
    errorLogFile: "merge_error.log",
    maxLogSize: 1024 * 1024, // 1MB
    maxLogFiles: 5,
    outputDir: "./output",
    comment: {
        default: {
            start: "/*",
            end: "*/"
        },
        py: {
            start: `"""`,
            end: `"""`
        }
    }
} as const;