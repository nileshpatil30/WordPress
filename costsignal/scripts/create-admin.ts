/**
 * Create an admin account.
 *
 *   npm run admin:create -- --email you@example.com --role owner
 *
 * The password is read from stdin without echoing, never from an argument -
 * process arguments end up in shell history and in `ps` output.
 */
import readline from "node:readline";
import { getStore } from "../lib/data/store";
import { newAdminUser, passwordProblem } from "../lib/auth";
import type { AdminRole } from "../lib/types";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

/**
 * Read piped stdin once, so the script can also be driven non-interactively
 * (CI, provisioning) as: printf 'pass\npass\n' | npm run admin:create -- --email ...
 */
let pipedLines: string[] | null = null;
async function nextPipedLine(): Promise<string> {
  if (pipedLines === null) {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
    pipedLines = Buffer.concat(chunks).toString("utf8").split(/\r?\n/);
  }
  return pipedLines.shift() ?? "";
}

function promptTty(question: string, hidden: boolean): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin, output: process.stdout, terminal: true,
  });

  if (hidden) {
    // Suppress echo so the password never appears on screen or in scrollback.
    // readline exposes no public API for this, hence the internal hook.
    const target = rl as unknown as { _writeToOutput: (s: string) => void };
    let shown = false;
    target._writeToOutput = () => {
      if (!shown) { shown = true; process.stdout.write(question); }
    };
  }

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write("\n");
      resolve(answer);
    });
  });
}

async function prompt(question: string, { hidden = false } = {}): Promise<string> {
  if (!process.stdin.isTTY) return (await nextPipedLine()).trim();
  return promptTty(question, hidden);
}

async function main() {
  const email = arg("email") ?? await prompt("Email: ");
  const role = (arg("role") ?? "owner") as AdminRole;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    console.error("That does not look like an email address.");
    process.exit(1);
  }
  if (!["owner", "editor", "viewer"].includes(role)) {
    console.error("--role must be owner, editor or viewer.");
    process.exit(1);
  }

  const password = await prompt("Password (min 12 chars, mixed case, a number or symbol): ", { hidden: true });
  const problem = passwordProblem(password);
  if (problem) { console.error(`Password rejected: ${problem}`); process.exit(1); }

  const confirm = await prompt("Confirm password: ", { hidden: true });
  if (confirm !== password) { console.error("Passwords do not match."); process.exit(1); }

  const store = await getStore();
  const existing = await store.getAdminUserByEmail(email);
  if (existing) { console.error(`An account already exists for ${email}.`); process.exit(1); }

  const user = await newAdminUser(email, password, role);
  const result = await store.createAdminUser(user);
  if (!result.ok) { console.error(result.message ?? "Could not create the account."); process.exit(1); }

  const total = (await store.listAdminUsers()).length;
  console.log(`\nCreated ${email} as ${role}. ${total} admin account(s) now exist.`);
  console.log(`Storage driver: ${store.driver}.`);
  if (store.driver === "json") {
    console.log("Note: the JSON store writes to .data/store.json, which is gitignored and");
    console.log("local to this machine. Set DATABASE_URL to create accounts in PostgreSQL.");
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
