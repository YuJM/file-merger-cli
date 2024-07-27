#!/usr/bin/env node
import path from "path";
import os from "os";
import * as yargs from "yargs";
import {logger} from "./logger";
import { config } from "./config";
import { readGitignore, ignoreFiles, mergeFiles, cleanOutputFolder, writeMergedFiles, writeFileStructure } from "./fileHandler";

interface Arguments {
  directory: string;
  "ignore-hidden": boolean;
  log: boolean;
}

async function main() {
  const argv = yargs
      .command("* <directory>", "The directory to scan", (yargs) => {
        yargs.positional("directory", {
          describe: "The directory to scan",
          type: "string",
        });
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
      .help("h")
      .parseSync();

  logger.setupLoggers(argv.log);

  const directory = path.resolve((argv as unknown as Arguments).directory);

  try {
    const homeDir = os.homedir();
    const scriptDirGitignore = await readGitignore(
        path.join(homeDir, ".file-merger", ".gitignore")
    );
    const targetDirGitignore = await readGitignore(path.join(directory, ".gitignore"));
    const ignorePatterns = Array.from(
        new Set([...scriptDirGitignore, ...targetDirGitignore])
    );

    const includedFiles = await ignoreFiles(
        directory,
        ignorePatterns,
        argv["ignore-hidden"]
    );

    await cleanOutputFolder();
    const [extensionMap, dirMap] = await mergeFiles(directory, includedFiles);
    await writeMergedFiles(extensionMap);
    await writeFileStructure(dirMap);

    const totalFiles = Object.values(extensionMap).reduce(
        (sum, files) => sum + files.length,
        0
    );
    logger.info(`\nProcessing complete:`);
    logger.info(`Total files processed: ${totalFiles}`);
    logger.info(`Processed file types:`);
    for (const [ext, files] of Object.entries(extensionMap)) {
      console.log(`  - ${ext || "No extension"}: ${files.length} files`);
    }

    console.log(`Processing complete. Total files processed: ${totalFiles}`);
    if (argv["log"]) {
      console.log(`Log file: ${path.resolve(config.logFile)}`);
    }
  } catch (error: unknown) {
    console.error(error);
    if (error instanceof Error) {
      logger.error(`Fatal error: ${error.message}`);
    }else{
      logger.error(`Fatal error: ${String(error)}`);
    }
    console.error(`Error occurred. Error log file: ${path.resolve(config.errorLogFile)}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error: unknown) => {
    if (error instanceof Error) {
      logger.error(`Unhandled error: ${error.message}`);
    }
    console.error(`Unhandled error occurred. Error log file: ${path.resolve(config.errorLogFile)}`);
    process.exit(1);
  });
}