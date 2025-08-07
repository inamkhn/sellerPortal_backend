# Email Service Setup with Resend

This guide explains how to set up and use the email service with Resend for sending verification emails, password reset emails, and other notifications.

## Prerequisites

1. **Resend Account**: Sign up at [resend.com](https://resend.com)
2. **Domain Verification**: Verify your domain in Resend dashboard (optional for testing)
3. **API Key**: Get your API key from Resend dashboard

## Environment Configuration

Add the following environment variables to your `.env` file:

```env
# Resend Configuration
RESEND_API_KEY="re_xxxxxxxxx"  # Your Resend API key
EMAIL_FROM="Furniture Marketplace <noreply@yourdomain.com>"  # From email address
FRONTEND_URL="http://localhost:3000"  # Frontend URL for email links
```

### Getting Your Resend API Key

1. Go to [resend.com](https://resend.com) and sign up/login
2. Navigate to the API Keys section
3. Create a new API key
4. Copy the key (starts with `re_`)

## Email Templates

The email service includes three pre-built email templates:

### 1. Email Verification
- **Trigger**: User registration
- **Purpose**: Verify user's email address
- **Expiry**: 24 hours
- **Template**: Professional HTML template with verification button

### 2. Password Reset
- **Trigger**: Forgot password request
- **Purpose**: Allow user to reset their password
- **Expiry**: 1 hour
- **Template**: Security-focused template with reset button

### 3. Password Reset Confirmation
- **Trigger**: Successful password reset
- **Purpose**: Confirm password was changed
- **Template**: Success confirmation template

## Usage Examples

### Basic Email Sending

```typescript
import { EmailService } from '../common/services/email.service';

// Inject the service
constructor(private emailService: EmailService) {}

// Send a custom email
await this.emailService.sendEmail({
  to: 'user@example.com',
  subject: 'Welcome!',
  html: '<h1>Welcome to our platform!</h1>',
  text: 'Welcome to our platform!', // Optional plain text version
});
```

### Verification Email

```typescript
// Send verification email (automatically called during registration)
await this.emailService.sendVerificationEmail(
  'user@example.com',
  'verification-token-here',
  'John Doe' // Optional user name
);
```

### Password Reset Email

```typescript
// Send password reset email (automatically called during forgot password)
await this.emailService.sendPasswordResetEmail(
  'user@example.com',
  'reset-token-here',
  'John Doe' // Optional user name
);
```

## Testing

### Development Mode
If `RESEND_API_KEY` is not set, the service will:
- Log email details to console instead of sending
- Continue working without throwing errors
- Show warnings about disabled email sending

### Testing with Real Emails
1. Set up your Resend API key
2. Use Resend's test email addresses:
   - `delivered@resend.dev` - Successfully delivered
   - `bounced@resend.dev` - Bounced email
   - `complained@resend.dev` - Spam complaint

## API Endpoints

The following auth endpoints automatically send emails:

### POST `/api/v1/auth/register`
- Sends verification email to new user
- Email contains verification link with 24-hour expiry

### POST `/api/v1/auth/resend-verification`
- Resends verification email
- Generates new verification token

### POST `/api/v1/auth/forgot-password`
- Sends password reset email
- Email contains reset link with 1-hour expiry

### POST `/api/v1/auth/reset-password`
- Sends password reset confirmation email
- Confirms successful password change

## Email Templates Customization

Email templates are defined in `src/common/services/email.service.ts`. You can customize:

- **Styling**: Modify the CSS in the HTML templates
- **Content**: Update the email copy and messaging
- **Branding**: Add your logo and brand colors
- **Links**: Customize the frontend URLs

## Error Handling

The email service includes comprehensive error handling:

- **API Key Missing**: Logs warning, continues without sending
- **Resend API Errors**: Logs error details, throws exception
- **Network Issues**: Retries and logs failures
- **Invalid Recipients**: Validates email addresses

## Production Considerations

### Domain Setup
1. Add your domain to Resend
2. Verify domain ownership
3. Set up SPF, DKIM, and DMARC records
4. Update `EMAIL_FROM` to use your domain

### Rate Limits
- Resend has rate limits based on your plan
- Implement queuing for high-volume sending
- Monitor sending statistics in Resend dashboard

### Security
- Keep API keys secure and rotate regularly
- Use environment variables, never hardcode keys
- Monitor for suspicious email activity
- Implement email sending quotas if needed

## Troubleshooting

### Common Issues

1. **Emails not sending**
   - Check API key is correct
   - Verify domain is set up properly
   - Check Resend dashboard for errors

2. **Emails going to spam**
   - Set up proper DNS records (SPF, DKIM, DMARC)
   - Use verified domain
   - Avoid spam trigger words

3. **Template rendering issues**
   - Check HTML syntax
   - Test with different email clients
   - Validate CSS compatibility

### Debug Mode
Enable debug logging by setting log level to debug in your NestJS configuration.

## Support

- **Resend Documentation**: [resend.com/docs](https://resend.com/docs)
- **Resend Support**: Available through their dashboard
- **Email Templates**: Can be tested using Resend's preview feature