# Orincore Email Service Setup Guide

This guide provides step-by-step instructions for setting up professional email delivery for the Orincore AI Studio using Brevo (formerly SendinBlue) as the SMTP provider.

## Why Use a Professional SMTP Service?

Using a professional SMTP relay service like Brevo offers several advantages:

1. **Better Deliverability**: Emails are less likely to land in spam folders
2. **Domain Reputation**: Maintains a good sending reputation for your domain
3. **Scalability**: Handles high volume email sending
4. **Analytics**: Provides tracking and metrics for email delivery
5. **Compliance**: Helps maintain compliance with email sending regulations

## Step 1: Sign Up for Brevo

1. Go to [Brevo's website](https://www.brevo.com/) and sign up for an account
2. Brevo offers a free tier that allows sending up to 300 emails per day
3. Once registered, navigate to the SMTP & API section

## Step 2: Verify Your Domain

1. In Brevo, go to **Settings** → **Senders & IPs** → **Domains**
2. Click on **Add a new domain**
3. Enter your domain: `orincore.com`
4. Follow the verification process, which will provide you with DNS records to add

## Step 3: Add DNS Records to BigRock

1. Log in to your BigRock account
2. Go to **Manage Domains** → **DNS Management** → **Manage DNS**
3. Add the following DNS records provided by Brevo:

### SPF Record
```
Type: TXT
Hostname: @ (or leave blank for root domain)
Value: v=spf1 include:spf.sendinblue.com ~all
```

### DKIM Record
```
Type: TXT
Hostname: brevo._domainkey (or as provided by Brevo)
Value: (long string provided by Brevo)
```

### DMARC Record
```
Type: TXT
Hostname: _dmarc
Value: v=DMARC1; p=none; rua=mailto:dmarc@orincore.com
```

**Note:** DNS changes may take anywhere from a few minutes to 48 hours to propagate.

## Step 4: Get Your SMTP Credentials

1. In Brevo, go to **SMTP & API** → **SMTP**
2. You will find your SMTP credentials:
   - SMTP Server: smtp-relay.brevo.com
   - Port: 587
   - Login: Your Brevo account email
   - Password: Generate an SMTP API key in the interface

## Step 5: Update Environment Variables

Add the following environment variables to your .env file:

```
# Brevo SMTP Settings
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your-brevo-account-email
SMTP_PASSWORD=your-brevo-api-key
EMAIL_FROM=no-reply@orincore.com
```

## Step 6: Test Email Delivery

Run the following command to test your email configuration:

```
node test-email.js your-test-email@example.com
```

## Troubleshooting

If you encounter any issues:

1. **DNS Verification**: Ensure all DNS records have been properly added and have propagated
2. **SMTP Credentials**: Double-check your SMTP username and password
3. **Sender Address**: Make sure the sender email (no-reply@orincore.com) matches your verified domain
4. **Brevo Limits**: Check if you've reached your daily sending limit on the free plan

## Alternative SMTP Providers

If Brevo doesn't meet your needs, consider these alternatives:

- **Amazon SES**: Very cost-effective for high volume ($0.10 per 1,000 emails)
- **Mailgun**: Developer-friendly with good deliverability
- **Postmark**: Excellent deliverability, focused on transactional email
- **SMTP2GO**: Simple setup with good deliverability

## Support

For additional assistance:

- Brevo Support: https://help.brevo.com/
- BigRock Support: https://www.bigrock.in/support
- Orincore Support: support@orincore.com 