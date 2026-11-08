# Component Inventory

## Application Packages

1. `dmptify-music-ai` - Next.js listener-facing prototype at repository root.
2. `server` - NestJS backend scaffold.

## Infrastructure Packages

None. No Docker, Compose, Terraform, CDK, CloudFormation, Kubernetes, or CI workflow was found.

## Shared Packages

None. Frontend types are local and are not shared with the server.

## Test Packages

There is no independent test package. Backend tests are embedded in `server/`; frontend has no test framework or test files.

## Runtime Component Count

- **Frontend route roots**: 1.
- **Frontend feature/layout components**: 6.
- **Frontend stores**: 1.
- **Frontend domain/type modules**: 2.
- **Backend modules**: 1.
- **Backend controllers**: 1.
- **Backend services**: 1.
- **Backend unit test files**: 1.
- **Backend E2E test files**: 1.

## Package Count

- **Total npm packages in repository**: 2.
- **Application packages**: 2.
- **Infrastructure packages**: 0.
- **Shared packages**: 0.
- **Independent test packages**: 0.
