# Granite AWS 인프라 설정하기

15분 안에 AWS에 Granite 앱을 배포하기 위한 React Native CDN 인프라를 구축해보세요.

## 만들게 될 것들

이 가이드를 마치면 다음과 같은 것들을 만들게 돼요.

- Granite 앱 번들을 저장할 S3 버킷
- 전 세계에 빠르게 전송하기 위한 CloudFront CDN
- 사용자가 늘어나도 확장 가능한 프로덕션급 인프라

## 준비물

시작하기 전에 다음이 필요해요.

- **AWS 계정** - [가입하기](https://aws.amazon.com/)

## 1. Pulumi CLI 설치

먼저 AWS 인프라를 코드로 설정할 수 있게 도와주는 Pulumi를 설치해야 해요. 운영 체제에 맞는 명령어를 선택하세요.

::: code-group

```sh [macOS]
brew install pulumi
```

```sh [Windows]
winget install pulumi
```

```sh [Linux]
curl -fsSL https://get.pulumi.com | sh
```

:::

자세한 설치 방법은 [Pulumi 설치 가이드](https://www.pulumi.com/docs/iac/download-install/)를 참고하세요.

> **✅ 성공했다면:** 'pulumi version' 명령어를 실행했을 때 버전 정보가 보여요

## 2. AWS 자격 증명 설정

Pulumi가 AWS 계정에 접근할 수 있도록 설정해야 해요. 두 가지 방법 중 하나를 선택하세요.

### 방법 A: AWS CLI 사용하기 (권장)

AWS CLI를 설치하고 다음 명령어를 입력하여 AWS 인증 정보를 저장하세요.

```bash
# AWS CLI 설치하기
# macOS: brew install awscli
# Windows: winget install Amazon.AWSCLI
# Linux: apt install awscli

# 자격 증명 설정하기
aws configure
```

명령어를 입력하면 AWS 인증 정보를 묻는 프롬프트가 나타나요. 프롬프트에 인증 정보를 입력하세요.

```
AWS Access Key ID: {액세스 키 ID}
AWS Secret Access Key: {시크릿 키}
Default region: {리전}
Default output format: json
```

### 방법 B: 환경 변수 사용하기

AWS CLI 대신 터미널에서 다음과 같이 환경 변수를 설정할 수도 있어요. 터미널을 껐다 켜면 인증 정보가 사라진다는 점에 주의하세요.

```bash
export AWS_ACCESS_KEY_ID="{액세스 키 ID}"
export AWS_SECRET_ACCESS_KEY="{시크릿 키}"
export AWS_REGION="{리전}"
```

::: info AWS 인증 정보 얻는 방법

AWS 콘솔 → IAM → 사용자 → 사용자 선택 → 보안 자격 증명 → 액세스 키 만들기로 이동하면 AWS 인증 정보를 얻을 수 있어요.

:::

## 3. 인프라 생성 프로젝트

AWS 인프라 코드가 위치할 새 디렉토리를 만드세요.

```bash
mkdir my-granite-infrastructure
cd my-granite-infrastructure
```

새로운 Pulumi 프로젝트를 초기화하세요.

```bash
pulumi new aws-typescript
```

CLI에서 Pulumi 프로젝트를 생성하기 위한 정보를 물어보면 입력하세요.

```
This command will walk you through creating a new Pulumi project.

Enter a value or leave blank to accept the (default), and press <ENTER>.
Press ^C at any time to quit.

Project name: my-granite-infrastructure
Project description: Granite app CDN infrastructure
Created project 'my-granite-infrastructure'

stack name: dev
Created stack 'dev'

The package manager to use for installing dependencies: {패키지 매니저}
The AWS region to deploy into (aws:region): {AWS 리전}
Saved config
```

> **✅ 성공했다면:** "Your new project is ready to go!" 메시지가 보여요

## 4. Granite 인프라 패키지 설치

Granite 배포 인프라를 생성하는 Pulumi 코드 패키지를 설치하세요.

::: code-group

```sh [npm]
npm install @granite-js/pulumi-aws --save-dev
```

```sh [pnpm]
pnpm add @granite-js/pulumi-aws --save-dev
```

```sh [yarn]
yarn add @granite-js/pulumi-aws --dev
```

```sh [bun]
bun add @granite-js/pulumi-aws --dev
```
:::

## 5. 인프라 설정

Granite CDN 인프라를 생성하기 위해 `index.ts` 파일의 내용을 다음과 같이 입력하세요.

```typescript
import * as pulumi from '@pulumi/pulumi';
import { ReactNativeBundleCDN } from '@granite-js/pulumi-aws';

const config = new pulumi.Config();

// Granite CDN 인프라 생성하기
const cdn = new ReactNativeBundleCDN('granite-cdn', {
  bucketName: config.require('bucketName'),
  region: config.require('region'),
});

export const cdnUrl = cdn.cloudfrontDomain;
export const bucketName = cdn.bucketName;
```

## 6. 설정값 지정

Granite AWS 인프라에서 사용할 S3 버킷 이름과 리전을 설정하세요.

```bash
# 고유한 버킷 이름을 설정하세요 (전체 AWS에서 유일해야 해요)
pulumi config set bucketName {버킷 이름}

# AWS 리전을 설정하세요
pulumi config set region {리전}
```

::: info 

버킷 이름은 전체 AWS에서 유일해야 해요. 다른 사람과 겹치지 않는 이름을 사용하세요.

:::

## 7. 인프라 배포하기  

이제 Granite 앱을 서빙할 AWS 인프라를 만들어볼게요.

```bash
pulumi up
```

::: warning Yarn Plug'n'Play (PnP) 를 사용한다면
pnpify를 설치하고, 다음과 같이 pulumi 명령어를 실행해야 해요.

```bash
yarn add @yarnpkg/pnpify -D
yarn pnpify pulumi up
```

:::

`pulumi up` 명령어로 인프라를 배포하면 Pulumi가 생성할 리소스를 보여줘요.

```
Previewing update (dev)

View Live: https://app.pulumi.com/yourname/my-granite-infrastructure/dev/previews/...

     Type                              Name                              Plan       
 +   pulumi:pulumi:Stack               my-granite-infrastructure-dev     create     
 +   └─ {생성될 인프라}   

Resources:
    + * to create

Do you want to perform this update? yes
```

`yes`를 입력하고 Enter를 누르세요. Pulumi가 지정된 AWS 계정에 인프라를 생성해요.

```
Updating (dev)

View Live: https://app.pulumi.com/yourname/my-granite-infrastructure/dev/updates/1

     Type                              Name                              Status      
 +   pulumi:pulumi:Stack               my-granite-infrastructure-dev     created     
 +   └─ {생성된 인프라}     

Resources:
    + * created

Duration: {소요 시간}
```

> **✅ 성공했다면:** "Resources: + * created"와 CDN URL이 보여요

## 🎉 축하해요!

AWS에 Granite 인프라를 성공적으로 만들었어요. 이제 다음과 같은 것들이 준비됐어요.

- 스스로의 AWS 계정에서 직접 운영하는 React Native 인프라
- 전 세계에서 빠르게 React Native 번들을 로딩할 수 있는 CDN
- 사용자가 늘어나도 확장 가능한 아키텍처
- 배포 인프라에 대한 완전한 제어

## 불필요한 리소스 지우기

더 이상 필요하지 않은 리소스를 삭제하려면 다음 명령어를 실행하세요.

```bash
pulumi destroy
```

Pulumi가 삭제할 리소스를 보여주고 확인을 요청해요. `yes`를 입력하면 모든 리소스가 삭제돼요.

## 다음 단계

이제 인프라가 준비됐으니 다음 단계로 넘어가세요.

- [앱 배포하기](./deploy-your-app) - Granite 앱을 AWS 인프라에 배포하는 방법 배우기
