# Project Structure

## Root Directory
```
├── src/                 # Source code
├── test/               # E2E tests
├── node_modules/       # Dependencies
├── .env                # Environment variables
├── package.json        # Project configuration
├── tsconfig.json       # TypeScript configuration
├── nest-cli.json       # NestJS CLI configuration
├── eslint.config.mjs   # ESLint configuration
├── .prettierrc         # Prettier configuration
└── README.md           # Project documentation
```

## Source Code Organization (`src/`)

### Core Application Files
- `main.ts` - Application bootstrap and configuration
- `app.module.ts` - Root application module
- `app.controller.ts` - Root controller (health check)
- `app.service.ts` - Root service

### Feature Modules
Each business domain is organized as a separate module:

- `auth/` - Authentication and authorization
- `users/` - User management
- `profile/` - User profile management
- `products/` - Product catalog management
- `orders/` - Order processing
- `payments/` - Payment handling
- `referrals/` - Referral system
- `upload/` - File upload functionality

### Shared Components
- `common/` - Shared utilities, filters, guards, decorators
- `database/` - Database configuration and Prisma setup

## Module Structure Pattern
Each feature module follows NestJS conventions:
```
feature/
├── feature.module.ts      # Module definition
├── feature.controller.ts  # HTTP request handlers
├── feature.service.ts     # Business logic
├── feature.controller.spec.ts  # Controller tests
└── feature.service.spec.ts     # Service tests
```

## Architecture Principles

### Dependency Injection
- Use NestJS built-in DI container
- Services are injectable and testable
- Controllers depend on services, not direct database access

### Module Organization
- Feature-based module structure
- Each module encapsulates related functionality
- Shared functionality in `common/` directory
- Database module provides global Prisma access

### File Naming Conventions
- Use kebab-case for file names
- Include file type in name: `.controller.ts`, `.service.ts`, `.module.ts`
- Test files end with `.spec.ts`
- E2E tests end with `.e2e-spec.ts`

### Import Organization
- External libraries first
- Internal modules second
- Relative imports last
- Group related imports together

## Configuration Management
- Environment-specific config in `.env`
- Global config module available throughout app
- Type-safe configuration using `@nestjs/config`

## Testing Structure
- Unit tests alongside source files (`.spec.ts`)
- E2E tests in separate `test/` directory
- Jest configuration in `package.json`
- Coverage reports generated in `coverage/` directory