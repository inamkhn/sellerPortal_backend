import { ProductCondition } from '@prisma/client';

/**
 * Maps internal product categories to Facebook Marketplace categories
 */
export const FACEBOOK_CATEGORY_MAPPING: Record<string, string> = {
  BEDS: 'Home & Garden',
  CHAIRS: 'Home & Garden',
  TABLES: 'Home & Garden',
  SOFAS: 'Home & Garden',
  WARDROBES: 'Home & Garden',
  STORAGE: 'Home & Garden',
  OTHER: 'Home & Garden',
};

/**
 * Maps internal product conditions to Facebook Marketplace conditions
 */
export const FACEBOOK_CONDITION_MAPPING: Record<ProductCondition, string> = {
  NEW: 'New',
  LIKE_NEW: 'Like New',
  GOOD: 'Good',
  FAIR: 'Fair',
  SECOND_HAND: 'Used',
};

/**
 * Available meetup preferences for Facebook Marketplace
 */
export const FACEBOOK_MEETUP_PREFERENCES = [
  'Door drop-off',
  'Pick up',
  'Meet in public',
] as const;

export type FacebookMeetupPreference =
  (typeof FACEBOOK_MEETUP_PREFERENCES)[number];
