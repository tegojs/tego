const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const REPO_URL = 'https://github.com/tegojs/tego';
const BUGS_URL = `${REPO_URL}/issues`;
const HOMEPAGE = `${REPO_URL}#readme`;
const DIRECTORY_PLACEHOLDER = '__TODO_FILL_REPOSITORY_DIRECTORY__';

const EXCLUDED_DIRS = new Set(['node_modules', '.git', 'dist', 'coverage', '.next', '.turbo']);

function shouldSkipDir(dirName) {
  return EXCLUDED_DIRS.has(dirName);
}

function walkForPackageJson(dir, results) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (shouldSkipDir(entry.name)) {
        continue;
      }
      walkForPackageJson(fullPath, results);
      continue;
    }

    if (entry.isFile() && entry.name === 'package.json') {
      results.push(fullPath);
    }
  }
}

function toPosixRel(absPath) {
  return path.relative(ROOT, absPath).split(path.sep).join('/');
}

function ensureMetadata(pkg, relPath) {
  let changed = false;

  if (!pkg.homepage || typeof pkg.homepage !== 'string' || !pkg.homepage.trim()) {
    pkg.homepage = HOMEPAGE;
    changed = true;
  }

  if (!pkg.bugs || typeof pkg.bugs !== 'object' || Array.isArray(pkg.bugs)) {
    pkg.bugs = { url: BUGS_URL };
    changed = true;
  }
  if (!pkg.bugs.url || typeof pkg.bugs.url !== 'string' || !pkg.bugs.url.trim()) {
    pkg.bugs.url = BUGS_URL;
    changed = true;
  }

  if (!pkg.repository || typeof pkg.repository !== 'object' || Array.isArray(pkg.repository)) {
    pkg.repository = { type: 'git', url: REPO_URL };
    changed = true;
  }

  if (!pkg.repository.type || typeof pkg.repository.type !== 'string' || !pkg.repository.type.trim()) {
    pkg.repository.type = 'git';
    changed = true;
  }

  if (!pkg.repository.url || typeof pkg.repository.url !== 'string' || !pkg.repository.url.trim()) {
    pkg.repository.url = REPO_URL;
    changed = true;
  } else if (pkg.repository.url !== REPO_URL) {
    pkg.repository.url = REPO_URL;
    changed = true;
  }

  if (relPath !== 'package.json') {
    const inferredDirectory = path.posix.dirname(relPath);
    if (!pkg.repository.directory || typeof pkg.repository.directory !== 'string' || !pkg.repository.directory.trim()) {
      pkg.repository.directory = inferredDirectory || DIRECTORY_PLACEHOLDER;
      changed = true;
    }
  }

  return changed;
}

function main() {
  const packageFiles = [];
  walkForPackageJson(ROOT, packageFiles);

  let changedCount = 0;

  for (const pkgFile of packageFiles) {
    const relPath = toPosixRel(pkgFile);
    const content = fs.readFileSync(pkgFile, 'utf8');
    const pkg = JSON.parse(content);

    const changed = ensureMetadata(pkg, relPath);
    if (!changed) {
      continue;
    }

    fs.writeFileSync(pkgFile, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
    changedCount += 1;
    console.log(`updated: ${relPath}`);
  }

  console.log(`\nDone. Updated ${changedCount} package.json files.`);
}

main();
