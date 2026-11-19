# Account Passwords Feature - Testing Guide

## Quick Start

### Start Servers
```bash
# Terminal 1: Backend
cd backend
npm run dev
# Expected: "API: http://localhost:5000/api"

# Terminal 2: Frontend
cd frontend
npm run dev
# Expected: "Local: http://127.0.0.1:5175/" (or 5174)
```

## Manual Testing Scenarios

### Scenario 1: Admin Access
**Goal**: Verify admin can access the feature

**Steps**:
1. Open http://127.0.0.1:5175
2. Login with admin credentials
3. Look for "Manage passwords" in sidebar (Key icon, under Inventory reports)
4. Click "Manage passwords"

**Expected Result**: 
- Page loads with heading "Manage account passwords"
- Email list displays all accounts
- Each email has an "Update" button

### Scenario 2: Non-Admin Access Denied
**Goal**: Verify non-admin users cannot access

**Steps**:
1. Logout (click user avatar → Logout)
2. Login with non-admin credentials (e.g., Store-Incharge)
3. Look for "Manage passwords" in sidebar

**Expected Result**:
- "Manage passwords" link NOT visible in sidebar
- If you try direct URL: http://127.0.0.1:5175/manage-passwords
- Page shows "Access Denied" with message
- Button to return to Dashboard

### Scenario 3: Update Password Flow
**Goal**: Complete password update for another user

**Steps**:
1. Login as admin
2. Click "Manage passwords"
3. Find an account email (not your own)
4. Click its "Update" button
5. In modal, enter new password:
   - Try: "weak" → Should show validation errors
   - Try: "Password123" → Should show all checks met
   - Confirm password same way
6. Click "Update password"

**Expected Result**:
- Modal closes
- Toast appears: "Password updated for [email]"
- List refreshes
- Password is actually saved (can test by logout/login with new pwd)

### Scenario 4: Update Own Password
**Goal**: Verify "You" indicator and own password update

**Steps**:
1. Login as admin
2. Click "Manage passwords"
3. Find your own email in list
4. Note the green "You" badge beside your email
5. Click "Update" button
6. Modal shows: "You are changing your own password."
7. Enter new password meeting requirements
8. Click "Update password"

**Expected Result**:
- Password updates
- Toast shows success
- Next time you login, old password fails, new one works

### Scenario 5: Password Validation
**Goal**: Test validation rules

**Test Cases**:

| Input | Expected Result |
|-------|-----------------|
| `short` | "At least 8 characters" (red X) |
| `12345678` | "At least one letter" (red X) |
| `abcdefgh` | "At least one number" (red X) |
| `Password123` | All checks green ✓ |
| `Pass123` in new, `Pass456` in confirm | "Passwords do not match" |
| `Password123` both fields | All checks green, button enabled ✓ |

**Expected Result**: Checklist updates in real-time as user types

### Scenario 6: Password Strength Indicator
**Goal**: Verify strength bar and label

**Test Cases**:

| Password | Strength Bar | Label |
|----------|--------------|-------|
| `Pass1` | 33% (red) | "Weak" |
| `Password1` | 66% (yellow) | "Fair" |
| `LongPassword123` | 100% (green) | "Strong" |

**Expected Result**: Strength visual updates as requirements are met

### Scenario 7: Eye Toggle (Show/Hide Password)
**Goal**: Verify password visibility toggle

**Steps**:
1. In password modal, look for eye icon in password fields
2. Click eye icon in "New password" field
3. Password should display as plain text
4. Click again to hide
5. Repeat for "Confirm password" field

**Expected Result**:
- Eye icon shows when password is hidden (closed eye)
- Eye OFF icon shows when password is visible (open eye)
- Toggling doesn't clear the field
- Works independently for each field

### Scenario 8: Error Handling
**Goal**: Test error scenarios

**Test Cases**:

| Scenario | Steps | Expected Result |
|----------|-------|-----------------|
| Non-existent user | Manually change URL to invalid user ID | 404 or error message |
| Network error | Stop backend, try update | "Failed to load accounts" error banner with Retry |
| Weak password | Enter `pass1` (only 5 chars) | Button stays disabled |
| Mismatch | Enter different passwords | "Passwords do not match" error |

**Expected Result**: Appropriate error messages shown to user

### Scenario 9: Responsive Design
**Goal**: Test mobile layout

**Steps**:
1. Open Developer Tools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Set viewport to 375x667 (iPhone)
4. View "Manage passwords" page

**Expected Result** (Mobile):
- Email list items stack vertically
- "Update" button is full width
- Button centered below email
- All text readable
- Touch targets adequate (44px+ height)
- Modal adapts to mobile (scrollable if needed)

### Scenario 10: Loading State
**Goal**: Test loading behavior

**Steps**:
1. Open DevTools Network tab
2. Set throttling to "Slow 3G"
3. Refresh page while on "Manage passwords"
4. Watch list load

**Expected Result**:
- 5 skeleton items appear (gray placeholder rows)
- Shimmer animation plays
- Real items fade in as they load
- No layout shift when items appear

### Scenario 11: Empty State
**Goal**: Test empty list handling

**Note**: This requires a scenario with no users, which is unlikely in testing. Can verify code instead.

**Code Check**:
- AccountsTable.jsx line ~20: Returns "No accounts found." if empty

## API Testing (with curl or Postman)

### Get Admin Token
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"AdminPass123"}'

# Response contains: "accessToken": "eyJ..."
# Copy token for next requests
```

### Get Users List (Admin Only)
```bash
curl -X GET http://localhost:5000/api/users \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Expected: 200 OK
# Response: Array of users with _id, name, email, role
```

### Try as Non-Admin (Should Fail)
```bash
# First login as non-admin, get that token
curl -X GET http://localhost:5000/api/users \
  -H "Authorization: Bearer NON_ADMIN_TOKEN"

# Expected: 403 Forbidden
# Response: "You do not have permission to perform this action"
```

### Update Password (Admin Only)
```bash
curl -X PUT http://localhost:5000/api/users/USERID_HERE/password \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "newPassword": "NewPassword123",
    "confirmPassword": "NewPassword123"
  }'

# Expected: 200 OK
# Response: "Password updated successfully"
```

### Test Validation Errors
```bash
# Weak password (too short)
curl -X PUT http://localhost:5000/api/users/USERID/password \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"newPassword":"weak","confirmPassword":"weak"}'

# Expected: 400 Bad Request
# Response: Validation error message
```

## Verification Checklist

### Backend
- [ ] MongoDB connection established
- [ ] All API endpoints accessible
- [ ] Admin middleware working (403 for non-admin)
- [ ] Password validation working
- [ ] bcrypt hashing 12 rounds
- [ ] No passwordHash in responses

### Frontend
- [ ] App loads without errors (check console)
- [ ] Sidebar shows "Manage passwords" for admin
- [ ] Sidebar hides "Manage passwords" for non-admin
- [ ] Modal opens without errors
- [ ] Real-time validation works
- [ ] Eye toggle works
- [ ] Update submission works
- [ ] Toast notification appears
- [ ] List refreshes after update

### Integration
- [ ] Login as admin → access feature ✓
- [ ] Update password → user can login with new pwd ✓
- [ ] Login as non-admin → access denied ✓
- [ ] Error handling → retry button works ✓
- [ ] Responsive → looks good on mobile ✓

## Troubleshooting

### "Access Denied" for Admin
- Check JWT token is valid
- Verify user role in database is "Administrator"
- Check token expiration

### "Failed to load accounts"
- Verify backend is running
- Check API URL in frontend config (should be http://localhost:5000/api)
- Check network tab for actual error response

### Modal doesn't open
- Check browser console for errors
- Verify PasswordModal component is imported in ManagePasswords.jsx
- Check onClick handler on Update button

### Password doesn't actually update
- Check backend logs for errors
- Verify user ID is valid MongoDB ObjectId
- Check database directly: db.users.findOne({email:"..."})

### Strength checker not updating
- Check that validation regex matches implementation
- Verify state updates in React DevTools

## Performance Notes

- Initial load should be < 1 second (with normal network)
- Password update should be < 500ms
- Modal should open instantly
- List refresh should be < 1 second

## Security Notes

- Always use HTTPS in production
- JWT token should expire (check auth config)
- Password never logged to console
- passwordHash never returned by API
- All endpoints require authentication + admin role
