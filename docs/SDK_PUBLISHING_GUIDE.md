# 📦 Publishing Nomos TypeScript SDK to npm - Complete Guide

This guide walks you through setting up automated publishing of the Nomos TypeScript SDK to npm using GitHub Actions.

## 🎯 What We're Setting Up

1. **Automated Publishing** - Publish to npm on GitHub releases
2. **Manual Publishing** - Trigger releases manually with version bumping
3. **Continuous Integration** - Test SDK on every pull request
4. **Provenance Support** - Enhanced security with npm provenance
5. **Multi-Node Testing** - Test compatibility across Node.js versions

## 🔑 Prerequisites & Setup

### 1. npm Account & Access Token

#### Create npm Account
1. Go to [npmjs.com](https://www.npmjs.com) and create an account
2. Verify your email address
3. Enable 2FA (Two-Factor Authentication) for security

#### Generate Access Token
1. Go to [npm Access Tokens](https://www.npmjs.com/settings/tokens)
2. Click "Generate New Token"
3. Choose **"Automation"** token (recommended for CI/CD)
4. Copy the token - you'll need it for GitHub secrets

> **Important:** Automation tokens work even with 2FA enabled and are perfect for GitHub Actions.

### 2. GitHub Repository Secrets

Add the npm token to your GitHub repository:

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**
4. Name: `NPM_TOKEN`
5. Value: Paste your npm token
6. Click **"Add secret"**

### 3. Package Configuration

The SDK's `package.json` has been updated with:

```json
{
  "name": "nomos-sdk",
  "publishConfig": {
    "registry": "https://registry.npmjs.org/",
    "access": "public"
  },
  "files": [
    "dist/**/*",
    "README.md",
    "LICENSE"
  ],
  "engines": {
    "node": ">=16.0.0"
  }
}
```

## 🚀 Publishing Methods

### Method 1: Automatic Publishing (GitHub Releases)

**Best for:** Production releases with proper versioning

1. **Create a Release on GitHub:**
   - Go to your repository → **Releases** → **"Create a new release"**
   - Tag: `v1.0.0` (or your desired version)
   - Title: `Release v1.0.0`
   - Description: Add release notes
   - Click **"Publish release"**

2. **Workflow Triggers Automatically:**
   - GitHub Action builds and tests the SDK
   - Publishes to npm with the version from `package.json`
   - Adds provenance for security

### Method 2: Manual Publishing (Workflow Dispatch)

**Best for:** Development releases or urgent updates

1. **Go to GitHub Actions:**
   - Repository → **Actions** → **"Publish TypeScript SDK to npm"**
   - Click **"Run workflow"**
   - Choose version type: `patch`, `minor`, or `major`
   - Click **"Run workflow"**

2. **What Happens:**
   - Bumps version automatically (`0.1.0` → `0.1.1` for patch)
   - Builds and tests
   - Publishes to npm
   - Creates a GitHub release automatically

## 🔄 Workflow Details

### CI Workflow (`ci-sdk.yml`)

**Triggers:** Every push/PR to main/develop that touches SDK files

**What it does:**
- Tests on Node.js 18.x, 20.x, 22.x
- Runs linting and tests
- Builds the package
- Validates examples work
- Ensures package can be installed

### Publish Workflow (`publish-sdk.yml`)

**Triggers:**
- GitHub releases (automatic)
- Manual workflow dispatch

**What it does:**
- Builds and tests the SDK
- Bumps version (manual only)
- Publishes to npm with provenance
- Creates GitHub release (manual only)

## 📋 Pre-Publication Checklist

Before publishing, ensure:

- [ ] **Version Updated** - Bump version in `package.json` (if manual release)
- [ ] **Tests Passing** - All tests pass locally and in CI
- [ ] **Build Works** - `npm run build` completes successfully
- [ ] **Examples Updated** - Examples work with new changes
- [ ] **README Updated** - Documentation reflects any API changes
- [ ] **Changelog** - Document what changed (optional but recommended)

## 🎯 Publishing Your First Version

### Step 1: Prepare for Publishing
```bash
cd sdk/ts

# Make sure everything works
npm install
npm test
npm run lint
npm run build

# Check what will be published
npm pack --dry-run
```

### Step 2: Choose Your Publishing Method

#### Option A: GitHub Release (Recommended)
1. Ensure `package.json` has the correct version (e.g., `1.0.0`)
2. Commit and push changes
3. Create GitHub release with tag `v1.0.0`
4. Workflow publishes automatically

#### Option B: Manual Workflow
1. Go to GitHub Actions
2. Run "Publish TypeScript SDK to npm" workflow
3. Choose `major` for version bump (0.1.0 → 1.0.0)
4. Workflow bumps version, publishes, and creates release

### Step 3: Verify Publication
1. Check [npmjs.com/package/nomos-sdk](https://www.npmjs.com/package/nomos-sdk)
2. Test installation: `npm install nomos-sdk`
3. Verify provenance shows on npm (security badge)

## 🔧 Customization Options

### Change Package Name
If you want a different npm package name:

```json
{
  "name": "@your-org/nomos-sdk"
}
```

### Scoped Packages
For organization scopes, update workflows:

```yaml
- run: npm publish --provenance --access public
```

### Different Registry
To publish to a private registry:

```json
{
  "publishConfig": {
    "registry": "https://your-registry.com/"
  }
}
```

## 🐛 Troubleshooting

### Common Issues

**1. "npm ERR! 403 Forbidden"**
- Check NPM_TOKEN is correct in GitHub secrets
- Ensure token has publish permissions
- Verify package name isn't taken

**2. "Version already exists"**
- Bump version in package.json
- Or use manual workflow to auto-bump

**3. "Build failed"**
- Check TypeScript compilation locally
- Ensure all dependencies are listed
- Verify tests pass

**4. "Provenance failed"**
- Ensure `id-token: write` permission in workflow
- Check GitHub Actions runner supports provenance

**5. "ERR_REQUIRE_ESM" or import errors**
- Package is published as ES module
- CommonJS users need dynamic imports: `const sdk = await import('nomos-sdk')`
- Or add `"type": "module"` to consuming project's package.json

### Debug Commands

```bash
# Check what will be published
npm pack --dry-run

# Test local installation
npm link
cd ../examples/typescript-sdk-example
npm link nomos-sdk

# Check build output
npm run build
ls -la dist/
```

## 🎉 Post-Publication

### Update Examples
Update the example's package.json to use the published version:

```json
{
  "dependencies": {
    "nomos-sdk": "^1.0.0"
  }
}
```

### Documentation
Update main README to reference npm installation:

```markdown
## Installation

\`\`\`bash
npm install nomos-sdk
\`\`\`
```

### Announce
- Update project documentation
- Share with team/community
- Consider creating a blog post or announcement

## 🔄 Ongoing Maintenance

### Regular Updates
- Use semantic versioning (patch/minor/major)
- Keep dependencies updated
- Run security audits: `npm audit`

### Monitoring
- Watch npm download stats
- Monitor GitHub issues for SDK problems
- Keep CI green and tests passing

---

## 🎯 Summary

You now have:
- ✅ **Automated publishing** via GitHub releases
- ✅ **Manual publishing** with version bumping
- ✅ **Comprehensive CI/CD** testing
- ✅ **npm provenance** for security
- ✅ **Professional package** configuration

The SDK will be available as `npm install nomos-sdk` once published! 🚀
