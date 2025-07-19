# Technology Stack

## Framework & Runtime
- **NestJS** - Progressive Node.js framework with TypeScript
- **Node.js** - JavaScript runtime environment
- **TypeScript** - Primary language with strict type checking

## Database & ORM
- **Prisma** - Database ORM and query builder
- **@prisma/client** - Type-safe database client

## Authentication & Security
- **Passport.js** - Authentication middleware
- **JWT** - JSON Web Tokens for stateless auth
- **Google OAuth 2.0** - Social authentication
- **bcryptjs** - Password hashing
- **Helmet** - Security headers middleware
- **Throttler** - Rate limiting

## API & Documentation
- **Swagger/OpenAPI** - Automated API documentation
- **Global API prefix**: `/api/v1`
- **Swagger UI**: Available at `/api/docs`

## File Handling & Performance
- **Multer** - File upload middleware
- **Compression** - Response compression
- **Static file serving** - Uploads served from `/uploads`

## Development Tools
- **ESLint** - Code linting with TypeScript rules
- **Prettier** - Code formatting (single quotes, trailing commas)
- **Jest** - Testing framework
- **SWC** - Fast TypeScript/JavaScript compiler

## Common Commands

### Development
```bash
npm run start:dev    # Start in watch mode
npm run start:debug  # Start with debugging
npm run build        # Build for production
npm run start:prod   # Run production build
```

### Code Quality
```bash
npm run lint         # Run ESLint with auto-fix
npm run format       # Format code with Prettier
npm run test         # Run unit tests
npm run test:watch   # Run tests in watch mode
npm run test:cov     # Run tests with coverage
npm run test:e2e     # Run end-to-end tests
```

### Database
```bash
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run database migrations
npm run prisma:studio    # Open Prisma Studio
npm run prisma:seed      # Seed database
```

## Configuration
- Environment variables managed via `.env` file
- Global configuration using `@nestjs/config`
- CORS enabled for frontend integration
- Global validation pipes with transformation enabled