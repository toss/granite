# Granite

Granite is an enterprise-grade React Native framework for microservice apps with brownfield integration, 200KB bundle sizes, and AWS-ready infrastructure.

## Features

- **Add React Native to existing apps** - Easily integrate React Native screens into your current iOS and Android apps.
- **Tiny bundles** - Create tiny 200KB microservice bundles with bundle splitting and smart optimization.
- **Fast builds** - Keep your JavaScript bundle build times down to just seconds using ESBuild.
- **Full AWS setup** - Complete infrastructure configuration with full deployment control.
- **One-click infrastructure** - Set up CDN and infrastructure with a single CLI command.
- **Simple defaults** - Pre-configured settings let you focus on building, not setup.
- **Comprehensive end-to-end testing** - Every feature comes with end-to-end tests included.
- **Fast native builds** - Keep your native build times quick with prebuilt frameworks. (WIP)

## Motivation

Granite was designed to reflect the characteristics of microservice architecture. To ensure stable operation even as the number of services grows, we made the following considerations and choices:

- **Minimizing Inter-Service Impact**  
  As the number of services increases, if a change in one service affects others, it becomes difficult to isolate failures. Granite is designed to allow independent deployment of each service, ensuring that changes in one service don't affect others.

- **Build Optimization for Fast Deployment**  
  In an environment where deployments happen dozens of times a day, build speed directly impacts development speed. Granite uses `ESBuild` instead of the default Metro bundler to increase bundling speed.

- **Bundle Optimization through Common Module Separation**  
  Including commonly used modules like `react-native` and `react` in each individual bundle unnecessarily increases bundle size. Granite defines a separate shared bundle and allows each service to import only the necessary modules from this common bundle. This results in lighter service bundles and faster loading times.
