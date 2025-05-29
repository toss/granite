# 앱 배포하기

이 문서는 `granite-app`으로 Granite 애플리케이션을 만들고, `granite-forge`라는 배포 도구로 AWS에 서비스 번들을 배포하는 과정을 안내해요. 이 과정을 따라하면 애플리케이션을 Amazon S3 버킷에 배포하고 실행할 수 있어요.

## 준비 사항

AWS에 애플리케이션을 배포하려면 아래 조건을 먼저 갖춰야 해요.

- AWS 계정이 있어야 해요.
- IAM에서 `AmazonS3FullAccess` 권한이 있는 액세스 키와 시크릿 키를 발급받아야 해요.
- pulumi를 통해 생성된 S3 버킷이 준비되어 있어야 해요.

::: code-group

```sh [npm]
npx create-granite-app@latest
cd my-granite-app
```

```sh [pnpm]
pnpm create granite-app
cd my-granite-app
```

```sh [yarn]
yarn create granite-app
cd my-granite-app
```

:::

이 명령은 `my-granite-app`이라는 새 디렉터리를 만들고 그 안에 Granite 애플리케이션의 기본 구조를 생성해요.

## 2. 배포 도구 설치 및 환경 구성

생성된 애플리케이션 디렉터리로 이동하여 필요한 종속성을 설치하고 AWS 배포를 위한 환경 변수를 설정하세요.

### 종속성 설치

`granite-forge`는 Granite 애플리케이션을 배포하는 도구예요.

::: code-group

```sh [npm]
npm install @granite-js/forge-cli --save-dev
```

```sh [pnpm]
pnpm add @granite-js/forge-cli --save-dev
```

```sh [yarn]
yarn add @granite-js/forge-cli  --dev
```

:::

## AWS 자격 증명(AWS Credentials) 구성하기

Pulumi가 AWS 리소스를 생성할 수 있도록 자격 증명을 설정해야 해요. 환경 변수로 설정하거나, AWS CLI로 구성할 수 있어요.

### 방법1: 환경 변수로 설정하기

Pulumi는 실행되는 환경에서 AWS 자격 증명을 읽어서 리소스를 생성해요. 자격 증명을 환경 변수로 설정하면 별도 설정 파일 없이도 Pulumi가 자동으로 값을 읽을 수 있어요.

다음과 같이 터미널에서 자격 증명을 설정해요. 이 방법은 일시적으로만 적용되며, 터미널을 종료하면 사라져요.

```bash
export AWS_ACCESS_KEY_ID="your-access-key-id"
export AWS_SECRET_ACCESS_KEY="your-secret-access-key"
export AWS_REGION="your-region"
```

### 방법2: AWS CLI로 설정하기

이 명령어를 실행하면 자격 증명과 기본 리전을 입력할 수 있어요. 자격 증명을 AWS CLI로 설정하면 터미널을 종료해도 자격 증명이 유지돼요.

```bash
aws configure
```

## 3. 애플리케이션 빌드 및 배포

환경 변수가 설정되면 다음 명령을 사용하여 Granite 애플리케이션을 빌드하고 배포하세요.

### 애플리케이션 빌드

이 명령은 애플리케이션 소스 코드를 배포 가능한 형식으로 컴파일하고 최적화해요.

::: code-group

```sh [npm]
npx granite build
```

```sh [pnpm]
pnpm granite build
```

```sh [yarn]
yarn granite build
```

:::

### 서비스 번들 배포

이 명령은 빌드된 서비스 번들을 지정된 S3 버킷에 업로드하고 애플리케이션을 배포하는 데 필요한 AWS 리소스를 프로비저닝해요. `--bucket` 옵션을 사용하여 배포에 올바른 S3 버킷 이름을 지정해야 해요.

::: code-group

```sh [npm]
npx granite-forge deploy --bucket your-s3-bucket-name
```

```sh [pnpm]
pnpm granite-forge deploy --bucket your-s3-bucket-name
```

```sh [yarn]
yarn granite-forge deploy --bucket your-s3-bucket-name
```

:::

## 다음 단계

애플리케이션을 성공적으로 배포하면, 아래 엔드포인트 주소를 사용해서 각 플랫폼에서 서비스를 이용할 수 있어요.
`1-1000`은 `1`에서 `1000` 사이의 숫자를 넣으면 돼요. 이 숫자는 카나리 배포를 할 때 사용돼요.

엔드포인트 주소는 아래와 같아요.
- iOS: `https://<cloudfront-cdn>/ios/<appName>/1-1000/bundle`
- Android: `https://<cloudfront-cdn>/android/<appName>/1-1000/bundle`
