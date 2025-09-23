# Facebook Marketplace Integration

This module provides automated posting of products to Facebook Marketplace using Selenium browser automation.

## Features

- Automatic product posting to Facebook Marketplace
- Image download and handling from Cloudinary
- Retry logic for failed postings
- Status tracking and error handling
- Configuration validation

## Setup

1. **Chrome Profile Setup**
   - Open Chrome and log into Facebook
   - Navigate to Facebook Marketplace and verify you can create listings manually
   - Note your Chrome user data directory and profile name

2. **Python Environment**
   - Install Python 3.9+
   - Install Selenium: `pip install selenium`
   - Ensure ChromeDriver is available (recent Selenium versions auto-manage this)

3. **Environment Variables**
   - Copy `.env.facebook.example` to your `.env` file
   - Update the Chrome user data directory path
   - Update the Chrome profile name (usually "Default")
   - Set the Python executable path if needed

## API Endpoints

- `POST /api/v1/integrations/facebook/publish?productId={id}` - Publish product to Facebook
- `GET /api/v1/integrations/facebook/status/{productId}` - Get posting status
- `POST /api/v1/integrations/facebook/retry/{productId}` - Retry failed posting
- `GET /api/v1/integrations/facebook/health` - Health check

## Database Schema

The module adds the following fields to the `Product` model:

- `facebookPostingStatus` - Current posting status (NOT_POSTED, POSTING, POSTED, FAILED, NEEDS_UPDATE)
- `facebookListingUrl` - URL of the Facebook listing (if posted successfully)
- `facebookPostedAt` - Timestamp when posted to Facebook
- `facebookLastError` - Last error message (if posting failed)
- `facebookRetryCount` - Number of retry attempts

## Configuration

All configuration is handled through environment variables. See `.env.facebook.example` for all available options.

## Error Handling

The module includes comprehensive error handling for:

- Configuration errors (missing Chrome profile, invalid paths)
- Authentication errors (Facebook not logged in)
- Selenium errors (element not found, timeouts)
- Facebook platform errors (captchas, rate limiting)
- File system errors (image download failures)

## Troubleshooting

1. **Chrome Profile Issues**
   - Ensure Chrome profile path is correct
   - Verify Facebook is logged in on that profile
   - Check profile permissions

2. **Python/Selenium Issues**
   - Verify Python installation
   - Check Selenium installation
   - Ensure ChromeDriver compatibility

3. **Image Download Issues**
   - Check Cloudinary URL accessibility
   - Verify temp directory permissions
   - Monitor disk space

## Development

To add new features or modify the automation:

1. Update the Python Selenium script in `scripts/facebook_automation/`
2. Modify the data transformation in `FacebookIntegrationService`
3. Add new configuration options in `facebook.config.ts`
4. Update the database schema if needed

## Testing

The module includes unit tests for all services and integration tests for the complete flow. Run tests with:

```bash
npm run test
npm run test:e2e
```