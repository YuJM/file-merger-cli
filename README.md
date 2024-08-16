# File Merger CLI

File Merger CLI는 지정된 디렉토리 내의 파일들을 확장자별로 병합하고, 파일 구조를 JSON으로 출력하는 명령줄 도구입니다.

> CLI의 결과물은 사람이 읽는 용도가 아닙니다

[English Version (영어 버전)](./README_EN.md)

## 설치

npm을 사용하여 전역적으로 설치할 수 있습니다:

```bash
npm install -g file-merger-cli
```

## 설정

이 도구는 홈 디렉토리의 .file-merger/.gitignore 파일을 전역 gitignore 규칙으로 사용합니다.
이 파일을 생성하려면 다음 명령어를 실행하세요:

```bash
mkdir -p ~/.file-merger
touch ~/.file-merger/.gitignore
```

## 사용법

```bash
file-merger <directory> [options]
```

### 인자

- \<directory\>: 스캔할 디렉토리 경로 (필수)

### 옵션

- --log: 로그 파일(merge.log)에 로깅을 활성화합니다.
- --only <extension...>: 지정된 확장자의 파일만 처리합니다.
- -o, --output <path>: 결과물이 저장될 디렉토리를 지정합니다. (기본값: ./output)
- --help: 도움말을 표시합니다.

### 예시

```bash
file-merger /path/to/your/directory --log
file-merger /path/to/your/directory --only js ts
file-merger /path/to/your/directory -o /custom/output/path
```

## 기능

1. 지정된 디렉토리 내의 모든 파일을 스캔합니다.
2. .gitignore 파일의 규칙을 준수합니다 (전역 및 로컬)
3. 파일들을 확장자별로 병합합니다.
4. 디렉토리 구조를 파일 맵 JSON 형식으로 출력합니다.
5. 로그 파일을 생성합니다 (옵션 사용 시).
6. 사용자 지정 출력 디렉토리를 지원합니다.

## 결과

1. 병합된 파일들은 지정된 출력 디렉토리에 저장됩니다 (기본값: ./output).
2. 파일 맵 JSON은 출력 디렉토리의 fileMap.json에 저장됩니다.
3. 로그 파일(활성화된 경우)은 merge.log에 저장됩니다.
4. 오류 로그는 merge_error.log에 저장됩니다.

## 주의사항

- 지정한 출력 디렉토리가 존재하지 않을 경우, 자동으로 생성됩니다.
- 이미 존재하는 출력 디렉토리를 지정할 경우, 기존 내용이 삭제되고 새로운 결과물로 대체됩니다.
