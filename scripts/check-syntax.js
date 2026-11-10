// Syntax-check every .js file in the repo (except node_modules).
// Replaces the old `git ls-files` check, which failed outright in
// any checkout that is not a git repo. Usage: npm run check
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const files = [];

function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === "node_modules" || entry.name === ".git") continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith(".js")) files.push(full);
    }
}

walk(root);
for (const file of files) {
    execFileSync(process.execPath, ["--check", file], { stdio: "inherit" });
}
console.log(`Syntax checked ${files.length} JavaScript files`);
