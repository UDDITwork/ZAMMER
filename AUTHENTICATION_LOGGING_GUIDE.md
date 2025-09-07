# 🔐 ZAMMER Authentication Logging Guide

## Overview

This guide documents the comprehensive logging system implemented for ZAMMER's authentication system. The logging covers all critical authentication operations including login, password changes, password resets, and security events.

## 🎯 Logging Levels & Icons

| Level | Icon | Description | File Logging |
|-------|------|-------------|--------------|
| `info` | 👤 | General information | No |
| `success` | ✅ | Successful operations | No |
| `warning` | ⚠️ | Warning conditions | No |
| `error` | ❌ | Error conditions | Yes |
| `critical` | 🚨 | Critical system errors | Yes |
| `password` | 🔐 | Password-related operations | Yes |
| `security` | 🛡️ | Security events | Yes |
| `auth` | 🔑 | Authentication operations | Yes |
| `reset` | 🔄 | Password reset operations | Yes |

## 📁 Log Files Location

Logs are stored in: `backend/logs/`
- Format: `{level}-{date}.log`
- Example: `password-2024-01-15.log`

## 🔍 User Model Logging (User.js)

### Password Hashing
```javascript
// When password is being hashed
logUserModel('PASSWORD_HASHING_START', {
  userId: this._id,
  email: this.email,
  passwordLength: this.password.length,
  isNewUser: this.isNew,
  operation: this.isNew ? 'CREATE' : 'UPDATE'
}, 'password');

// When password hashing completes
logUserModel('PASSWORD_HASHED_SUCCESS', {
  userId: this._id,
  email: this.email,
  originalLength: originalPassword.length,
  hashedLength: this.password.length,
  saltRounds: 10,
  hashFormat: this.password.substring(0, 10) + '...'
}, 'success');
```

### Password Comparison
```javascript
// When password comparison starts
logUserModel('PASSWORD_COMPARISON_START', {
  userId: this._id,
  email: this.email,
  enteredPasswordLength: enteredPassword?.length || 0,
  storedPasswordLength: this.password?.length || 0,
  storedPasswordFormat: this.password ? this.password.substring(0, 10) + '...' : 'null',
  isHashedFormat: this.password ? this.password.startsWith('$2') : false
}, 'password');

// When password comparison completes
logUserModel('PASSWORD_COMPARISON_RESULT', {
  userId: this._id,
  email: this.email,
  isMatch: isMatch,
  enteredPasswordLength: enteredPassword.length,
  storedPasswordLength: this.password.length
}, isMatch ? 'success' : 'warning');
```

### Login Attempt Tracking
```javascript
// When login attempts are incremented
logUserModel('LOGIN_ATTEMPT_INCREMENT', {
  userId: this._id,
  email: this.email,
  currentAttempts: currentAttempts,
  newAttempts: newAttempts,
  isCurrentlyLocked: this.isLocked,
  lockUntil: this.lockUntil
}, 'security');

// When account gets locked
logUserModel('ACCOUNT_LOCKED', {
  userId: this._id,
  email: this.email,
  failedAttempts: newAttempts,
  lockUntil: new Date(lockUntil).toISOString(),
  lockDuration: '2 hours'
}, 'critical');
```

### Password Reset Tokens
```javascript
// When reset token is generated
logUserModel('PASSWORD_RESET_TOKEN_GENERATED', {
  userId: this._id,
  email: this.email,
  tokenLength: resetToken.length,
  hashedTokenLength: this.resetPasswordToken.length,
  expiresAt: new Date(this.resetPasswordExpires).toISOString(),
  expiresInMinutes: 10
}, 'security');

// When reset token is looked up
logUserModel('PASSWORD_RESET_TOKEN_LOOKUP', {
  tokenLength: token.length,
  hashedTokenLength: hashedToken.length,
  searchTime: new Date().toISOString()
}, 'security');
```

## 🎮 Controller Logging (userController.js)

### User Login
```javascript
// Login attempt start
logUser('LOGIN_USER_START', { email }, 'auth');

// Password verification
logUser('PASSWORD_VERIFICATION_START', {
  email,
  enteredPasswordLength: password.length,
  storedPasswordLength: user.password.length,
  storedPasswordFormat: user.password.substring(0, 4) + '...',
  isHashedFormat: user.password.startsWith('$2'),
  currentAttempts: user.loginAttempts || 0,
  isLocked: user.isLocked
}, 'password');

// Failed login
logUser('LOGIN_FAILED_WRONG_PASSWORD', { 
  email,
  enteredPasswordLength: password.length,
  storedPasswordLength: user.password.length,
  currentAttempts: user.loginAttempts || 0
}, 'warning');

// Successful login
logUser('USER_LOGIN_SUCCESS', {
  userId: user._id,
  email: user.email,
  name: user.name,
  previousAttempts: user.loginAttempts || 0,
  wasLocked: user.isLocked,
  lastLogin: user.lastLogin
}, 'success');
```

### Password Change
```javascript
// Password change start
logUser('CHANGE_PASSWORD_START', { 
  userId: req.user._id,
  email: req.user.email,
  currentPasswordLength: currentPassword.length,
  newPasswordLength: newPassword.length
}, 'password');

// Password change success
logUser('CHANGE_PASSWORD_SUCCESS', { 
  userId: req.user._id,
  email: user.email,
  oldPasswordLength: oldPasswordHash.length,
  newPasswordLength: user.password.length,
  passwordChanged: oldPasswordHash !== user.password
}, 'success');
```

### Password Reset
```javascript
// Forgot password request
logUser('FORGOT_PASSWORD_START', { 
  email,
  requestTime: new Date().toISOString(),
  userAgent: req.get('User-Agent'),
  ip: req.ip
}, 'reset');

// Reset password completion
logUser('RESET_PASSWORD_SUCCESS', { 
  userId: user._id,
  email: user.email,
  oldPasswordLength: oldPasswordHash.length,
  newPasswordLength: user.password.length,
  passwordChanged: oldPasswordHash !== user.password,
  loginAttemptsReset: true,
  lockCleared: true
}, 'success');
```

## 🛠️ Centralized Logger Usage

### Basic Usage
```javascript
const { logger } = require('../utils/logger');

// General logging
logger.log('info', 'User operation', { userId: '123', action: 'login' });

// Specialized logging
logger.auth('LOGIN_ATTEMPT', { email: 'user@example.com', success: true });
logger.password('PASSWORD_CHANGE', { userId: '123', success: true });
logger.security('SECURITY_EVENT', { event: 'suspicious_activity' });
```

### Convenience Functions
```javascript
const { 
  logAuth, 
  logPassword, 
  logSecurity, 
  logError,
  logLoginAttempt,
  logPasswordOperation 
} = require('../utils/logger');

// Authentication logging
logAuth('LOGIN_SUCCESS', { userId: '123', email: 'user@example.com' });

// Password operations
logPassword('PASSWORD_RESET', { userId: '123', success: true });

// Security events
logSecurity('ACCOUNT_LOCKED', { userId: '123', reason: 'too_many_attempts' });

// Login attempts
logLoginAttempt('user@example.com', true, { userId: '123' });

// Password operations
logPasswordOperation('change', '123', 'user@example.com', true, { 
  oldLength: 60, 
  newLength: 60 
});
```

## 🔍 Log Analysis Examples

### Finding Failed Login Attempts
```bash
# Search for failed login attempts
grep "LOGIN_FAILED_WRONG_PASSWORD" backend/logs/password-*.log

# Search for account lockouts
grep "ACCOUNT_LOCKED" backend/logs/security-*.log
```

### Password Reset Analysis
```bash
# Find password reset requests
grep "FORGOT_PASSWORD_START" backend/logs/reset-*.log

# Find successful password resets
grep "RESET_PASSWORD_SUCCESS" backend/logs/reset-*.log
```

### Security Event Monitoring
```bash
# Find all security events
grep "SECURITY_EVENT" backend/logs/security-*.log

# Find token operations
grep "TOKEN_" backend/logs/security-*.log
```

## 🚨 Critical Events to Monitor

### High Priority Alerts
1. **Account Lockouts**: `ACCOUNT_LOCKED`
2. **Multiple Failed Logins**: `LOGIN_ATTEMPT_INCREMENT` with high attempt counts
3. **Password Reset Abuse**: Multiple `FORGOT_PASSWORD_START` from same IP
4. **Token Generation Errors**: `JWT_TOKEN_GENERATION_ERROR`
5. **Password Hashing Errors**: `PASSWORD_HASHING_ERROR`

### Medium Priority Alerts
1. **Password Change Failures**: `CHANGE_PASSWORD_FAILED`
2. **Invalid Reset Tokens**: `RESET_PASSWORD_FAILED`
3. **User Not Found**: `LOGIN_FAILED_USER_NOT_FOUND`
4. **Account Inactive**: `LOGIN_FAILED_ACCOUNT_INACTIVE`

## 📊 Log Monitoring Script

Create a monitoring script to watch for critical events:

```javascript
// monitor-auth-logs.js
const fs = require('fs');
const path = require('path');

const logDir = path.join(__dirname, 'backend/logs');
const criticalEvents = [
  'ACCOUNT_LOCKED',
  'PASSWORD_HASHING_ERROR',
  'JWT_TOKEN_GENERATION_ERROR',
  'SECURITY_EVENT'
];

function monitorLogs() {
  const today = new Date().toISOString().split('T')[0];
  
  criticalEvents.forEach(event => {
    const files = fs.readdirSync(logDir)
      .filter(file => file.includes(today) && file.includes('.log'));
    
    files.forEach(file => {
      const content = fs.readFileSync(path.join(logDir, file), 'utf8');
      if (content.includes(event)) {
        console.log(`🚨 CRITICAL EVENT FOUND: ${event} in ${file}`);
      }
    });
  });
}

// Run every 5 minutes
setInterval(monitorLogs, 5 * 60 * 1000);
```

## 🔧 Debugging Authentication Issues

### Common Debugging Steps

1. **Check User Model Logs**:
   ```bash
   grep "PASSWORD_COMPARISON" backend/logs/password-*.log | tail -20
   ```

2. **Check Controller Logs**:
   ```bash
   grep "LOGIN_USER_START\|LOGIN_USER_SUCCESS\|LOGIN_FAILED" backend/logs/auth-*.log | tail -20
   ```

3. **Check Security Events**:
   ```bash
   grep "ACCOUNT_LOCKED\|LOGIN_ATTEMPT_INCREMENT" backend/logs/security-*.log | tail -20
   ```

### Password Debugging
```bash
# Check password hashing
grep "PASSWORD_HASHING" backend/logs/password-*.log

# Check password comparison
grep "PASSWORD_COMPARISON" backend/logs/password-*.log

# Check password changes
grep "CHANGE_PASSWORD" backend/logs/password-*.log
```

## 📈 Performance Monitoring

### Log Performance Metrics
```javascript
// Add to your controllers
const startTime = Date.now();
// ... operation ...
const duration = Date.now() - startTime;
logger.performance('LOGIN_OPERATION', duration, { userId: user._id });
```

### Monitor Slow Operations
```bash
# Find slow operations (>1000ms)
grep "PERFORMANCE" backend/logs/info-*.log | grep -E "[0-9]{4,}ms"
```

## 🛡️ Security Best Practices

1. **Never log passwords**: Only log password lengths and formats
2. **Log security events**: All authentication failures and suspicious activities
3. **Monitor account lockouts**: Track and alert on repeated lockouts
4. **Token security**: Log token generation and validation
5. **IP tracking**: Include IP addresses in security logs
6. **User agent logging**: Track user agents for security analysis

## 📝 Log Retention

- **Critical/Security logs**: Keep for 1 year
- **Error logs**: Keep for 6 months  
- **Info logs**: Keep for 3 months
- **Success logs**: Keep for 1 month

## 🔄 Log Rotation

Consider implementing log rotation to manage file sizes:

```javascript
// Add to logger.js
const rotateLogs = () => {
  const files = fs.readdirSync(logDir);
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 30); // 30 days
  
  files.forEach(file => {
    const filePath = path.join(logDir, file);
    const stats = fs.statSync(filePath);
    if (stats.mtime < cutoffDate) {
      fs.unlinkSync(filePath);
    }
  });
};

// Run daily
setInterval(rotateLogs, 24 * 60 * 60 * 1000);
```

This comprehensive logging system provides full visibility into ZAMMER's authentication operations, making it easy to debug issues, monitor security, and track user behavior.
