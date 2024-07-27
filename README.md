# File Merger CLI

File Merger CLI는 지정된 디렉토리 내의 파일들을 확장자별로 병합하고, 파일 구조를 JSON으로 출력하는 명령줄 도구입니다.

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

- ignore-hidden: 숨겨진 파일과 디렉토리를 무시합니다.
- log: 로그 파일(merge.log)에 로깅을 활성화합니다.
- help: 도움말을 표시합니다.
### 예시
```bash
file-merger /path/to/your/directory --ignore-hidden --log
```
## 기능
1. 지정된 디렉토리 내의 모든 파일을 스캔합니다.
2. .gitignore 파일의 규칙을 준수합니다 (전역 및 로컬)
3. 파일들을 확장자별로 병합합니다.
4. 디렉토리 구조를 JSON 형식으로 출력합니다.
5. 로그 파일을 생성합니다 (옵션 사용 시).
## 결과
1. 병합된 파일들은 ./output 디렉토리에 저장됩니다.
2. 파일 구조 JSON은 ./output/fileStructure.json에 저장됩니다.
3. 로그 파일(활성화된 경우)은 merge.log에 저장됩니다.
4. 오류 로그는 merge_error.log에 저장됩니다.