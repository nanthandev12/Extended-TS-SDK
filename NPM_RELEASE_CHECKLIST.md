# NPM Release Checklist

## Pre-Release Checklist

### ✅ Package Configuration
- [x] Package name: `extended-typescript-sdk`
- [x] Version: Check current version
- [x] Repository URL: Fixed (git+https format)
- [x] Homepage and bugs URLs: Added
- [x] License: MIT
- [x] Author: bvvvp009

### ✅ Build & Test
- [x] Build succeeds: `npm run build`
- [x] Tests pass: `npm test`
- [x] Linting passes: `npm run lint`
- [x] No TypeScript errors

### ✅ Files Included
- [x] `dist/` folder (built output)
- [x] `wasm/` folder (WASM signer files)
- [x] `README.md`
- [x] `LICENSE`
- [x] `CHANGELOG.md` (should be added to files array if desired)

### ✅ Documentation
- [x] README.md is comprehensive
- [x] CHANGELOG.md created
- [x] Examples documented
- [x] API documentation included

### ✅ Security
- [x] No hardcoded secrets
- [x] No .env files
- [x] Test vectors documented
- [x] .gitignore comprehensive

## NPM Publishing Steps

### 1. Login to NPM
```bash
npm login
```
Enter your npm credentials when prompted.

### 2. Verify Package Name Availability
```bash
npm view extended-typescript-sdk
```
If it returns 404, the package name is available.

### 3. Check Package Contents
```bash
npm pack --dry-run
```
This shows what will be included in the package.

### 4. Test Build Locally
```bash
npm run build
npm test
```

### 5. Publish to NPM
```bash
# For first release (public)
npm publish --access public

# For subsequent releases
npm publish
```

### 6. Verify Publication
```bash
npm view extended-typescript-sdk
```

## Post-Release

### Verify Installation
```bash
npm install extended-typescript-sdk
```

### Test in Clean Environment
```bash
mkdir test-install
cd test-install
npm init -y
npm install extended-typescript-sdk
node -e "const sdk = require('extended-typescript-sdk'); console.log(sdk);"
```

## Troubleshooting

### Error: "Access token expired or revoked"
**Solution:** Run `npm login` again to refresh your token.

### Error: "404 Not Found - PUT https://registry.npmjs.org/extended-typescript-sdk"
**Solution:** This is normal for first-time publishing. Make sure:
1. You're logged in: `npm whoami`
2. Package name is available: `npm view extended-typescript-sdk`
3. Use `--access public` for first publish: `npm publish --access public`

### Error: "Package name already exists"
**Solution:** The package name is taken. You'll need to:
1. Use a different package name, OR
2. Request access if it's your package

### Error: "You must sign up for private packages"
**Solution:** Use `--access public` flag:
```bash
npm publish --access public
```

## Version Management

### Semantic Versioning
- **MAJOR** (1.0.0): Breaking changes
- **MINOR** (0.1.0): New features, backward compatible
- **PATCH** (0.0.1): Bug fixes, backward compatible

### Update Version
```bash
# Patch version
npm version patch

# Minor version
npm version minor

# Major version
npm version major
```

This automatically updates package.json and creates a git tag.

## Current Status

- ✅ Package.json configured correctly
- ✅ Repository URL fixed
- ✅ Homepage and bugs URLs added
- ✅ Build process verified
- ✅ Files array configured
- ⏭️ Ready for `npm login` and `npm publish --access public`

