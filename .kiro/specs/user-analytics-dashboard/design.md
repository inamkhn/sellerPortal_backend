# Design Document

## Overview

The User Analytics Dashboard feature provides a comprehensive API endpoint that aggregates and returns key performance metrics for users in the furniture marketplace. The system will calculate real-time analytics including total earnings, product listings, order statistics, and referral performance through efficient database queries and proper data aggregation.

## Architecture

### API Layer
- **Controller**: `UserAnalyticsController` - Handles HTTP requests and authentication
- **Service**: `UserAnalyticsService` - Contains business logic for analytics calculations
- **DTOs**: Response DTOs for structured data return

### Database Layer
- **Prisma ORM**: Leverages existing database models and relationships
- **Aggregation Queries**: Optimized queries for calculating metrics
- **Indexing**: Utilizes existing database indexes for performance

### Authentication
- **JWT Guards**: Ensures only authenticated users can access their analytics
- **User Context**: Extracts user ID from JWT token for data filtering

## Components and Interfaces

### UserAnalyticsController
```typescript
@Controller('api/v1/user/analytics')
@UseGuards(JwtAuthGuard)
export class UserAnalyticsController {
  @Get()
  async getUserAnalytics(@GetUser() user: User): Promise<UserAnalyticsResponse>
}
```

### UserAnalyticsService
```typescript
@Injectable()
export class UserAnalyticsService {
  async calculateUserAnalytics(userId: number): Promise<UserAnalyticsData>
  private async calculateTotalEarnings(userId: number): Promise<number>
  private async countUserProducts(userId: number): Promise<number>
  private async countUserOrders(userId: number): Promise<number>
  private async calculateReferralStats(userId: number): Promise<ReferralStats>
}
```

### Response DTOs
```typescript
interface UserAnalyticsResponse {
  success: boolean;
  data: UserAnalyticsData;
}

interface UserAnalyticsData {
  totalEarnings: number;
  totalProducts: number;
  totalOrders: number;
  referralStats: ReferralStats;
}

interface ReferralStats {
  totalReferrals: number;
  referralCode: string;
}
```

## Data Models

### Database Relationships Used
- **User → Products**: One-to-many relationship for product ownership
- **User → OrderRequests**: Through products for order counting
- **User → Payments**: For earnings calculation (both as user and referrer)
- **User → Profile**: For referral code access
- **User → Referrals**: For referral statistics

### Key Aggregation Queries

#### Total Earnings Calculation
```sql
SELECT 
  COALESCE(SUM(user_share), 0) + COALESCE(SUM(referrer_share), 0) as total_earnings
FROM payments 
WHERE (user_id = ? OR referrer_id = ?) AND status = 'PAID'
```

#### Product Count
```sql
SELECT COUNT(*) as product_count
FROM products 
WHERE owner_id = ?
```

#### Order Count
```sql
SELECT COUNT(*) as order_count
FROM order_requests or
JOIN products p ON or.product_id = p.id
WHERE p.owner_id = ?
```

#### Referral Statistics
```sql
SELECT COUNT(*) as referral_count
FROM referrals 
WHERE referrer_id = ?
```

## Error Handling

### Authentication Errors
- **401 Unauthorized**: Invalid or missing JWT token
- **403 Forbidden**: Valid token but insufficient permissions

### Data Errors
- **404 Not Found**: User profile not found (for referral code)
- **500 Internal Server Error**: Database connection or query errors

### Error Response Format
```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    timestamp: string;
  };
}
```

## Testing Strategy

### Unit Tests
- **Service Layer**: Test each analytics calculation method independently
- **Controller Layer**: Test authentication and response formatting
- **Mock Data**: Use Jest mocks for Prisma service calls

### Integration Tests
- **Database Integration**: Test actual database queries with test data
- **Authentication Flow**: Test JWT guard integration
- **End-to-End**: Test complete request/response cycle

### Test Data Requirements
- Users with various payment statuses
- Products with different ownership patterns
- Order requests with different statuses
- Referral relationships between users

### Performance Tests
- **Load Testing**: Multiple concurrent analytics requests
- **Query Performance**: Measure database query execution times
- **Memory Usage**: Monitor service memory consumption during calculations

## Security Considerations

### Data Privacy
- Users can only access their own analytics data
- No exposure of other users' financial information
- Proper input validation and sanitization

### Authentication
- JWT token validation on every request
- User context extraction from verified tokens
- Rate limiting to prevent abuse

### Database Security
- Parameterized queries to prevent SQL injection
- Proper error handling to avoid information leakage
- Database connection security through environment variables

## Performance Optimizations

### Database Indexing
- Leverage existing indexes on user_id, product owner_id, and payment status
- Ensure referral queries use referrer_id index
- Monitor query execution plans for optimization opportunities

### Caching Strategy
- Consider implementing Redis caching for frequently accessed analytics
- Cache invalidation on relevant data changes (payments, products, orders)
- TTL-based cache expiration for data freshness

### Query Optimization
- Use database aggregation functions instead of application-level calculations
- Minimize the number of database round trips
- Implement connection pooling for concurrent requests