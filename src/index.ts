import fs from "fs";
import path from "path";
import os from "os";
import { minimatch } from "minimatch";
import * as yargs from "yargs";
import * as winston from "winston";

// 에러 로깅을 위한 로거 설정
const errorLogger = winston.createLogger({
  level: "error",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} - ${level}: ${message}`;
    })
  ),
  transports: [
    new winston.transports.File({
      filename: "merge_error.log",
      maxsize: 1024 * 1024,
      maxFiles: 5,
    }),
  ],
});

// 일반 로깅을 위한 로거 설정 (초기에는 비활성화)
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} - ${level}: ${message}`;
    })
  ),
  transports: [],
});

function setupLogger(logEnabled: boolean) {
  if (logEnabled) {
    logger.add(
      new winston.transports.File({
        filename: "merge.log",
        maxsize: 1024 * 1024,
        maxFiles: 5,
      })
    );
  }
}

function readGitignore(filePath: string): Set<string> {
  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      return new Set(
        content
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line && !line.startsWith("#"))
      );
    } catch (e) {
      errorLogger.error(`Error reading .gitignore file ${filePath}: ${e}`);
      console.error(`Error reading .gitignore file ${filePath}: ${e}`);
    }
  }
  return new Set();
}

function ignoreFiles(
  directory: string,
  ignorePatterns: string[],
  ignoreHidden: boolean
): string[] {
  const includedFiles: string[] = [];

  function walk(dir: string) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const relativePath = path.relative(directory, filePath);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        if (file !== "output" && !(ignoreHidden && file.startsWith("."))) {
          walk(filePath);
        }
      } else {
        const isHidden = path.basename(relativePath).startsWith(".");
        if (
          !ignorePatterns.some((pattern) => minimatch(relativePath, pattern)) &&
          !(ignoreHidden && isHidden)
        ) {
          includedFiles.push(relativePath);
        }
      }
    }
  }

  walk(directory);
  return includedFiles;
}

function mergeFiles(
  directory: string,
  includedFiles: string[]
): [Record<string, string[]>, Record<string, string[]>] {
  const extensionMap: Record<string, string[]> = {};
  const dirMap: Record<string, string[]> = {};

  for (const filePath of includedFiles) {
    const fullPath = path.join(directory, filePath);
    const dirName = path.dirname(filePath);
    if (!dirMap[dirName]) {
      dirMap[dirName] = [];
    }
    dirMap[dirName].push(filePath);

    const ext = path.extname(filePath).toLowerCase();
    if (!extensionMap[ext]) {
      extensionMap[ext] = [];
    }

    try {
      const content = fs.readFileSync(fullPath, "utf-8");
      extensionMap[ext].push(
        `// ${filePath}\n${content}\n// End of ${filePath}`
      );
    } catch (e) {
      const errorMsg = `Error reading file ${fullPath}: ${e}`;
      errorLogger.error(errorMsg);
      console.error(errorMsg);
      extensionMap[ext].push(
        `// ${filePath}\n// Unable to read file content\n// End of ${filePath}`
      );
    }
  }

  return [extensionMap, dirMap];
}

function cleanOutputFolder() {
  const outputDir = "./output";
  try {
    if (fs.existsSync(outputDir)) {
      fs.rmdirSync(outputDir, { recursive: true });
    }
    fs.mkdirSync(outputDir);
    logger.info("Output folder cleaned and recreated");
  } catch (e) {
    const errorMsg = `Error cleaning output folder: ${e}`;
    errorLogger.error(errorMsg);
    console.error(errorMsg);
  }
}

function writeMergedFiles(extensionMap: Record<string, string[]>) {
  for (const [ext, files] of Object.entries(extensionMap)) {
    const outputFile = `./output/${
      ext.slice(1) || "noExtension"
    }MergeAll${ext}`;
    try {
      fs.writeFileSync(outputFile, files.join("\n\n"), "utf-8");
      logger.info(`Created ${outputFile}`);
    } catch (e) {
      const errorMsg = `Error creating ${outputFile}: ${e}`;
      errorLogger.error(errorMsg);
      console.error(errorMsg);
    }
  }
}

function createTreeStructure(
  dirMap: Record<string, string[]>
): Record<string, any> {
  const tree: Record<string, any> = {};
  for (const [dirPath, files] of Object.entries(dirMap)) {
    let current = tree;
    const normalizedPath = path.normalize(dirPath);
    const pathParts = normalizedPath.split(path.sep);
    for (const part of pathParts) {
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part];
    }
    if (files.length > 0) {
      current["__files__"] = files.map((f) => path.basename(f));
    }
  }
  return tree;
}

function writeFileStructure(dirMap: Record<string, string[]>) {
  try {
    const tree = createTreeStructure(dirMap);
    fs.writeFileSync(
      "./output/fileStructure.json",
      JSON.stringify(tree, null, 2),
      "utf-8"
    );
    logger.info("File structure JSON created");
  } catch (e) {
    const errorMsg = `Error creating file structure JSON: ${e}`;
    errorLogger.error(errorMsg);
    console.error(errorMsg);
  }
}

function main() {
  const argv = yargs
    .option("directory", {
      type: "string",
      description: "The directory to scan",
      demandOption: true,
    })
    .option("ignore-hidden", {
      type: "boolean",
      description: "Ignore hidden files and directories",
      default: false,
    })
    .option("log", {
      type: "boolean",
      description: "Enable logging to merge.log file",
      default: false,
    })
    .help()
    .parseSync();

  setupLogger(argv.log);

  const directory = path.resolve(argv.directory);

  if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
    const errorMsg = `Directory not found: ${directory}`;
    errorLogger.error(errorMsg);
    console.error(errorMsg);
    process.exit(1);
  }
  const homeDir = os.homedir();
  const scriptDirGitignore = readGitignore(
    path.join(homeDir, ".file-merger", ".gitignore")
  );
  const targetDirGitignore = readGitignore(path.join(directory, ".gitignore"));
  const ignorePatterns = Array.from(
    new Set([...scriptDirGitignore, ...targetDirGitignore])
  );

  const includedFiles = ignoreFiles(
    directory,
    ignorePatterns,
    argv["ignore-hidden"]
  );

  cleanOutputFolder();
  const [extensionMap, dirMap] = mergeFiles(directory, includedFiles);
  writeMergedFiles(extensionMap);
  writeFileStructure(dirMap);

  const totalFiles = Object.values(extensionMap).reduce(
    (sum, files) => sum + files.length,
    0
  );
  logger.info(`\nProcessing complete:`);
  logger.info(`Total files processed: ${totalFiles}`);
  logger.info(`Processed file types:`);
  for (const [ext, files] of Object.entries(extensionMap)) {
    logger.info(`  - ${ext || "No extension"}: ${files.length} files`);
  }

  console.log(`Processing complete. Total files processed: ${totalFiles}`);
  if (argv["log"]) {
    console.log(`Log file: ${path.resolve("merge.log")}`);
  }
  console.log(`Error log file: ${path.resolve("merge_error.log")}`);
}

main();
