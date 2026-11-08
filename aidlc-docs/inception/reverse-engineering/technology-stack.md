# Technology Stack

## Programming Languages

- TypeScript 5.9.3 - frontend application and configuration.
- TypeScript 6.0.3 - backend application and tests.
- TSX - React components.
- CSS - Tailwind CSS import plus custom global effects.
- LRC - synchronized lyric fixtures.

## Frontend Frameworks and Libraries

- Next.js 16.4.3 - App Router, build, static rendering, and development server.
- React and React DOM 19.3.0 - component runtime.
- Zustand 5.0.16 - client state management.
- Tailwind CSS 4.3.3 with `@tailwindcss/turbopack` - styling/build integration.
- Lucide React 1.61.0 - icons.

## Backend Frameworks and Libraries

- NestJS 12.2.0 - server framework with Express adapter.
- RxJS 7.8.2 and reflect-metadata 0.2.2 - Nest runtime dependencies.

## Build and Quality Tools

- npm with separate lockfiles per package.
- Turbopack through Next.js.
- ESLint 9.39 with Next Core Web Vitals and TypeScript rules.
- Nest CLI 12.0, Oxlint 1.89, and Prettier 3.9.
- TypeScript strict mode in both packages.

## Testing Tools

- Backend: Vitest 4.1, Nest Testing, Supertest 7.3, and V8 coverage dependency.
- Frontend: none configured.

## Infrastructure and External Services

- **Implemented**: none.
- **Target in README**: database, Gemini, Cloudinary, Google Identity, VNPay or MoMo, email provider, Docker, and GitHub CI/CD.

## Verified Quality Commands

- Root `npm run lint`: pass.
- Root `npm run build`: pass, including TypeScript and static page generation.
- Server `npm run lint`: pass.
- Server `npm run test`: one test pass.
- Server `npm run test:e2e`: one test pass.
- Server `npm run build`: pass.
- Vitest reports that `vite-tsconfig-paths` can be replaced by native Vite `resolve.tsconfigPaths`.
