export interface FacebookProductData {
  title: string;
  description: string;
  price: string;
  category: string;
  condition: string;
  images: string[];
  tags: string[];
  sku?: string;
  meetupPreference: string;
  inStock: boolean;
}
