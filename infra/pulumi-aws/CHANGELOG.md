# @granite-js/pulumi-aws

## 2.5.3

### Patch Changes

- 8b04ab6: Add configurable deployment channels across Forge, deployment storage and the AWS CDN. Forge automatically
  registers each app/channel selector in S3, so channel creation requires no per-channel infrastructure configuration.
  Channel objects, state, history and cluster pointers are isolated under `channels/<channel>/`. Registered path
  suffixes select channels while the legacy default and unregistered filename tags keep their existing routes.
  Conditional selector reservations and checks against retained legacy bundles prevent tag/channel name conflicts
  between updated publishers. Registration and rollout events invalidate service selectors, and unique invalidation
  caller references prevent simultaneous requests from colliding. Missing channel deployments never fall back to
  another namespace. Cluster rollouts now write the `.deploymentInfo` pointer used by readers and invalidation.

  The exported `paths` helpers take one options object instead of positional arguments.

## 2.5.2

## 2.5.1

## 2.5.0

## 2.4.0

## 2.3.2

## 2.3.1

## 2.3.0

## 2.2.0

## 2.1.1

## 2.1.0

## 2.0.2

## 2.0.1

## 2.0.0

## 1.0.42

## 1.0.41

## 1.0.40

## 1.0.39

## 1.0.38

## 1.0.37

## 1.0.36

## 1.0.35

## 1.0.34

## 1.0.33

## 1.0.32

## 1.0.31

## 1.0.30

## 1.0.29

## 1.0.28

## 1.0.27

## 1.0.26

## 1.0.25

### Patch Changes

- d44c0b0: export withIO API

## 1.0.24

## 1.0.23

## 1.0.22

## 1.0.21

## 1.0.20

## 1.0.19

## 1.0.18

## 1.0.17

## 1.0.16

## 1.0.15

## 1.0.14

## 1.0.13

## 1.0.12

## 1.0.11

## 1.0.10

## 1.0.9

## 1.0.8

## 1.0.7

## 1.0.6

## 1.0.5

## 1.0.4

## 1.0.3

### Patch Changes

- 7694332: chore: RN 0.84-rc.5 -> RN 0.84 bump up

## 1.0.2

### Patch Changes

- b325495: fix(react-native-svg): buffer deps

## 1.0.1

## 1.0.0

### Major Changes

- 260daab: feat: introduce support react native 0.84
