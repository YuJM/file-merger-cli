import fs from "fs/promises";
import path from "path";
import {createWriteStream} from "fs";
import {minimatch} from "minimatch";
import { logger} from "./logger";
import {config} from "./config";


async function readGitignore(filePath: string): Promise<Set<string>> {
    try {
        const content = await fs.readFile(filePath, "utf-8");
        return new Set(
            content
                .split("\n")
                .map((line) => line.trim())
                .filter((line) => line && !line.startsWith("#"))
        );
    } catch (error: unknown) {
        if (error instanceof Error) {
            // 'code' 속성이 있는지 확인합니다.
            if ('code' in error && error.code !== "ENOENT") {
                logger.error(`Error reading .gitignore file ${filePath}: ${error.message}`);
            }
        } else {
            // error가 Error 인스턴스가 아닌 경우
            logger.error(`Unknown error reading .gitignore file ${filePath}: ${String(error)}`);
        }
        return new Set();
    }
}

async function ignoreFiles(
    directory: string,
    ignorePatterns: string[],
    ignoreHidden: boolean
): Promise<string[]> {
    const includedFiles: string[] = [];

    async function walk(dir: string) {
        const files = await fs.readdir(dir);
        for (const file of files) {
            const filePath = path.join(dir, file);
            const relativePath = path.relative(directory, filePath);
            const stat = await fs.stat(filePath);

            if (stat.isDirectory()) {
                if (file !== "output" && !(ignoreHidden && file.startsWith("."))) {
                    await walk(filePath);
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

    await walk(directory);
    return includedFiles;
}

async function mergeFiles(
    directory: string,
    includedFiles: string[]
): Promise<[Record<string, string[]>, Record<string, string[]>]> {
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
            const content = await fs.readFile(fullPath, "utf-8");
            extensionMap[ext].push(
                `// ${filePath}\n${content}\n// End of ${filePath}`
            );
        } catch (error) {
            const errorMsg = `Error reading file ${fullPath}: ${error}`;
            logger.error(errorMsg);
            extensionMap[ext].push(
                `// ${filePath}\n// Unable to read file content\n// End of ${filePath}`
            );
        }
    }

    return [extensionMap, dirMap];
}

async function cleanOutputFolder() {
    try {
        await fs.rm(config.outputDir, { recursive: true, force: true });
        await fs.mkdir(config.outputDir, { recursive: true });
        logger.info("Output folder cleaned and recreated");
    } catch (error) {
        const errorMsg = `Error cleaning output folder: ${error}`;
        logger.error(errorMsg);
        throw error;
    }
}

async function writeMergedFiles(extensionMap: Record<string, string[]>) {
    for (const [ext, files] of Object.entries(extensionMap)) {
        const outputFile = path.join(
            config.outputDir,
            `${ext.slice(1) || "noExtension"}MergeAll${ext}`
        );
        try {
            const writeStream = createWriteStream(outputFile);
            for (const content of files) {
                await new Promise<void>((resolve, reject) => {
                    writeStream.write(content + "\n\n", (error) => {
                        if (error) reject(error);
                        else resolve();
                    });
                });
            }
            writeStream.end();
            logger.info(`Created ${outputFile}`);
        } catch (error) {
            const errorMsg = `Error creating ${outputFile}: ${error}`;
            logger.error(errorMsg);
            throw error;
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

async function writeFileStructure(dirMap: Record<string, string[]>) {
    try {
        const tree = createTreeStructure(dirMap);
        await fs.writeFile(
            path.join(config.outputDir, "fileStructure.json"),
            JSON.stringify(tree, null, 2),
            "utf-8"
        );
        logger.info("File structure JSON created");
    } catch (error) {
        const errorMsg = `Error creating file structure JSON: ${error}`;
        logger.error(errorMsg);
        throw error;
    }
}

export { readGitignore, ignoreFiles, mergeFiles, cleanOutputFolder, writeMergedFiles, writeFileStructure };