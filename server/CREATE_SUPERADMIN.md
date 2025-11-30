# Creating a Superadmin Account

## Prerequisites

- **Before first use**: Run `npm install` to ensure all dependencies are installed
- The script includes a built-in dependency check that will fail gracefully if bcrypt is not installed
- If you see a "bcrypt dependency not found" error, simply run `npm install`

## Usage

To create or update a superadmin account, run the following command:

```bash
SUPERADMIN_EMAIL=your@email.com SUPERADMIN_PASSWORD=YourSecurePassword npx tsx server/create-superadmin.ts
```

## Security Notes

- **Never commit credentials to the repository**
- The script accepts credentials via environment variables only
- Passwords are hashed using bcrypt (10 salt rounds) before storage
- The plaintext password is never logged or stored

## Verification

After running the script, verify the account works by:

1. Testing login via API:
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"YourSecurePassword"}'
```

2. Or by logging in through the web interface

## What the Script Does

- Checks if a user with the provided email already exists
- If exists: Updates the password and ensures superadmin role
- If new: Creates a new superadmin user with the provided credentials
- Sets the user as active and assigns superadmin role
