# Requirements Document

## Introduction

This feature provides a comprehensive user analytics dashboard that displays key metrics and statistics for users in the furniture marketplace. The dashboard will show total earnings, product listings count, order statistics, and referral information, giving users insights into their marketplace activity and performance.

## Requirements

### Requirement 1

**User Story:** As a user, I want to view my total earnings from all completed orders, so that I can track my income from the marketplace.

#### Acceptance Criteria

1. WHEN a user requests their analytics dashboard THEN the system SHALL calculate and display their total earnings from all payments with status "PAID"
2. WHEN calculating earnings THEN the system SHALL include both user share and referrer share amounts where the user is the recipient
3. WHEN displaying earnings THEN the system SHALL format the amount as currency with proper decimal places
4. IF a user has no completed payments THEN the system SHALL display zero earnings

### Requirement 2

**User Story:** As a user, I want to see the total number of products I have listed, so that I can track my marketplace inventory.

#### Acceptance Criteria

1. WHEN a user requests their analytics dashboard THEN the system SHALL count and display the total number of products they own
2. WHEN counting products THEN the system SHALL include all products regardless of their status
3. WHEN displaying product count THEN the system SHALL show the count as a whole number
4. IF a user has no products THEN the system SHALL display zero products

### Requirement 3

**User Story:** As a user, I want to view my total number of orders, so that I can understand my sales activity.

#### Acceptance Criteria

1. WHEN a user requests their analytics dashboard THEN the system SHALL count and display the total number of order requests for their products
2. WHEN counting orders THEN the system SHALL include orders of all statuses
3. WHEN displaying order count THEN the system SHALL show the count as a whole number
4. IF a user has no orders THEN the system SHALL display zero orders

### Requirement 4

**User Story:** As a user, I want to see my referral statistics, so that I can track my referral program performance.

#### Acceptance Criteria

1. WHEN a user requests their analytics dashboard THEN the system SHALL display the total number of users they have referred
2. WHEN calculating referrals THEN the system SHALL count users where the current user is the referrer
3. WHEN displaying referral count THEN the system SHALL show the count as a whole number
4. WHEN displaying referral information THEN the system SHALL include the user's referral code
5. IF a user has no referrals THEN the system SHALL display zero referrals

### Requirement 5

**User Story:** As a user, I want to access my analytics dashboard through a secure API endpoint, so that I can integrate this data into different interfaces.

#### Acceptance Criteria

1. WHEN a user makes a request to the analytics endpoint THEN the system SHALL require valid authentication
2. WHEN an authenticated user requests analytics THEN the system SHALL return their personal analytics data only
3. WHEN returning analytics data THEN the system SHALL include all four metrics: earnings, products, orders, and referrals
4. WHEN an unauthenticated user attempts access THEN the system SHALL return an unauthorized error
5. WHEN a user requests another user's analytics THEN the system SHALL deny access

### Requirement 6

**User Story:** As a user, I want to view my monthly earnings breakdown, so that I can track my income trends over time.

#### Acceptance Criteria

1. WHEN a user requests their analytics dashboard THEN the system SHALL calculate and display monthly earnings for the last 12 months
2. WHEN calculating monthly earnings THEN the system SHALL group payments by month and year
3. WHEN displaying monthly data THEN the system SHALL include both user share and referrer share earnings
4. WHEN showing monthly breakdown THEN the system SHALL format each month as "YYYY-MM" with corresponding earnings
5. IF a user has no earnings for a month THEN the system SHALL display zero for that month

### Requirement 7

**User Story:** As a user, I want to see my sales breakdown by product category, so that I can understand which categories perform best.

#### Acceptance Criteria

1. WHEN a user requests their analytics dashboard THEN the system SHALL calculate sales count by product category
2. WHEN calculating category sales THEN the system SHALL count completed orders grouped by product category
3. WHEN displaying category breakdown THEN the system SHALL show category name and order count
4. WHEN showing category sales THEN the system SHALL only include orders with status "DELIVERED" or "CONFIRMED"
5. IF a user has no sales in a category THEN the system SHALL not include that category in the results

### Requirement 8

**User Story:** As a user, I want to view my recent orders, so that I can quickly see my latest sales activity.

#### Acceptance Criteria

1. WHEN a user requests their analytics dashboard THEN the system SHALL display the 10 most recent orders for their products
2. WHEN showing recent orders THEN the system SHALL include order details: customer name, product name, price, status, and date
3. WHEN displaying recent orders THEN the system SHALL sort orders by creation date in descending order
4. WHEN showing order information THEN the system SHALL include order status and customer contact information
5. IF a user has no orders THEN the system SHALL return an empty list

### Requirement 9

**User Story:** As a system administrator, I want the analytics calculations to be performant, so that users receive quick responses.

#### Acceptance Criteria

1. WHEN calculating analytics THEN the system SHALL use efficient database queries with proper indexing
2. WHEN multiple analytics requests are made THEN the system SHALL handle them without performance degradation
3. WHEN calculating complex aggregations THEN the system SHALL optimize queries to minimize database load
4. WHEN returning analytics data THEN the response time SHALL be under 2 seconds for typical datasets