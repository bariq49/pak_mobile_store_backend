# PowerShell npm Execution Policy Fix

## 🔴 Problem

PowerShell is blocking npm because the execution policy doesn't allow unsigned scripts:

```
npm : File C:\Program Files\node-v22.21.1-win-x64\npm.ps1 cannot be loaded.
The file is not digitally signed. You cannot run this script on the current system.
```

## ✅ Solutions

### Solution 1: Change Execution Policy (Recommended)

Run PowerShell as **Administrator** and execute:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**What this does:**
- `RemoteSigned`: Allows local scripts to run, but downloaded scripts must be signed
- `Scope CurrentUser`: Only affects your user account (safer)

**To verify it worked:**
```powershell
Get-ExecutionPolicy
```
Should return: `RemoteSigned`

---

### Solution 2: Bypass for Current Session Only

If you don't want to change the policy permanently:

```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
```

**What this does:**
- Only affects the current PowerShell session
- Resets when you close PowerShell
- No admin rights needed

---

### Solution 3: Use Command Prompt (CMD) Instead

Instead of PowerShell, use **Command Prompt (CMD)**:

1. Press `Win + R`
2. Type `cmd` and press Enter
3. Navigate to your project:
   ```cmd
   cd E:\Development\PakMobileStore\pak_mobile_store_backend
   ```
4. Run npm commands:
   ```cmd
   npm install
   ```

CMD doesn't have execution policy restrictions.

---

### Solution 4: Use Git Bash or WSL

If you have Git Bash or Windows Subsystem for Linux (WSL):

```bash
# In Git Bash or WSL
cd /e/Development/PakMobileStore/pak_mobile_store_backend
npm install
```

---

## 🚀 Quick Fix (Copy & Paste)

**Option A: Run as Administrator (Permanent Fix)**
```powershell
# Right-click PowerShell → Run as Administrator
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**Option B: Current Session Only (Temporary)**
```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
```

**Option C: Use CMD Instead**
```cmd
# Open Command Prompt (not PowerShell)
cd E:\Development\PakMobileStore\pak_mobile_store_backend
npm install
```

---

## 📝 Explanation

**Why this happens:**
- PowerShell has security policies to prevent malicious scripts
- npm.ps1 is a PowerShell script that needs permission to run
- By default, PowerShell blocks unsigned scripts

**Which solution to use:**
- **Solution 1** (RemoteSigned): Best for long-term use, safe
- **Solution 2** (Bypass): Quick fix, resets on restart
- **Solution 3** (CMD): No changes needed, works immediately
- **Solution 4** (Git Bash/WSL): If you prefer Unix-like environment

---

## ✅ After Fixing

Once you've applied one of the solutions, try running npm again:

```powershell
npm --version
npm install
```

If it works, you're all set! 🎉

