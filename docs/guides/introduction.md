# Granite

Granite is a React Native-based framework. Like solid granite rock, it provides a robust foundation for project development. Granite ensures consistent performance and reliable user experience across various platforms. Build trustworthy and powerful apps with Granite.

- Granite aims for **100% test coverage** to ensure high test reliability.
- Every component and feature comes with **clear documentation and usage guides**.
- Every feature includes **E2E (End-to-End) tests** that validate functionality from start to finish.

## Motivation

Granite was designed to reflect the characteristics of microservice architecture. To ensure stable operation even as the number of services grows, we made the following considerations and choices:

- **Minimizing Inter-Service Impact**  
  As the number of services increases, if a change in one service affects others, it becomes difficult to isolate failures. Granite is designed to allow independent deployment of each service, ensuring that changes in one service don't affect others.

- **Build Optimization for Fast Deployment**  
  In an environment where deployments happen dozens of times a day, build speed directly impacts development speed. Granite uses `ESBuild` instead of the default Metro bundler to increase bundling speed.

- **Bundle Optimization through Common Module Separation**  
  Including commonly used modules like `react-native` and `react` in each individual bundle unnecessarily increases bundle size. Granite defines a separate shared bundle and allows each service to import only the necessary modules from this common bundle. This results in lighter service bundles and faster loading times.
