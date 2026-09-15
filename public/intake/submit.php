<?php
/**
 * First-party data intake for the static deployment.
 *
 * The site is served as flat files on shared hosting, so /api/submissions -
 * the Next route that normally takes a homeowner's figures - is not deployed.
 * Until now the forms simply said contributions were paused, which meant the
 * one part of this product that gets better with traffic could not get better
 * at all. Shared hosting has no Node and never will, but it does run PHP, and
 * appending a validated line to a file is the whole job.
 *
 * It mirrors app/api/submissions/route.ts deliberately, constraint for
 * constraint, because this is the dataset the business eventually rests on:
 *   - no name, email, address or contractor name is accepted at all
 *   - the date is stored to the month, never the day
 *   - every row lands as "pending" and is useless until a human approves it
 *   - explicit consent, with a version string, is required
 *
 * What it writes is JSON Lines under ../../hcd-data/, which .htaccess denies to
 * the web. One row per line means a partial write loses one submission rather
 * than corrupting the file, and it is the shape scripts/import-submissions.ts
 * reads back.
 */

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

const CONSENT_VERSION = '2026-08-contribute-v2';
const MAX_BODY_BYTES  = 8192;
const RATE_WINDOW_SEC = 3600;
const RATE_MAX_POSTS  = 20;

/** Outside the document root: a data file the web can read is a data leak. */
function data_dir(): string {
    $dir = dirname(__DIR__, 2) . '/hcd-data';
    if (!is_dir($dir)) {
        @mkdir($dir, 0750, true);
    }
    return $dir;
}

function fail(int $status, string $message): never {
    http_response_code($status);
    // Only ever our own strings. Echoing any part of the request back is how a
    // JSON endpoint becomes a reflection gadget.
    echo json_encode(['ok' => false, 'error' => $message], JSON_UNESCAPED_SLASHES);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    fail(405, 'POST only');
}

/**
 * Crude per-IP throttle.
 *
 * Not security - anyone can change address - but it stops one broken client or
 * one bored visitor from filling the disk, which on shared hosting takes the
 * whole site down rather than just this endpoint.
 */
function throttle(): void {
    $ip   = (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
    $path = data_dir() . '/rate-' . hash('sha256', $ip) . '.txt';
    $now  = time();
    $hits = [];
    if (is_readable($path)) {
        $hits = array_filter(
            array_map('intval', explode(',', (string) file_get_contents($path))),
            static fn(int $t): bool => $t > $now - RATE_WINDOW_SEC,
        );
    }
    if (count($hits) >= RATE_MAX_POSTS) {
        header('Retry-After: ' . RATE_WINDOW_SEC);
        fail(429, 'Too many submissions from this address. Try again later.');
    }
    $hits[] = $now;
    @file_put_contents($path, implode(',', $hits), LOCK_EX);
}
throttle();

$raw = file_get_contents('php://input', false, null, 0, MAX_BODY_BYTES + 1);
if ($raw === false || $raw === '') {
    fail(400, 'Empty request body');
}
if (strlen($raw) > MAX_BODY_BYTES) {
    fail(413, 'Request body too large');
}

$body = json_decode($raw, true);
if (!is_array($body)) {
    fail(400, 'Invalid JSON body');
}

if (($body['consent'] ?? null) !== true) {
    fail(422, 'We need your explicit consent before storing anything');
}

$zip = (string) ($body['zip'] ?? '');
if (preg_match('/^\d{5}$/', $zip) !== 1) {
    fail(422, 'A 5-digit ZIP code is required');
}

$amountPaid = filter_var($body['amountPaid'] ?? null, FILTER_VALIDATE_FLOAT);
if ($amountPaid === false || $amountPaid <= 0 || $amountPaid > 2000000) {
    fail(422, 'Enter the amount you actually paid');
}

$projectMonth = (string) ($body['projectMonth'] ?? '');
if (preg_match('/^\d{4}-\d{2}$/', $projectMonth) !== 1) {
    fail(422, 'Project month must be in YYYY-MM form');
}

/** Optional number, or null. Never a string that happens to look numeric. */
function opt_num(mixed $v, float $max): ?float {
    $n = filter_var($v, FILTER_VALIDATE_FLOAT);
    return ($n === false || $n <= 0 || $n > $max) ? null : $n;
}

/** Optional identifier from a short, known-safe alphabet. */
function opt_slug(mixed $v, int $max = 64): ?string {
    if (!is_string($v) || $v === '') {
        return null;
    }
    $v = substr($v, 0, $max);
    return preg_match('/^[A-Za-z0-9._-]+$/', $v) === 1 ? $v : null;
}

$row = [
    'id'             => 'apc-' . bin2hex(random_bytes(8)),
    'serviceSlug'    => opt_slug($body['serviceSlug'] ?? null) ?? 'roofing',
    'zip'            => $zip,
    'projectMonth'   => $projectMonth,
    'amountPaid'     => $amountPaid,
    'materialId'     => opt_slug($body['materialId'] ?? null),
    'roofAreaSqft'   => opt_num($body['roofAreaSqft'] ?? null, 100000),
    'inputs'         => [
        'stories'            => opt_num($body['stories'] ?? null, 10),
        'pitch'              => opt_slug($body['pitch'] ?? null, 32),
        'complexity'         => opt_slug($body['complexity'] ?? null, 32),
        'tearOffLayers'      => opt_num($body['tearOffLayers'] ?? null, 10),
        'quotesReceivedLow'  => opt_num($body['quotesReceivedLow'] ?? null, 2000000),
        'quotesReceivedHigh' => opt_num($body['quotesReceivedHigh'] ?? null, 2000000),
        'sessionId'          => opt_slug($body['sessionId'] ?? null),
    ],
    'quotesReceived' => opt_num($body['quotesReceived'] ?? null, 100),
    'consentVersion' => CONSENT_VERSION,
    'status'         => 'pending',
    // To the second is fine here: it records when the row arrived, not when the
    // work happened. projectMonth is the one deliberately coarsened.
    'submittedAt'    => gmdate('c'),
];

$line = json_encode($row, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
if ($line === false) {
    fail(500, 'Could not store that. Nothing was saved.');
}

$file = data_dir() . '/submissions.jsonl';
// LOCK_EX because two visitors posting at once would otherwise interleave
// halfway through a line and corrupt both.
if (@file_put_contents($file, $line . "\n", FILE_APPEND | LOCK_EX) === false) {
    fail(500, 'Could not store that. Nothing was saved.');
}
@chmod($file, 0640);

echo json_encode([
    'ok'      => true,
    'message' => 'Thank you. Your figures are queued for review. They will only ever be used in aggregate, and never in a way that identifies your property.',
], JSON_UNESCAPED_SLASHES);
