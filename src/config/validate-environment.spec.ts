import { validateEnvironment } from './validate-environment';

describe('production configuration', () => {
  const valid = {
    NODE_ENV: 'production', DATABASE_URL: 'postgresql://example',
    JWT_SECRET: 'a'.repeat(64), FRONTEND_URL: 'https://example.com',
    REDIS_HOST: 'redis', REDIS_PASSWORD: 'password',
    GOOGLE_CLIENT_ID: 'id', GOOGLE_CLIENT_SECRET: 'secret',
    CLOUDINARY_CLOUD_NAME: 'name', CLOUDINARY_API_KEY: 'key',
    CLOUDINARY_API_SECRET: 'secret', RESEND_API_KEY: 'key', EMAIL_FROM: 'test@example.com',
  };
  it('accepts configured production deployments', () => {
    expect(validateEnvironment(valid)).toBe(valid);
  });
  it.each(['DATABASE_URL', 'JWT_SECRET', 'REDIS_PASSWORD', 'RESEND_API_KEY'])('rejects missing %s', (key) => {
    expect(() => validateEnvironment({ ...valid, [key]: '' })).toThrow(key);
  });
  it('rejects development secrets and HTTP frontend origins', () => {
    expect(() => validateEnvironment({ ...valid, JWT_SECRET: 'your-super-secret-jwt-key' })).toThrow('JWT_SECRET');
    expect(() => validateEnvironment({ ...valid, FRONTEND_URL: 'http://example.com' })).toThrow('HTTPS');
  });
  it('does not change development configuration requirements', () => {
    expect(validateEnvironment({ NODE_ENV: 'development' })).toEqual({ NODE_ENV: 'development' });
  });
});
