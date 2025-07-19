# Requirements Document

## Introduction

This feature involves creating comprehensive seed data for the furniture marketplace database to support development, testing, and demonstration purposes. The seed data should populate all major entities including users, products, orders, and referrals with realistic sample data.

## Requirements

### Requirement 1

**User Story:** As a developer, I want to populate the database with sample data, so that I can test the application functionality without manually creating data.

#### Acceptance Criteria

1. WHEN the seed command is executed THEN the system SHALL create sample users with different roles
2. WHEN the seed command is executed THEN the system SHALL create sample furniture products with categories, images, and pricing
3. WHEN the seed command is executed THEN the system SHALL create sample orders with different statuses
4. WHEN the seed command is executed THEN the system SHALL create sample referral relationships between users
5. WHEN the seed command is executed THEN the system SHALL handle existing data gracefully without duplicating records

### Requirement 2

**User Story:** As a developer, I want the seed data to be realistic and comprehensive, so that I can properly test all application features.

#### Acceptance Criteria

1. WHEN seed data is created THEN the system SHALL include at least 10 users with varied profiles
2. WHEN seed data is created THEN the system SHALL include at least 20 furniture products across different categories
3. WHEN seed data is created THEN the system SHALL include sample orders in various states (pending, completed, cancelled)
4. WHEN seed data is created THEN the system SHALL include referral chains showing multi-level relationships
5. WHEN seed data is created THEN the system SHALL include sample payment records linked to orders

### Requirement 3

**User Story:** As a developer, I want to easily reset and reseed the database, so that I can start with fresh test data when needed.

#### Acceptance Criteria

1. WHEN the reset command is executed THEN the system SHALL clear all existing data
2. WHEN the reset command is executed THEN the system SHALL re-run migrations
3. WHEN the reset command is executed THEN the system SHALL automatically run the seed script
4. WHEN seeding fails THEN the system SHALL provide clear error messages
5. WHEN seeding completes THEN the system SHALL log a summary of created records