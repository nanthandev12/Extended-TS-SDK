# NPM Release Commands

## Quick Release Guide

### Step 1: Login to NPM
```powershell
npm login
```
Enter your npm username, password, and email when prompted.

### Step 2: Verify You're Logged In
```powershell
npm whoami
```
Should display your npm username.

### Step 3: Check Package Name Availability
```powershell
npm view extended-typescript-sdk
```
If it returns 404, the package name is available (first publish).

### Step 4: Verify Package Contents (Optional)
```powershell
npm pack --dry-run
```
Shows what will be included in the package.

### Step 5: Publish to NPM

**For FIRST TIME publishing (use --access public):**
```powershell
npm publish --access public
```

**For subsequent releases:**
```powershell
npm publish
```

### Step 6: Verify Publication
```powershell
npm view extended-typescript-sdk
```

## Troubleshooting

### Error: "Access token expired or revoked"
**Solution:** Run `npm login` again

### Error: "404 Not Found" on first publish
**Solution:** This is NORMAL for first-time publishing. Use:
```powershell
npm publish --access public
```

### Error: "Package name already exists"
**Solution:** The package name is taken. Check ownership or use a different name.

## Version Management

### Update Version Before Publishing
```powershell
# Patch version (0.0.1 -> 0.0.2)
npm version patch

# Minor version (0.0.1 -> 0.1.0)
npm version minor

# Major version (0.0.1 -> 1.0.0)
npm version major
```

This automatically:
- Updates package.json version
- Creates a git commit
- Creates a git tag

Then publish:
```powershell
npm publish --access public
```

## Current Package Status

✅ **Package Name:** extended-typescript-sdk  
✅ **Current Version:** 0.0.1  
✅ **Repository:** Fixed (git+https format)  
✅ **Homepage:** Added  
✅ **Bugs URL:** Added  
✅ **Files:** dist/, wasm/, README.md, LICENSE  
✅ **Build:** Will run automatically on publish (prepublishOnly script)  

## Ready to Publish!

Run these commands in order:

```powershell
# 1. Login (if not already logged in)
npm login

# 2. Verify login
npm whoami

# 3. Publish (first time)
npm publish --access public
```

The `prepublishOnly` script will automatically:
1. Build WASM signer (`npm run build:signer`)
2. Build TypeScript (`npm run build:ts`)
3. Then publish the package

