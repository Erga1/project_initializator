const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { after, test } = require('node:test');

const {
  detectPackageManager,
  generateProject,
  languageSlug,
  listTemplates,
  loadConfig,
  mergeJson,
  missingRequirements,
  parseArgs,
  resolveLanguage,
} = require('../bin/index.js');

const cli = path.resolve(__dirname, '..', 'bin', 'index.js');
const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'init-proj-'));

after(() => {
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
});

function generate(template, language, pm = 'pnpm') {
  const cwd = fs.mkdtempSync(path.join(temporaryRoot, `${template}-`));
  const projectName = `sample-${template}`;
  const destination = generateProject({
    template,
    projectName,
    pm,
    language,
    git: false,
    install: false,
    cwd,
  });
  return { destination, projectName };
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function* walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

test('argument parsing supports package managers, languages, and boolean flags', () => {
  const parsed = parseArgs(['node-express', 'my-api', '--pm=pnpm', '--lang', 'ts', '--git']);
  assert.deepEqual(parsed.positionals, ['node-express', 'my-api']);
  assert.equal(parsed.pm, 'pnpm');
  assert.equal(parsed.language, 'typescript');
  assert.equal(parsed.git, true);
  assert.equal(parseArgs(['--lang=JS']).language, 'javascript');
  assert.equal(parseArgs(['x', 'y', '--no-install']).install, false);
  assert.throws(() => parseArgs(['node-express', 'my-api', '--pm', 'invalid']), /Unsupported/);
  assert.throws(() => parseArgs(['--lang']), /requires a language/);
});

test('package manager detection uses the launching user agent', () => {
  assert.equal(detectPackageManager({ npm_config_user_agent: 'pnpm/10.0.0 node/v22.0.0' }), 'pnpm');
  assert.equal(detectPackageManager({ npm_config_user_agent: 'bun/1.2.0' }), 'bun');
  assert.equal(detectPackageManager({}), 'npm');
});

test('template discovery lists every template with its supported languages', () => {
  const templates = listTemplates();
  assert.deepEqual(
    templates.map(({ name, projectType, languages }) => ({ name, projectType, languages })),
    [
      { name: 'expo', projectType: 'mobile', languages: ['TypeScript', 'JavaScript'] },
      { name: 'flutter', projectType: 'mobile', languages: ['Dart'] },
      { name: 'mobile-api', projectType: 'backend', languages: ['TypeScript'] },
      { name: 'nest-prisma', projectType: 'backend', languages: ['TypeScript'] },
      { name: 'node-express', projectType: 'backend', languages: ['JavaScript', 'TypeScript'] },
      { name: 'react-next', projectType: 'frontend', languages: ['TypeScript', 'JavaScript'] },
      { name: 'react-vite', projectType: 'frontend', languages: ['TypeScript', 'JavaScript'] },
    ],
  );
  assert.equal(templates.find((t) => t.name === 'flutter').ecosystem, 'dart');
});

test('React is not tied to a single bundler: both Vite and Next.js are offered', () => {
  const react = listTemplates().filter((t) => t.framework.startsWith('React +'));
  assert.deepEqual(react.map((t) => t.name).sort(), ['react-next', 'react-vite']);
});

test('child templates inherit install, audit, languages, and commands', () => {
  const config = loadConfig('nest-prisma');
  assert.deepEqual(config.postInstall, ['{{pm}} install', '{{pm}} run prisma:generate']);
  assert.equal(config.audit, '{{pm}} audit');
  assert.ok(config.directories.includes('src/prisma'));

  const mobile = loadConfig('mobile-api');
  assert.deepEqual(mobile.languages, ['TypeScript']);
  assert.deepEqual(mobile.postInstall, ['{{pm}} install', '{{pm}} run prisma:generate']);
  assert.ok(mobile.directories.includes('src/auth') && mobile.directories.includes('src/prisma'));
});

test('language rules: only declared languages are accepted', () => {
  assert.equal(languageSlug('TS'), 'typescript');
  const nest = loadConfig('nest-prisma');
  assert.equal(resolveLanguage(nest, undefined, 'nest-prisma'), 'TypeScript');
  assert.equal(resolveLanguage(nest, 'ts', 'nest-prisma'), 'TypeScript');
  assert.throws(() => resolveLanguage(nest, 'javascript', 'nest-prisma'), /does not support/);
  assert.throws(() => generate('nest-prisma', 'js'), /Supported language\(s\): TypeScript/);
  assert.throws(() => generate('flutter', 'typescript'), /Supported language\(s\): Dart/);
  assert.throws(() => generate('react-vite', 'dart'), /does not support/);
});

test('mergeJson merges objects and arrays, and null deletes keys', () => {
  assert.deepEqual(
    mergeJson(
      { a: 1, scripts: { x: 'x' }, list: [1] },
      { b: 2, scripts: { y: 'y' }, list: [1, 2] },
    ),
    { a: 1, b: 2, scripts: { x: 'x', y: 'y' }, list: [1, 2] },
  );
  assert.deepEqual(mergeJson({ a: 1, b: 2 }, { a: null }), { b: 2 });
});

test('missingRequirements reports absent tools with hints', () => {
  const missing = missingRequirements(loadConfig('flutter'), () => false);
  assert.equal(missing.length, 1);
  assert.equal(missing[0].command, 'flutter');
  assert.deepEqual(
    missingRequirements(loadConfig('flutter'), () => true),
    [],
  );
  assert.deepEqual(
    missingRequirements(loadConfig('node-express'), () => false),
    [],
  );
});

const combinations = listTemplates().flatMap((template) =>
  template.languages.map((language) => [template.name, language]),
);

for (const [template, language] of combinations) {
  test(`${template} (${language}) generates a complete project without installing`, () => {
    const { destination, projectName } = generate(template, language);
    assert.ok(fs.existsSync(path.join(destination, 'README.md')));
    assert.ok(!fs.existsSync(path.join(destination, 'node_modules')));

    if (template === 'flutter') {
      assert.ok(fs.existsSync(path.join(destination, 'lib', 'main.dart')));
      assert.ok(fs.existsSync(path.join(destination, '.github', 'workflows', 'ci.yml')));
      assert.ok(!fs.existsSync(path.join(destination, 'package.json')));
      const test = fs.readFileSync(path.join(destination, 'test', 'widget_test.dart'), 'utf8');
      assert.match(test, /package:sample_flutter\/app\.dart/);
      return;
    }

    const packageJson = readJson(path.join(destination, 'package.json'));
    assert.equal(packageJson.name, projectName);
    assert.ok(fs.existsSync(path.join(destination, '.gitignore')));
    assert.ok(fs.existsSync(path.join(destination, '.github', 'workflows', 'ci.yml')));
    assert.ok(fs.existsSync(path.join(destination, '.github', 'dependabot.yml')));
    assert.ok(fs.existsSync(path.join(destination, '.husky', 'pre-commit')));
    // Containers make no sense for a mobile app bundle.
    assert.equal(fs.existsSync(path.join(destination, 'Dockerfile')), template !== 'expo');
    const hook = fs.readFileSync(path.join(destination, '.husky', 'pre-commit'), 'utf8');
    assert.equal(hook.trim(), 'pnpm run lint:staged');
  });
}

test('no generated file keeps an unreplaced placeholder', () => {
  for (const [template, language] of combinations) {
    const { destination } = generate(template, language);
    for (const file of walk(destination)) {
      const content = fs.readFileSync(file, 'utf8');
      assert.doesNotMatch(
        content,
        /\{\{\s*(projectName|pm|dartName|identifier|language\w*)\s*\}\}/,
        file,
      );
    }
  }
});

test('language layers add the right files and merge package.json', () => {
  const ts = generate('react-vite', 'typescript').destination;
  const js = generate('react-vite', 'javascript').destination;
  assert.ok(fs.existsSync(path.join(ts, 'src', 'main.tsx')));
  assert.ok(fs.existsSync(path.join(ts, 'tsconfig.json')));
  assert.ok(!fs.existsSync(path.join(ts, 'src', 'main.jsx')));
  assert.ok(fs.existsSync(path.join(js, 'src', 'main.jsx')));
  assert.ok(!fs.existsSync(path.join(js, 'tsconfig.json')));

  const tsPackage = readJson(path.join(ts, 'package.json'));
  const jsPackage = readJson(path.join(js, 'package.json'));
  assert.equal(tsPackage.scripts.build, 'tsc -b && vite build');
  assert.equal(jsPackage.scripts.build, 'vite build');
  assert.ok(tsPackage.devDependencies.typescript);
  assert.equal(jsPackage.devDependencies.typescript, undefined);
  assert.ok(tsPackage.devDependencies.vite && jsPackage.devDependencies.vite);

  const expressTs = readJson(path.join(generate('node-express', 'ts').destination, 'package.json'));
  const expressJs = readJson(path.join(generate('node-express', 'js').destination, 'package.json'));
  assert.equal(expressTs.scripts.start, 'node dist/server.js');
  assert.equal(expressJs.scripts.start, 'node src/server.js');
  assert.ok(expressTs.dependencies.express && expressJs.dependencies.express);
});

test('mobile-api layers its auth schema and dependencies over nest-prisma', () => {
  const { destination } = generate('mobile-api');
  const packageJson = readJson(path.join(destination, 'package.json'));
  assert.ok(packageJson.dependencies['@nestjs/jwt']);
  assert.ok(packageJson.dependencies['@nestjs/core']);
  const schema = fs.readFileSync(path.join(destination, 'prisma', 'schema.prisma'), 'utf8');
  assert.match(schema, /model RefreshToken/);
  assert.ok(fs.existsSync(path.join(destination, 'src', 'auth', 'auth.service.ts')));
  const compose = fs.readFileSync(path.join(destination, 'compose.yaml'), 'utf8');
  assert.match(compose, /POSTGRES_DB: 'sample-mobile-api'/);
});

test('package-manager layers apply only for the chosen manager', () => {
  const pnpm = generate('expo', 'ts', 'pnpm').destination;
  const npm = generate('expo', 'ts', 'npm').destination;
  assert.match(fs.readFileSync(path.join(pnpm, '.npmrc'), 'utf8'), /node-linker=hoisted/);
  assert.ok(!fs.existsSync(path.join(npm, '.npmrc')));
  const app = readJson(path.join(npm, 'app.json'));
  assert.equal(app.expo.ios.bundleIdentifier, 'com.example.sampleexpo');
});

test('CLI lists templates with languages and rejects missing arguments without hanging', () => {
  const list = execFileSync(process.execPath, [cli, '--list'], { encoding: 'utf8' });
  for (const name of [
    'node-express',
    'react-vite',
    'react-next',
    'nest-prisma',
    'expo',
    'flutter',
    'mobile-api',
  ]) {
    assert.match(list, new RegExp(name));
  }
  assert.match(list, /TypeScript, JavaScript/);

  assert.throws(
    () => execFileSync(process.execPath, [cli, '-y'], { encoding: 'utf8', stdio: 'pipe' }),
    /Command failed/,
  );
});

test('unsafe project names, unknown templates, and missing tools are rejected', () => {
  const base = { pm: 'npm', git: false, install: false, cwd: temporaryRoot };
  assert.throws(
    () => generateProject({ ...base, template: 'node-express', projectName: '../escape' }),
    /Project name/,
  );
  assert.throws(
    () => generateProject({ ...base, template: 'unknown', projectName: 'safe-name' }),
    /Unknown template/,
  );
});
