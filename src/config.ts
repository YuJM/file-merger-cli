export const config = {
  logFile: "merge.log",
  errorLogFile: "merge_error.log",
  maxLogSize: 1024 * 1024, // 1MB
  maxLogFiles: 5,
  get outputDir() {
    return process.env.OUTPUT_DIR || "./output";
  },
  comment: {
    default: {
      start: "/*",
      end: "*/",
    },
    py: {
      start: `"""`,
      end: `"""`,
    },
  },
} as const;
