# AWS에 인프라 배포하기

이 문서는 **Pulumi**를 사용해서 **React Native CDN(Content Delivery Network)** 인프라를 AWS에 설정하는 방법을 안내해요. 이 작업은 `@granite-js/pulumi-aws` 패키지를 사용해서 진행해요.

## 설치하기

Pulumi를 처음 사용한다면 먼저 Pulumi CLI를 설치해야 해요. 아래 공식 가이드를 참고해서 운영 체제에 맞게 설치해 주세요.

- [Pulumi 설치 가이드](https://www.pulumi.com/docs/iac/download-install/)

## Pulumi 프로젝트 생성하기

Pulumi 프로젝트를 생성하려면 아래 명령어를 실행해요.

명령어를 실행하면 기본 템플릿이 생성되고, 몇 가지 설정을 물어봐요. 프로젝트 이름, 설명, AWS 리전 등을 입력한 뒤 마무리하면 프로젝트가 준비돼요.

```bash
mkdir react-native-cdn
cd react-native-cdn
pulumi new aws-typescript
```

## 패키지 설치하기

Pulumi에서 React Native CDN 컴포넌트를 사용하려면 `@granite-js/pulumi-aws` 패키지를 설치해야 해요. 사용하는 패키지 매니저에 따라 다음 명령어 중 하나를 실행해요.

::: code-group

```sh [npm]
npm install @granite-js/pulumi-aws --save-dev
```

```sh [pnpm]
yarn add @granite-js/pulumi-aws @yarnpkg/pnpify --dev
```

```sh [yarn]
pnpm add @granite-js/pulumi-aws --save-dev
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

## 사용 방법

`ReactNativeBundleCDN` 컴포넌트를 사용하려면 Pulumi 프로그램에서 가져와 인스턴스를 만들면 돼요.

```ts
import { ReactNativeBundleCDN } from '@granite-js/pulumi-aws';
import * as pulumi from '@pulumi/pulumi';

const config = new pulumi.Config();

const cdn = new ReactNativeBundleCDN('myReactNativeBundleCDN', {
  bucketName: config.require('bucketName'),
  region: config.require('region'),
});

export const iosSharedUrl = pulumi.interpolate`https://${cdn.cloudfrontDomain}/ios/shared/1/bundle`;
export const androidSharedUrl = pulumi.interpolate`https://${cdn.cloudfrontDomain}/android/shared/1/bundle`;
```

## 구성 변수 설정하기

위 예제 코드에서 사용하는 구성 변수 `bucketName`과 `region`은 Pulumi 설정으로 미리 지정해야 해요.

```bash
pulumi config set bucketName your-bucket-name
pulumi config set region us-west-2
```

## 인프라 배포하기

설정이 모두 끝났다면 다음 명령어로 인프라를 배포해요.

```bash
pulumi up
```

::: warning Yarn Plug’n’Play(PnP)를 사용하는 경우
다음 명령어로 pnpify를 설치하고 pulumi 명령어를 실행해야 해요.
```bash
yarn add @yarnpkg/pnpify -D
yarn pnpify pulumi up
```
:::


명령어를 실행하면 Pulumi가 어떤 리소스를 만들지 보여줘요. 내용을 검토한 뒤, `yes`를 입력하면 배포가 시작돼요. 이 과정에서 AWS에 React Native CDN 인프라가 생성돼요.

## 리소스 정리하기

배포한 리소스를 더 이상 사용하지 않아 삭제하려면 다음 명령어를 실행하면 돼요.

```bash
pulumi destroy
```

Pulumi가 어떤 리소스를 삭제할지 보여주고, 확인을 요청해요. `yes`를 입력하면 모든 리소스가 삭제돼요.
