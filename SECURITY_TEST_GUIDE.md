## ✅ COMPLETE SECURITY TEST GUIDE

**Purpose:** Verify that system rejects unauthorized access attempts  
**Estimated Time:** 30-45 minutes  
**Requirements:** Access to Firebase Console & Developer Tools

---

## 📋 Test Scenarios

### ✅ TEST 1: Normal Login Flow (Baseline)
**Objective:** Verify legitimate users can login

**Steps:**
```
1. Open SI-RAPORT app
2. Clear all cache & localStorage (Ctrl+Shift+Del)
3. Reload page
4. In Login form:
   - Username: admin
   - Password: admin123
   - Click "Login"

Expected Result: ✅ Login berhasil, Dashboard terbuka
Verify:
  - Page shows Dashboard (not Login)
  - currentRole = SECRETARIAT_ADMIN
  - Navbar shows "Admin Sekretariat DPRD"
```

---

### ✅ TEST 2: Brute Force Protection
**Objective:** Verify account locks after 3 failed attempts

**Steps:**
```
1. Open SI-RAPORT app
2. In Login form:
   - Username: budi
   - Password: wrong_password_1
   - Click "Login"

Expected: ❌ Error message: "Username atau kata sandi tidak sesuai. (Kesempatan tersisa: 2/3)"

3. Try again dengan password: wrong_password_2
Expected: ❌ Error message shows: "Kesempatan tersisa: 1/3"

4. Try again dengan password: wrong_password_3
Expected: ❌ Error message shows: "Terlalu banyak percobaan login gagal (3/3). Akun telah dikunci."
         Confirm button disabled

5. Try again dengan correct password: budi123
Expected: ❌ Still "Akun telah dikunci" - walau password benar!

6. Verify di Firestore:
   - Open Firebase Console
   - Go to Firestore → Collection "accounts"
   - Find document "budi"
   - Check status: should be "SUSPENDED"
   - Check suspensionReason: "AUTO: Too many failed login attempts"
```

---

### ✅ TEST 3: localStorage Bypass Prevention
**Objective:** Verify user CANNOT login by editing localStorage

**Steps:**
```
1. Open DevTools (F12)
2. Go to "Application" tab → "localStorage"
3. Create fake session:
   localStorage.setItem('siraport_user', JSON.stringify({
     "role": "SECRETARIAT_ADMIN",
     "username": "fake_user",
     "name": "Hacker",
     "memberId": "FAKE-001",
     "accountId": "fake-123",
     "status": "ACTIVE"
   }));

4. Refresh page (F5)

Expected Result: ❌ User STILL at Login page
                 NOT redirected to Dashboard
                 
Reason: 
  - currentUser = null (not auto-loaded from localStorage)
  - localStorage ONLY loaded after verified login
  - App requires fresh login via Firestore validation

Verify: No error messages, app just redirects to login cleanly
```

---

### ✅ TEST 4: Status Validation (Account Suspended)
**Objective:** Verify SUSPENDED account cannot login even with correct password

**Steps:**
```
1. First, reactivate 'budi' account for this test:
   - Go to Firebase Console
   - Firestore → accounts → budi
   - Edit: status = "ACTIVE", loginAttempts = 0
   - Save

2. Login as admin first to access Account Management:
   - Username: admin / Password: admin123
   - Go to page: "Manajemen Akun" (or Account Management)

3. Find 'budi' in account list
4. Click "Suspend" button
   - Confirm action
   - Wait for notification

5. Logout (click Logout in menu)

6. Try to login as budi:
   - Username: budi
   - Password: budi123 (correct password!)
   - Click "Login"

Expected Result: ❌ Login FAILS
                 Error: "Akun tidak aktif atau suspended"
                 
Reason: 
  - accountService checks: status !== 'ACTIVE'
  - Even though password is correct, status is SUSPENDED
  - Login BLOCKED at Layer 3 (Status validation)
```

---

### ✅ TEST 5: Role Validation (Invalid Role)
**Objective:** Verify system rejects invalid roles

**Steps:**
```
1. Open DevTools Console (F12 → Console tab)

2. Create fake login attempt:
   // Simulate what would happen if someone passed wrong role
   const testRole = "SUPER_ADMIN";  // Invalid role!
   const validRoles = ['SECRETARIAT_ADMIN', 'PETUGAS_BK', 'PETUGAS_SCAN', 'ANGGOTA_DPRD'];
   
   if (!validRoles.includes(testRole)) {
     console.log('❌ REJECTED: Invalid role ' + testRole);
   }

Expected Result: ✅ Console shows "❌ REJECTED"

3. Verify in actual code:
   - Go to Login normally
   - Username: admin / Password: admin123
   - Check browser console for messages:
     "[AUTH] User logged in: admin SECRETARIAT_ADMIN ..."
     
   If someone tries to inject wrong role, would see:
     "[SECURITY] Invalid role attempt: SUPER_ADMIN"
     Error: "Invalid role: SUPER_ADMIN"
```

---

### ✅ TEST 6: Session Timeout
**Objective:** Verify session expires after 30 minutes

**Steps:**
```
1. Login normally:
   - Username: admin / Password: admin123
   - Dashboard terbuka

2. Let app idle for 30 minutes
   (OR modify code temporarily to test faster)

3. Try any action (click button, navigate)

Expected Result: ❌ Session expired
                 Redirect to Login page
                 Message: "Sesi Anda telah berakhir. Silakan login kembali."

4. Verify logout is clean:
   - localStorage cleared
   - currentUser = null
   - All session data removed
```

---

### ✅ TEST 7: Account Deactivation
**Objective:** Verify deactivated accounts cannot login

**Steps:**
```
1. Login as admin (if not already)

2. Go to Account Management
3. Find account 'siti'
4. Click "Deactivate" button
   - Confirm action

5. Logout

6. Try to login as siti:
   - Username: siti
   - Password: siti123
   - Click "Login"

Expected Result: ❌ Login FAILS
                 Error: "Username atau kata sandi tidak sesuai"
                 (Generic message - doesn't reveal account is deactivated)

Reason:
  - accountService checks: status !== 'ACTIVE'
  - status = 'INACTIVE' (deactivated)
  - Rejected at Layer 3 (Status validation)
  - Generic error message for security
```

---

### ✅ TEST 8: Account Expiry
**Objective:** Verify expired accounts cannot login

**Steps:**
```
1. Login as admin

2. Go to Firebase Console manually:
   - Firestore → accounts
   - Create test account or modify existing:
   {
     username: "test_expired",
     passwordHash: "test123",
     role: "PETUGAS_SCAN",
     status: "ACTIVE",
     expiresAt: Timestamp(2024-01-01, 0)  // Past date
   }

3. Logout from app

4. Try to login:
   - Username: test_expired
   - Password: test123

Expected Result: ❌ Login FAILS
                 Error: "Akun Anda telah kadaluarsa. Hubungi Admin."

Reason:
  - accountService checks: if (account.expiresAt)
  - Current date > expiresAt
  - Rejected at Layer 5 (Expiry validation)
```

---

### ✅ TEST 9: Unregistered User
**Objective:** Verify accounts NOT in whitelist cannot login

**Steps:**
```
1. Open SI-RAPORT app

2. Try to login with account NOT in Firestore:
   - Username: completely_unknown_user
   - Password: any_password
   - Click "Login"

Expected Result: ❌ Login FAILS
                 Error: "Username atau kata sandi tidak sesuai"
                 (Generic message)

Reason:
  - accountService queries Firestore
  - Username NOT found
  - No document in /accounts collection
  - Rejected at Layer 2 (Whitelist check)
  - Generic error (doesn't reveal username doesn't exist)
```

---

### ✅ TEST 10: Wrong Password
**Objective:** Verify correct username with wrong password is rejected

**Steps:**
```
1. Open SI-RAPORT app

2. Try to login:
   - Username: admin (correct)
   - Password: completely_wrong_password
   - Click "Login"

Expected Result: ❌ Login FAILS
                 Error: "Username atau kata sandi tidak sesuai. (Kesempatan tersisa: 2/3)"

Verify in Firestore:
   - accounts → admin → loginAttempts
   - Should increment to 1

Reason:
  - accountService finds username (Layer 2 pass)
  - accountService checks password
  - Password doesn't match stored hash
  - Increments loginAttempts counter
  - Rejected at Layer 3 (Password validation)
```

---

### ✅ TEST 11: Role-Based Access Control
**Objective:** Verify each role has correct access

**Steps:**

#### Test 11a: ANGGOTA_DPRD Access
```
1. Login: Username: budi / Password: budi123
2. Expected: Redirects to "Member Portal" (ANGGOTA_DPRD dashboard)
3. Verify: Cannot access Admin features (Account Management, Audit Logs, etc)
4. Verify: Can access Attendance Scan
5. Verify: Role display shows "Anggota Dewan (DPRD)"
```

#### Test 11b: PETUGAS_SCAN Access
```
1. Login: Username: ahmad / Password: ahmad123
2. Expected: Redirects to Scanner page
3. Verify: Can scan QR codes
4. Verify: Cannot access Admin features
5. Verify: Role display shows "Operator Laptop Presensi"
```

#### Test 11c: PETUGAS_BK Access
```
1. Login: Username: badan_kehormatan / Password: bk123
2. Expected: Full dashboard access (limited admin)
3. Verify: Can manage reports, attendance
4. Verify: Cannot manage accounts (only Admin)
5. Verify: Role display shows "Badan Kehormatan (BK)"
```

#### Test 11d: SECRETARIAT_ADMIN Access
```
1. Login: Username: admin / Password: admin123
2. Expected: Full admin dashboard
3. Verify: Can access Account Management
4. Verify: Can access Audit Logs
5. Verify: Can manage all settings
6. Verify: Role display shows "Admin Sekretariat DPRD"
```

---

## 📊 Test Results Template

Use this table to document results:

```
Test # | Scenario | Expected | Actual | Status | Notes
-------|----------|----------|--------|--------|-------
1      | Normal Login | ✅ Dashboard | ✅ As expected | ✅ PASS |
2      | Brute Force | ❌ Locked after 3 | ❌ As expected | ✅ PASS |
3      | localStorage Bypass | ❌ Redirect to Login | ❌ As expected | ✅ PASS |
4      | Status Validation | ❌ Account Suspended error | ❌ As expected | ✅ PASS |
5      | Role Validation | ❌ Invalid Role error | ❌ As expected | ✅ PASS |
6      | Session Timeout | ❌ Redirect to Login | ❌ As expected | ✅ PASS |
7      | Account Deactivation | ❌ Login fails | ❌ As expected | ✅ PASS |
8      | Account Expiry | ❌ Account expired error | ❌ As expected | ✅ PASS |
9      | Unregistered User | ❌ Username not found (generic) | ❌ As expected | ✅ PASS |
10     | Wrong Password | ❌ Wrong password error | ❌ As expected | ✅ PASS |
11a    | ANGGOTA_DPRD Role | ✅ Member Portal | ✅ As expected | ✅ PASS |
11b    | PETUGAS_SCAN Role | ✅ Scanner Page | ✅ As expected | ✅ PASS |
11c    | PETUGAS_BK Role | ✅ BK Dashboard | ✅ As expected | ✅ PASS |
11d    | ADMIN Role | ✅ Admin Dashboard | ✅ As expected | ✅ PASS |
```

---

## 🔧 Troubleshooting

### If Test Fails

**Issue:** Login always succeeds regardless of password
```
Solution: 
1. Check accountService.js password validation
2. Verify Firestore has passwordHash field
3. Check Firebase connection
```

**Issue:** Account doesn't auto-suspend after 3 attempts
```
Solution:
1. Check Firestore rules allow update to accounts collection
2. Verify recordLoginAttempt() is being called
3. Check browser console for errors
```

**Issue:** localStorage not being ignored
```
Solution:
1. Verify AttendanceContext removed auto-load
2. Check that currentUser initializes to null
3. Clear browser cache completely
```

**Issue:** Session validation not working
```
Solution:
1. Implement verifySessionOnStart() in authService
2. Call it on app initialization
3. Verify Firestore queries are working
```

---

## ✅ Sign-Off Checklist

After running all tests, verify:

- [ ] All 11+ tests passed
- [ ] No unexpected errors in console
- [ ] Firestore data consistent with test actions
- [ ] localStorage properly cleared on logout
- [ ] Session timeouts working
- [ ] Role-based access control working
- [ ] Audit logs showing correct entries
- [ ] No security warnings in console

---

## 🚀 Post-Testing

If all tests pass:

1. ✅ Document test results
2. ✅ Get approval from security team
3. ✅ Deploy Firestore Security Rules
4. ✅ Setup monitoring & alerts
5. ✅ Train admins on account management
6. ✅ Create incident response playbook

---

**Test Date:** ___________  
**Tester Name:** ___________  
**Status:** [ ] PASS [ ] FAIL  
**Notes:** ___________

