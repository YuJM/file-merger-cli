# File Merger CLI

File Merger CLI is a command-line tool that merges files within a specified directory by extension and outputs the file structure as JSON.

> The CLI's output is not intended for human reading.

[한국어 버전 (Korean Version)](./README.md)

## Installation

You can install it globally using npm:

```bash
npm install -g file-merger-cli
```

## Configuration

This tool uses the .file-merger/.gitignore file in the home directory as global gitignore rules.
To create this file, run the following commands:

```bash
mkdir -p ~/.file-merger
touch ~/.file-merger/.gitignore
```

## Usage

```bash
file-merger <directory> [options]
```

### Arguments

- \<directory\>: The path to the directory to scan (required)

### Options

- --log: Enable logging to merge.log file
- --only <extension...>: Process only specified file extensions
- -o, --output <path>: Specify the output directory (default: ./output)
- --help: Display help information

### Examples

```bash
file-merger /path/to/your/directory --log
file-merger /path/to/your/directory --only js ts
file-merger /path/to/your/directory -o /custom/output/path
```

## Features

1. Scans all files within the specified directory
2. Adheres to .gitignore rules (both global and local)
3. Merges files by extension
4. Outputs directory structure as a JSON file map
5. Creates log files (when option is used)
6. Supports custom output directory

## Results

1. Merged files are saved in the specified output directory (default: ./output)
2. The file map JSON is saved as fileMap.json in the output directory
3. Log file (if enabled) is saved as merge.log
4. Error log is saved as merge_error.log

## Notes

- If the specified output directory does not exist, it will be created automatically
- If an existing output directory is specified, its contents will be deleted and replaced with new results
