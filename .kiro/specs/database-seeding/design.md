# Design Document

## Overview

The database seeding system will create comprehensive sample data for the furniture marketplace, populating all major entities with realistic test data. The seed script will be implemented as a TypeScript file that uses Prisma Client to create interconnected sample records across all database tables.

## Architecture

### Seed Script Structure
- **Location**: `prisma/seed.ts`
- **Execution**: Via `npm run prisma:seed` command
- **Database Connection**: Uses Prisma Client with environment DATABASE_URL
- **Error Handling**: Comprehensive try-catch blocks with detailed logging
- **Idempotency**: Safe to run multiple times without creating duplicates

### Data Generation Strategy
- **Deterministic Data**: Use consistent seed values for reproducible results
- **Realistic Content**: Generate meaningful furniture-related data
- **Relationship Integrity**: Ensure all foreign key relationships are valid
- **Volume**: Sufficient data to test pagination and performance

## Components and Interfaces

### Core Seed Functions

```typescript
interface SeedData {
  users: User[];
  profiles: Profile[];
  products: Product[];
  orderRequests: OrderRequest[];
  payments: Payment[];
  referrals: Referral[];
}

// Main seeding functions
async function seedUsers(): Promise<User[]>
async function seedProfiles(users: User[]): Promise<Profile[]>
async function seedProducts(users: User[]): Promise<Product[]>
async function seedOrderRequests(users: User[], products: Product[]): Promise<OrderRequest[]>
async function seedPayments(orders: OrderRequest[], users: User[]): Promise<Payment[]>
async function seedReferrals(users: User[]): Promise<Referral[]>
```

### Utility Functions

```typescript
// Helper functions for data generation
function generateReferralCode(): string
function generateRandomPrice(min: number, max: number): Decimal
function getRandomEnum<T>(enumObject: T): T[keyof T]
function generatePhoneNumber(): string
function generateWhatsAppNumber(): string
```

## Data Models

### User Seed Data
- **Admin Users**: 2 admin accounts with full permissions
- **Regular Users**: 15 regular users with varied profiles
- **Authentication**: Mix of email/password and Google OAuth users
- **Verification Status**: Mix of verified and unverified accounts

### Profile Seed Data
- **Complete Profiles**: 12 users with full profile information
- **Partial Profiles**: 5 users with minimal profile data
- **Bank Accounts**: Distribution across EASYPAISA, JAZZCASH, BANK_ACCOUNT
- **Referral Codes**: Unique codes for each profile
- **Social Links**: Mix of Facebook and Dubizzle links

### Product Seed Data
- **Categories**: Products across all ProductCategory enum values
- **Conditions**: Mix of NEW, LIKE_NEW, GOOD, FAIR, SECOND_HAND
- **Pricing**: Range from $50 to $5000 for realistic furniture prices
- **Photos**: Placeholder image URLs for each product
- **Inventory**: Varied quantities and SKU codes

### Order Request Seed Data
- **Status Distribution**: 
  - PENDING: 30%
  - CONFIRMED: 25%
  - IN_PROGRESS: 20%
  - DELIVERED: 15%
  - CANCELLED: 5%
  - PAYMENT_PENDING: 5%
- **Customer Information**: Realistic customer contact details
- **Delivery Dates**: Mix of past, present, and future dates

### Payment Seed Data
- **Payment Types**: Mix of NORMAL and REFERRAL payments
- **Status Distribution**: 70% PAID, 20% PENDING, 10% CANCELLED
- **Referrer Shares**: 10% commission for referral payments
- **Proof Screenshots**: Placeholder URLs for payment proofs

### Referral Seed Data
- **Referral Chains**: Multi-level referral relationships
- **Network Structure**: Some users with multiple referrals, others with none
- **Realistic Patterns**: Avoid circular references and maintain hierarchy

## Error Handling

### Database Connection
- Verify Prisma Client connection before seeding
- Handle connection timeouts and database unavailability
- Provide clear error messages for connection issues

### Data Validation
- Validate enum values before insertion
- Check for required field constraints
- Handle unique constraint violations gracefully

### Transaction Management
- Use database transactions for data consistency
- Rollback on any seeding failure
- Log progress and completion status

## Testing Strategy

### Seed Script Testing
- **Unit Tests**: Test individual seed functions
- **Integration Tests**: Test complete seeding process
- **Data Validation**: Verify created data meets schema constraints
- **Relationship Tests**: Ensure all foreign keys are valid

### Database State Testing
- **Before Seeding**: Verify clean database state
- **After Seeding**: Validate expected record counts
- **Data Integrity**: Check referential integrity
- **Performance**: Measure seeding execution time

### Reset and Reseed Testing
- **Clean Reset**: Test `prisma migrate reset` functionality
- **Automatic Seeding**: Verify seed runs after reset
- **Idempotency**: Test multiple seed executions
- **Error Recovery**: Test recovery from partial failures

## Implementation Details

### Package.json Configuration
The seed script is already configured in package.json:
```json
"prisma:seed": "ts-node prisma/seed.ts"
```

### Environment Requirements
- DATABASE_URL must be configured
- Node.js and ts-node must be available
- Prisma Client must be generated

### Execution Flow
1. Initialize Prisma Client
2. Clear existing data (optional flag)
3. Seed users and profiles
4. Seed products
5. Seed order requests
6. Seed payments with referral calculations
7. Seed referral relationships
8. Log summary statistics
9. Close database connection

### Data Relationships
- Users → Profiles (1:1)
- Users → Products (1:many)
- Users → OrderRequests (1:many)
- Products → OrderRequests (1:many)
- OrderRequests → Payments (1:many)
- Users → Referrals (many:many)
- Profiles → Referrer relationship (many:1)