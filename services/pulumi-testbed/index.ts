import { ReactNativeBundleCDN } from '@granite-js/pulumi-aws';
import * as pulumi from '@pulumi/pulumi';

const config = new pulumi.Config();

const cdn = new ReactNativeBundleCDN('myReactNativeBundleCDN', {
  bucketName: config.require('bucketName'),
  region: config.require('region'),
});

export const iosSharedUrl = pulumi.interpolate`https://${cdn.cloudfrontDomain}/ios/shared/1/bundle`;
export const androidSharedUrl = pulumi.interpolate`https://${cdn.cloudfrontDomain}/android/shared/1/bundle`;
