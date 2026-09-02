#!/usr/bin/env bash
#
# Build the site as plain static files for a host with no Node runtime.
#
# Next refuses `output: "export"` if the app contains anything that must run on
# a server, so this stages a copy of the source with those routes removed and
# builds that, leaving the real source untouched. Working on a copy also means
# a failed build cannot leave the repository half-dismantled.
#
# Removed from the static build, and why:
#   app/api      route handlers - there is no server to run them
#   app/admin    session auth and database writes
#   app/r        per-share pages and OG images, which are rendered per request
#   components/admin  client forms bound to the deleted admin server actions
#
# Everything else exports, and the calculator, quote checker and comparison all
# work because they compute in the browser.
#
#   npm run build:static     ->  out/
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STAGE="$ROOT/.static-build"

cd "$ROOT"

echo "==> Staging a copy of the source"
rm -rf "$STAGE" "$ROOT/out"
mkdir -p "$STAGE"
# Tracked files plus untracked ones git is not ignoring, so the script works on
# a dirty tree - building only what happens to be committed is a trap that
# silently omits the file you just wrote.
git ls-files -z --cached --others --exclude-standard \
  | xargs -0 -I{} sh -c 'mkdir -p "$2/$(dirname "$1")" && cp "$1" "$2/$1"' _ {} "$STAGE"

echo "==> Removing routes that require a server"
rm -rf "$STAGE/app/api" "$STAGE/app/admin" "$STAGE/app/r" "$STAGE/components/admin"

# Reuse the installed dependencies rather than a second npm install.
ln -s "$ROOT/node_modules" "$STAGE/node_modules"

echo "==> Building"
cd "$STAGE"
STATIC_EXPORT=1 NEXT_PUBLIC_STATIC_BUILD=1 npx next build

echo "==> Collecting output"
cp -a "$STAGE/out" "$ROOT/out"

# Apache/LiteSpeed configuration. Next writes directory-style output, so the
# only things needed are a sane 404, compression, and cache headers that do not
# make the hashed asset filenames pointless.
cat > "$ROOT/out/.htaccess" <<'HTACCESS'
# Home Cost Doctor - static build
Options -Indexes
DirectoryIndex index.html

ErrorDocument 404 /404.html

# Serve /foo for /foo/index.html without a redirect loop.
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteCond %{REQUEST_FILENAME}/index.html -f
  RewriteRule ^(.*)$ /$1/index.html [L]
</IfModule>

<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css text/plain text/xml application/javascript application/json image/svg+xml
</IfModule>

<IfModule mod_expires.c>
  ExpiresActive On
  # Filenames under /_next/static carry a content hash, so they can be cached
  # hard. HTML cannot: it is what points at the current hashes.
  ExpiresByType text/html "access plus 0 seconds"
  ExpiresByType text/css "access plus 1 year"
  ExpiresByType application/javascript "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 1 month"
</IfModule>

<IfModule mod_headers.c>
  Header set X-Content-Type-Options "nosniff"
  Header set Referrer-Policy "strict-origin-when-cross-origin"
  Header set X-Frame-Options "SAMEORIGIN"
  <FilesMatch "\.(js|css|woff2)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
  <FilesMatch "\.html$">
    Header set Cache-Control "public, max-age=0, must-revalidate"
  </FilesMatch>
</IfModule>
HTACCESS

rm -rf "$STAGE"

PAGES=$(find "$ROOT/out" -name "index.html" | wc -l | tr -d ' ')
SIZE=$(du -sh "$ROOT/out" | cut -f1)
echo
echo "==> Done: $PAGES pages, $SIZE, in out/"
echo "    Upload everything INSIDE out/ (including .htaccess) to public_html."
