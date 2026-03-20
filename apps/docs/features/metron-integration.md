# Metron Integration

Comic Shelf integrates with the [Metron Comic Database](https://metron.cloud) for rich comic metadata.

## UPC Lookup

Enter or scan a comic's UPC barcode and the app will query Metron to retrieve:

- Title and issue number
- Series and publisher
- Cover date
- Cover image URL

## Rate Limits

The Metron API enforces:
- **20 requests per minute**
- **5,000 requests per day**

The backend includes an in-memory rate limiter that respects these limits automatically.

## Authentication

Metron credentials are configured via environment variables:

```env
METRON_USERNAME=your_username
METRON_PASSWORD=your_password
METRON_API_BASE_URL=https://metron.cloud
```

All Metron calls are proxied through the backend — the frontend never calls Metron directly.
