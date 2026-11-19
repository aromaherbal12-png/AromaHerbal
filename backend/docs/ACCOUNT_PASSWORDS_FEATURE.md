# Account Passwords Feature - Complete Implementation

## Overview
Admin-only feature to manage and update user account passwords. Simplified UI showing email list with "Update" button beside each email. No search functionality.

## Files Modified/Created

### Backend

#### 1. `backend/src/modules/users/user.validation.js`
- **Added**: `updatePasswordSchema` - Zod validation for password updates
- **Validates**:
  - `newPassword`: minimum 8 characters, at least one letter, at least one number
  - `confirmPassword`: must match newPassword
  - `userId` (in params): valid MongoDB ObjectId format
- **Error messages**: Clear validation failures

#### 2. `backend/src/modules/users/users.service.js`
- **Added**: `updateUserPassword(userId, newPassword)` function
- **Security**: Uses `bcrypt.hash(newPassword, 12)` with 12 salt rounds
- **Behavior**:
  - Finds user by ID
  - Hashes password with bcrypt
  - Saves to `passwordHash` field
  - Returns user object (without passwordHash exposed)
  - Throws 404 if user not found

#### 3. `backend/src/modules/users/users.controller.js`
- **Added**: `updatePassword(req, res, next)` controller
- **Route**: `PUT /api/users/:id/password`
- **Process**:
  - Extracts validated `id` and `newPassword` from request
  - Calls `updateUserPassword()` service
  - Returns success response: "Password updated successfully"
  - Passes errors to error middleware

#### 4. `backend/src/modules/users/users.routes.js`
- **Line 17**: Added `router.put("/:id/password", administratorOnly, validate(updatePasswordSchema), updatePassword)`
- **Middleware chain**:
  1. `authenticate` - JWT validation (all routes)
  2. `administratorOnly` - Role check (Administrator only)
  3. `validate(updatePasswordSchema)` - Input validation
  4. `updatePassword` - Controller

#### 5. `backend/src/middleware/permission.middleware.js`
- **Exports**: `administratorOnly` middleware
- **Implementation**: `allowRoles(USER_ROLES.ADMINISTRATOR)`
- **Behavior**: Returns 403 "You do not have permission..." if user role !== Administrator

### Frontend

#### 1. `frontend/src/components/PasswordModal.jsx`
- **Purpose**: Modal dialog for updating user password
- **Features**:
  - Password strength checker (3-tier: Weak/Fair/Strong)
  - Eye toggle for password visibility (both fields)
  - Live validation checklist:
    - At least 8 characters
    - At least one letter
    - At least one number
    - Passwords match
  - Shows account email, role, and "You" indicator if editing own account
  - Error handling with user-friendly messages
  - Submit button disabled until all requirements met
  - Escape key and backdrop click to close

#### 2. `frontend/src/components/AccountsTable.jsx`
- **Purpose**: Simplified email list view (not a table)
- **UI**: Two-column layout
  - Left: Email address + optional "You" tag (green pill)
  - Right: "Update" button with Key icon
- **States**:
  - **Loading**: 5 skeleton items with shimmer animation
  - **Empty**: "No accounts found." message
  - **Loaded**: List of accounts with Update buttons
- **No search/filter functionality** (removed per user request)

#### 3. `frontend/src/pages/ManagePasswords.jsx`
- **Purpose**: Main page for managing account passwords
- **Layout**:
  - Topbar with breadcrumb and heading
  - Heading section: "Account Passwords" + subtitle
  - Error banner (with Retry button if error occurs)
  - Accounts list component
  - Password modal (opens on Update click)
  - Toast notification on success
- **Access Control**: Shows "Access Denied" screen for non-admin users
- **API Integration**:
  - `GET /api/users` - Fetch all user emails
  - `PUT /api/users/:id/password` - Update password
- **Error Handling**: Catches and displays errors, allows retry

#### 4. `frontend/src/App.jsx`
- **Line 8**: Added import for ManagePasswords component
- **Line 210**: Added navigation item for "Manage passwords" (Key icon)
- **Line 214**: Added filter to show only for Administrator role
- **Line 253**: Added render condition for ManagePasswords page

#### 5. `frontend/src/styles/workflow.css`
- **Added CSS sections**:
  - `.accounts-list` - Flexbox column layout, gap 10px
  - `.account-item` - Flex row, space-between, hover background
  - `.account-email-wrapper` - Flex row for email + You tag
  - `.account-email` - 14px bold text
  - `.you-tag` - Green pill badge (10px font, 800 weight)
  - `.update-password-btn` - Green button with Key icon, hover/active states
  - `.skeleton-item` & `.skeleton-line` - Loading shimmer animation
  - Responsive media query (max-width: 768px):
    - `.account-item` - Column layout, full-width button
    - `.update-password-btn` - 100% width, centered
  - Password modal styles (backdrop, dialog, form, checklist, strength bar, etc.)
  - Toast and error banner styles

## API Endpoints

### GET /api/users
- **Access**: Admin only (Administrator role required)
- **Authentication**: JWT token in header
- **Returns**: Array of users with fields:
  - `_id` - MongoDB ObjectId
  - `name` - User full name
  - `email` - User email (displayed in list)
  - `role` - User role (Administrator, Store-Incharge, etc.)
  - `isActive` - Account status
  - `lastLoginAt` - Last login timestamp
  - `createdAt` - Account creation date
  - `updatedAt` - Last update date
  - **Excludes**: `passwordHash` (never exposed)

### PUT /api/users/:id/password
- **Access**: Admin only (Administrator role required)
- **Authentication**: JWT token in header
- **Params**: `id` - Valid MongoDB ObjectId
- **Body**:
  ```json
  {
    "newPassword": "ValidPass123",
    "confirmPassword": "ValidPass123"
  }
  ```
- **Validation**:
  - newPassword: 8+ chars, at least 1 letter, at least 1 number
  - confirmPassword: must match newPassword
- **Security**: Password hashed with bcrypt (12 salt rounds)
- **Returns**: Success message "Password updated successfully"
- **Error Responses**:
  - 400: Validation failed (missing fields, weak password, no match)
  - 403: User not admin
  - 404: User not found

## User Flow

### As Administrator:
1. Login with admin credentials
2. Click "Manage passwords" in sidebar (Key icon)
3. See list of all account emails
4. Click "Update" button beside any email
5. PasswordModal opens showing:
   - Email and role
   - New password field (with eye toggle)
   - Confirm password field (with eye toggle)
   - Real-time strength checker
   - Validation checklist (8+ chars, letter, number, match)
6. Enter password meeting all requirements
7. Click "Update password" button
8. Toast notification shows: "Password updated for [email]"
9. List refreshes to reflect any changes

### As Non-Admin:
1. Attempt to access "Manage passwords"
2. See "Access Denied" screen with message
3. Option to return to Dashboard

## Password Security

- **Hash Algorithm**: bcryptjs
- **Salt Rounds**: 12 (industry standard)
- **Storage**: `passwordHash` field in User model
- **Never Exposed**: API never returns passwordHash
- **Validation**: Server-side via Zod schema
- **Confirmation**: Users must enter password twice to match

## Testing Checklist

### Backend Tests
- [ ] GET /api/users returns admin user (200)
- [ ] GET /api/users returns 403 for non-admin
- [ ] PUT /api/users/:id/password updates password (200)
- [ ] PUT fails with weak password (400)
- [ ] PUT fails with non-matching passwords (400)
- [ ] PUT fails with invalid user ID (403/404)
- [ ] Password hash not included in responses
- [ ] Old password doesn't work after update

### Frontend Tests
- [ ] Admin can access "Manage passwords" page
- [ ] Non-admin sees Access Denied screen
- [ ] Email list loads and displays all accounts
- [ ] Clicking Update opens PasswordModal
- [ ] Strength checker updates in real-time
- [ ] Eye toggle shows/hides password
- [ ] Validation checklist shows requirements
- [ ] Submit button disabled until all requirements met
- [ ] Error messages display on failed update
- [ ] Toast shows on success
- [ ] List refreshes after password update
- [ ] "You" tag shows on current user's email
- [ ] Responsive design on mobile (768px breakpoint)
- [ ] Escape key closes modal
- [ ] Backdrop click closes modal

### End-to-End Tests
1. Login as admin
2. Update own password
3. Logout
4. Login with new password (success)
5. Update another user's password
6. Verify that user can login with new password
7. Try accessing feature as non-admin (denied)

## Migration Notes

- Feature is admin-only and doesn't affect existing functionality
- No database schema changes (uses existing User model)
- Backward compatible with existing authentication
- No breaking changes to other modules

## Known Limitations

- Search/filter removed per user request (simplification)
- One update per modal open (must close and reopen for next)
- Password strength is visual only (actual validation on server)
- No audit log of who changed which password (logs captured by AuditLog middleware)

## Future Enhancements

- Bulk password reset for multiple users
- Password reset email with temporary link
- Account lockout after failed login attempts
- Password history to prevent reuse
- Password expiration policies
- Audit log detail view (who changed when)
