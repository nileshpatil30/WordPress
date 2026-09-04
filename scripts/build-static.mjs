/**
 * Build the site as plain static files for a host with no Node runtime.
 *
 * Next refuses `output: "export"` if the app contains anything that must run on
 * a server, so this stages a copy of the source with those routes removed and
 * builds that, leaving the real source untouched. Working on a copy also means
 * a failed build cannot leave the repository half-dismantled.
 *
 * Removed from the static build, and why:
 *   app/api      route handlers - there is no server to run them
 *   app/admin    session auth and database writes
 *   app/r        per-share pages and OG images, which are rendered per request
 *   components/admin  client forms bound to the deleted admin server actions
 *
 * Everything else exports, and the calculator, quote checker and comparison all
 * work because they compute in the browser.
 *
 *   npm run build:static     ->  out/
 *
 * This was a bash script until it met Windows, where `npm run build:static`
 * died on `'bash' is not recognized` - on the one machine the project is
 * actually deployed from. Node is the only interpreter this repository can
 * assume, so the build now runs on it.
 */
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const STAGE = path.join(ROOT, ".static-build");
const OUT = path.join(ROOT, "out");

const rm = (p) => fs.rmSync(p, { recursive: true, force: true });

console.log("==> Staging a copy of the source");
rm(STAGE);
rm(OUT);
fs.mkdirSync(STAGE, { recursive: true });

// Tracked files plus untracked ones git is not ignoring, so the script works on
// a dirty tree - building only what happens to be committed is a trap that
// silently omits the file you just wrote.
const listed = execFileSync(
  "git",
  ["ls-files", "-z", "--cached", "--others", "--exclude-standard"],
  { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 },
).toString("utf8");

let copied = 0;
for (const rel of listed.split("\0")) {
  if (!rel) continue;
  const src = path.join(ROOT, rel);
  // git lists staged deletions too; skip anything no longer on disk.
  if (!fs.existsSync(src)) continue;
  const dest = path.join(STAGE, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  copied++;
}
console.log(`    ${copied} files`);

console.log("==> Removing routes that require a server");
for (const rel of ["app/api", "app/admin", "app/r", "components/admin"]) {
  rm(path.join(STAGE, rel));
}

// Reuse the installed dependencies rather than a second npm install.
//
// "junction" rather than a symlink because Windows needs either developer mode
// or an elevated shell to create a directory symlink, and needs neither for a
// junction. It is ignored on POSIX, where the type argument does not apply.
console.log("==> Linking node_modules");
fs.symlinkSync(path.join(ROOT, "node_modules"), path.join(STAGE, "node_modules"), "junction");

console.log("==> Building");
// Next's own entry script run on this Node, rather than shelling out to npx.
// On Windows npx resolves to npx.cmd, which Node will only execute through a
// shell, and passing arguments through a shell is both a deprecation warning
// and a quoting hazard. Calling the script directly sidesteps all of it.
const build = spawnSync(process.execPath, [require.resolve("next/dist/bin/next"), "build"], {
  cwd: STAGE,
  stdio: "inherit",
  env: { ...process.env, STATIC_EXPORT: "1", NEXT_PUBLIC_STATIC_BUILD: "1" },
});
if (build.status !== 0) {
  console.error("\nBuild failed. The staged copy is left at .static-build for inspection.");
  process.exit(build.status ?? 1);
}

console.log("==> Collecting output");
fs.cpSync(path.join(STAGE, "out"), OUT, { recursive: true });

// Apache/LiteSpeed configuration. Next writes directory-style output, so the
// only things needed are a sane 404, compression, and cache headers that do not
// make the hashed asset filenames pointless.
fs.writeFileSync(path.join(OUT, ".htaccess"), `# Home Cost Doctor - static build
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
  <FilesMatch "\\.(js|css|woff2)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
  <FilesMatch "\\.html$">
    Header set Cache-Control "public, max-age=0, must-revalidate"
  </FilesMatch>
</IfModule>
`);

rm(STAGE);

/**
 * Package it, because the manual version has a silent failure mode.
 *
 * Everything inside out/ must land at the top of the archive. Right-clicking
 * the out folder in Explorer or Finder instead produces a zip with an out/
 * wrapper inside it, which extracts to public_html/out/ and serves nothing.
 * The wrapper is invisible until the site is already broken, so the build
 * makes the archive itself.
 *
 * Never fatal: a missing zip tool should not lose a successful build.
 */
const ZIP = path.join(ROOT, "homecostdoctor-static.zip");
fs.rmSync(ZIP, { force: true });

const packaged = process.platform === "win32"
  // -Force on Get-ChildItem so .htaccess is included. It carries no hidden
  // attribute on Windows, but a leading dot is close enough to a trap.
  ? spawnSync("powershell", ["-NoProfile", "-NonInteractive", "-Command",
      `Compress-Archive -Path (Get-ChildItem -Force -LiteralPath '${OUT}' | ForEach-Object FullName) -DestinationPath '${ZIP}' -Force`],
      { stdio: "inherit" })
  : spawnSync("zip", ["-qr", ZIP, "."], { cwd: OUT, stdio: "inherit" });

const zipped = packaged.status === 0 && fs.existsSync(ZIP);

let pages = 0;
let bytes = 0;
for (const entry of fs.readdirSync(OUT, { recursive: true, withFileTypes: true })) {
  const full = path.join(entry.parentPath ?? entry.path, entry.name);
  if (!entry.isFile()) continue;
  if (entry.name === "index.html") pages++;
  bytes += fs.statSync(full).size;
}
console.log(`\n==> Done: ${pages} pages, ${(bytes / 1024 / 1024).toFixed(1)}M, in out/`);
if (zipped) {
  const mb = (fs.statSync(ZIP).size / 1024 / 1024).toFixed(1);
  console.log(`    Packaged: homecostdoctor-static.zip (${mb}M)`);
  console.log("    Upload that to Hostinger and extract it into public_html.");
} else {
  console.log("    Could not build the zip, so package out/ by hand: go INSIDE");
  console.log("    out/, select everything including .htaccess, and compress that.");
  console.log("    Compressing the out folder itself adds a wrapper and serves nothing.");
}
