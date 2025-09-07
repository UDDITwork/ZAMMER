# 🔧 ZAMMER Authentication Testing Troubleshooting Guide

## Quick Start

### 1. Setup Environment
```bash
cd backend
node setup-test-env.js
```

### 2. Test MongoDB Connection
```bash
node test-mongodb-connection.js
```

### 3. Run Authentication Logging Test
```bash
node test-auth-logging.js
```

## Common Issues & Solutions

### ❌ MongoDB Connection Issues

#### Issue: `MONGODB_URI is undefined`
```
❌ MONGODB_URI environment variable is not defined
```

**Solution:**
1. Create `.env` file in backend directory:
```bash
cd backend
cp .env.example .env  # if .env.example exists
# OR create new .env file
```

2. Add MongoDB URI to `.env`:
```env
MONGODB_URI=mongodb://localhost:27017/zammer
JWT_SECRET=your_super_secret_jwt_key_here
NODE_ENV=development
```

3. Run setup script:
```bash
node setup-test-env.js
```

#### Issue: `ECONNREFUSED` Error
```
❌ MongoDB connection failed: connect ECONNREFUSED 127.0.0.1:27017
```

**Solutions:**
1. **Start MongoDB service:**
   ```bash
   # Windows (if installed as service)
   net start MongoDB
   
   # macOS (with Homebrew)
   brew services start mongodb-community
   
   # Linux (Ubuntu/Debian)
   sudo systemctl start mongod
   ```

2. **Check if MongoDB is running:**
   ```bash
   # Check if port 27017 is in use
   netstat -an | grep 27017
   
   # Or try connecting directly
   mongosh mongodb://localhost:27017
   ```

3. **Install MongoDB if not installed:**
   - [MongoDB Community Server](https://www.mongodb.com/try/download/community)
   - [MongoDB Atlas](https://www.mongodb.com/atlas) (cloud option)

#### Issue: Authentication Failed
```
❌ MongoDB connection failed: Authentication failed
```

**Solutions:**
1. **Check credentials in URI:**
   ```env
   # For local MongoDB without auth
   MONGODB_URI=mongodb://localhost:27017/zammer
   
   # For MongoDB with auth
   MONGODB_URI=mongodb://username:password@localhost:27017/zammer
   
   # For MongoDB Atlas
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/zammer
   ```

2. **Create user if needed:**
   ```javascript
   // Connect to MongoDB and create user
   use zammer
   db.createUser({
     user: "zammer_user",
     pwd: "your_password",
     roles: [{ role: "readWrite", db: "zammer" }]
   })
   ```

### ❌ Schema Index Warnings

#### Issue: Duplicate Schema Index Warnings
```
[MONGOOSE] Warning: Duplicate schema index on {"email":1} found
[MONGOOSE] Warning: Duplicate schema index on {"mobileNumber":1} found
```

**Solution:** ✅ **FIXED** - The duplicate indexes have been removed from the User model.

### ❌ JWT Secret Issues

#### Issue: JWT_SECRET not defined
```
❌ JWT_SECRET not found in environment
```

**Solution:**
1. Generate a strong JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

2. Add to `.env` file:
```env
JWT_SECRET=your_generated_secret_here
```

### ❌ Permission Issues

#### Issue: Cannot create log files
```
❌ Failed to write to log file: EACCES: permission denied
```

**Solution:**
1. **Check directory permissions:**
   ```bash
   # Create logs directory with proper permissions
   mkdir -p backend/logs
   chmod 755 backend/logs
   ```

2. **Run with proper permissions:**
   ```bash
   # On Linux/macOS, you might need sudo for certain operations
   sudo node test-auth-logging.js
   ```

### ❌ Node.js Version Issues

#### Issue: Node.js version compatibility
```
❌ SyntaxError: Unexpected token
```

**Solution:**
1. **Check Node.js version:**
   ```bash
   node --version
   ```

2. **Update Node.js if needed:**
   - Minimum required: Node.js 14.x
   - Recommended: Node.js 16.x or higher
   - Download from: [nodejs.org](https://nodejs.org/)

## Testing Steps

### Step 1: Environment Setup
```bash
cd backend
node setup-test-env.js
```

Expected output:
```
✅ .env file found
✅ MONGODB_URI found in environment
✅ JWT_SECRET found in environment
```

### Step 2: MongoDB Connection Test
```bash
node test-mongodb-connection.js
```

Expected output:
```
✅ MongoDB connection successful!
📋 Available databases: admin, config, local, zammer
📁 Collections in current database: users, sellers, products
🎉 MongoDB connection test completed successfully!
```

### Step 3: Authentication Logging Test
```bash
node test-auth-logging.js
```

Expected output:
```
🔧 TESTING AUTHENTICATION LOGGING SYSTEM
==========================================

1️⃣ Testing User Creation and Password Hashing...
✅ Test user created successfully

2️⃣ Testing Password Comparison...
✅ Password comparison result: true
✅ Wrong password test result: false

3️⃣ Testing Login Attempt Tracking...
✅ Login attempts incremented

4️⃣ Testing Password Reset Token Generation...
✅ Reset token generated: a1b2c3d4e5...

5️⃣ Testing Password Reset Token Lookup...
✅ Token lookup result: Found

6️⃣ Testing Centralized Logger...
✅ Centralized logger tested

7️⃣ Testing Password Change...
✅ Password changed successfully

8️⃣ Testing Login Attempts Reset...
✅ Login attempts reset

9️⃣ Testing Email Verification Token...
✅ Email verification token generated: f6g7h8i9j0...

🔟 Cleaning up test user...
✅ Test user deleted

🎉 ALL LOGGING TESTS COMPLETED SUCCESSFULLY!
```

## Log Files Generated

After successful testing, check these log files:

```bash
# Check log files
ls -la backend/logs/

# View password operations
cat backend/logs/password-*.log

# View security events
cat backend/logs/security-*.log

# View authentication events
cat backend/logs/auth-*.log
```

## Manual Testing

### Test User Registration
```bash
curl -X POST http://localhost:5000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123",
    "mobileNumber": "+1234567890"
  }'
```

### Test User Login
```bash
curl -X POST http://localhost:5000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Test Password Reset
```bash
# Request reset token
curl -X POST http://localhost:5000/api/users/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com"
  }'

# Use token to reset password (replace YOUR_TOKEN_HERE)
curl -X PUT http://localhost:5000/api/users/reset-password/YOUR_TOKEN_HERE \
  -H "Content-Type: application/json" \
  -d '{
    "newPassword": "newpassword123"
  }'
```

## Monitoring Logs

### Real-time Log Monitoring
```bash
# Monitor all logs
tail -f backend/logs/*.log

# Monitor specific log types
tail -f backend/logs/password-*.log
tail -f backend/logs/security-*.log
tail -f backend/logs/auth-*.log
```

### Search Logs
```bash
# Find failed logins
grep "LOGIN_FAILED" backend/logs/password-*.log

# Find account lockouts
grep "ACCOUNT_LOCKED" backend/logs/security-*.log

# Find password resets
grep "RESET_PASSWORD" backend/logs/reset-*.log

# Find security events
grep "SECURITY_EVENT" backend/logs/security-*.log
```

## Production Considerations

### Environment Variables
```env
# Production .env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/zammer
JWT_SECRET=very_strong_secret_here_64_chars_minimum
NODE_ENV=production
```

### Log Rotation
```bash
# Set up log rotation (Linux/macOS)
sudo nano /etc/logrotate.d/zammer

# Add configuration:
/path/to/zammer/backend/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 node node
}
```

### Security
1. **Never commit .env files**
2. **Use strong JWT secrets**
3. **Enable MongoDB authentication**
4. **Monitor log files for security events**
5. **Set up log file permissions properly**

## Getting Help

If you're still having issues:

1. **Check the logs** in `backend/logs/`
2. **Verify environment variables** with `node setup-test-env.js`
3. **Test MongoDB connection** with `node test-mongodb-connection.js`
4. **Check Node.js and MongoDB versions**
5. **Review the console output** for specific error messages

## Success Indicators

✅ **Environment Setup Complete:**
- `.env` file exists with proper values
- MongoDB URI is configured
- JWT secret is set

✅ **MongoDB Connection Working:**
- Connection successful
- Can list databases and collections
- No authentication errors

✅ **Authentication Logging Working:**
- All test operations complete successfully
- Log files are generated
- No errors in console output
- User operations are logged properly

✅ **Ready for Production:**
- All tests pass
- Logs are being written
- Security events are tracked
- Performance is acceptable
