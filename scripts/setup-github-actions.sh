#!/bin/bash
# GitHub Actions Setup Helper Script
# Helps you gather the required information for GitHub secrets

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  GitHub Actions CI/CD Setup Helper"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "This script helps you gather information needed for"
echo "GitHub repository secrets."
echo ""

# Check if wrangler is authenticated
if ! npx wrangler whoami > /dev/null 2>&1; then
  echo "Not logged in to Cloudflare"
  echo "   Run: npx wrangler login"
  exit 1
fi

echo "Logged in to Cloudflare"
echo ""

# Get account info
echo "Fetching your Cloudflare information..."
echo ""

# Get account ID
ACCOUNT_INFO=$(npx wrangler whoami 2>/dev/null | grep -A 1 "Account Name" | tail -1)
if [ -z "$ACCOUNT_INFO" ]; then
  echo " Could not auto-detect Account ID"
  echo "   Please get it manually from: https://dash.cloudflare.com"
else
  ACCOUNT_ID=$(echo "$ACCOUNT_INFO" | awk '{print $2}')
  echo "Account ID: $ACCOUNT_ID"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  GitHub Secrets to Configure"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "Go to: https://github.com/JacquesCyber/JavaScriptSecure/settings/secrets/actions"
echo ""
echo "Add these three secrets:"
echo ""

echo "1. CLOUDFLARE_API_TOKEN"
echo "   ├─ Get from: https://dash.cloudflare.com/profile/api-tokens"
echo "   ├─ Click: Create Token"
echo "   ├─ Template: Edit Cloudflare Workers"
echo "   └─ Copy the token value"
echo ""

if [ -n "$ACCOUNT_ID" ]; then
  echo "2. CLOUDFLARE_ACCOUNT_ID"
  echo "   └─ Value: $ACCOUNT_ID"
else
  echo "2. CLOUDFLARE_ACCOUNT_ID"
  echo "   ├─ Get from: https://dash.cloudflare.com"
  echo "   └─ Click Workers & Pages (shown at top)"
fi
echo ""

echo "3. CLOUDFLARE_SUBDOMAIN"
echo "   ├─ Look at your Worker URL pattern:"
echo "   ├─ Format: https://worker-name.YOUR-SUBDOMAIN.workers.dev"
echo "   └─ Copy just the subdomain part"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Next Steps"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "After adding secrets:"
echo ""
echo "  1. Commit workflow file:"
echo "     git add .github/workflows/deploy.yml"
echo "     git commit -m \"Add CI/CD pipeline\""
echo ""
echo "  2. Push to main:"
echo "     git push origin main"
echo ""
echo "  3. Watch deployment:"
echo "     https://github.com/JacquesCyber/JavaScriptSecure/actions"
echo ""
echo "  4. Enable write permissions for workflow:"
echo "     Go to: Settings → Actions → General → Workflow permissions"
echo "     Select: Read and write permissions"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
