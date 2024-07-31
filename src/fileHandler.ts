import fs from "fs/promises";
import path from "path";
import {createWriteStream} from "fs";
import micromatch from "micromatch";
import {logger} from "./logger";
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

async function getAllFiles(dir: string): Promise<string[]> {
    const files = await fs.readdir(dir, {withFileTypes: true});
    const paths = await Promise.all(files.map(async (file) => {
        const path = `${dir}/${file.name}`;
        return file.isDirectory() ? getAllFiles(path) : path;
    }));
    return paths.flat();
}

async function ignoreFiles(
    directory: string,
    ignorePatterns: string[],
): Promise<string[]> {
    const allFiles = await getAllFiles(directory);
    return micromatch.not(allFiles, [".*", "__*", ...ignorePatterns], {
        basename: true
    });
}

async function mergeFiles(
    directory: string,
    includedFiles: string[]
): Promise<[Record<string, string[]>, Record<string, string[]>]> {
    const extensionMap: Record<string, string[]> = {};
    const dirMap: Record<string, string[]> = {};

    for (const filePath of includedFiles) {
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
            const content = await fs.readFile(filePath, "utf-8");
            const filename = path.relative(directory, filePath);
            const isPython = /\.py$/.test(filename);
            const commentObj = isPython ? config.comment.py : config.comment.default;
            extensionMap[ext].push(
                `${commentObj.start}---(${filename})---${commentObj.end}\n${content}\n${commentObj.start}---End of (${filename})---${commentObj.end}\n`
            );
        } catch (error) {
            const errorMsg = `Error reading file ${filePath}: ${error}`;
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
        await fs.rm(config.outputDir, {recursive: true, force: true});
        await fs.mkdir(config.outputDir, {recursive: true});
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
                const cleanedContent = content
                    .replace(/\n{2,}/g, '\n') // 3개 이상의 연속된 줄바꿈을 2개로 줄임
                await new Promise<void>((resolve, reject) => {
                    writeStream.write(cleanedContent, (error) => {
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

function createTreeStructure(dirMap: Record<string, string[]>, baseDir: string): Record<string, any> {
    const tree: Record<string, any> = { '.': {} };
    for (const [dirPath, files] of Object.entries(dirMap)) {
        let current = tree['.'];
        const relativePath = path.relative(baseDir, dirPath);
        const pathParts = relativePath.split(path.sep).filter(Boolean);

        for (const part of pathParts) {
            if (!current[part]) {
                current[part] = {};
            }
            current = current[part];
        }

        if (files.length > 0) {
            current['__files__'] = files.map(f => path.basename(f));
        }
    }
    return tree;
}

async function writeFileMap(dirMap: Record<string, string[]>) {
    try {
        const baseDir = process.cwd();
        const tree = createTreeStructure(dirMap, baseDir);
        await fs.writeFile(
            path.join(config.outputDir, "fileMap.json"),
            JSON.stringify(tree, null, 2),
            "utf-8"
        );
        logger.info("File map JSON created");
    } catch (error) {
        const errorMsg = `Error creating file map JSON: ${error}`;
        logger.error(errorMsg);
        throw error;
    }
}

export {readGitignore, ignoreFiles, mergeFiles, cleanOutputFolder, writeMergedFiles, writeFileMap};