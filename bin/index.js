#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync, execSync, spawnSync } = require('node:child_process');

const PACKAGE_MANAGERS = ['npm', 'pnpm', 'yarn', 'bun'];
const PROJECT_TYPE_LABELS = {
  backend: 'Backend API',
  frontend: 'Frontend web application',
  mobile: 'Mobile application',
  fullstack: 'Full-stack application',
  cli: 'Command-line tool',
  library: 'Library or package',
};
// npm strips these dotfiles from published packages, so templates store them with a prefix.
const RENAMED_FILES = { _gitignore: '.gitignore', _npmrc: '.npmrc' };
const LANGUAGE_ALIASES = { ts: 'typescript', js: 'javascript', py: 'python' };
const TEXT_EXTENSIONS = new Set([
  '.cjs',
  '.conf',
  '.css',
  '.csv',
  '.dart',
  '.editorconfig',
  '.env',
  '.example',
  '.gitignore',
  '.html',
  '.htm',
  '.ini',
  '.js',
  '.json',
  '.jsx',
  '.md',
  '.mjs',
  '.mts',
  '.cts',
  '.nvmrc',
  '.prisma',
  '.prettierignore',
  '.properties',
  '.sh',
  '.svg',
  '.toml',
  '.ts',
  '.tsx',
  '.txt',
  '.xml',
  '.yaml',
  '.yml',
]);
const TEXT_FILENAMES = new Set([
  '.dockerignore',
  '.env.example',
  '.gitattributes',
  '.gitignore',
  '.npmrc',
  '.prettierignore',
  'Dockerfile',
  'LICENSE',
]);

function languageSlug(name) {
  const slug = String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  return LANGUAGE_ALIASES[slug] || slug;
}

function templatesRoot() {
  return path.resolve(__dirname, '..', 'templates');
}

function usage() {
  return `Usage: init-proj <template> <project-name> [options]

Options:
  --lang <language>    typescript (ts), javascript (js), dart, ... (must be supported by the template)
  --pm <manager>       npm, pnpm, yarn, or bun (also: --pm=pnpm)
  --git / --no-git     Initialize or skip a Git repository
  --install            Install dependencies without asking
  --no-install         Skip dependency installation and post-install commands
  -y, --yes            Non-interactive mode; required arguments are still needed
  --list               List templates with their supported languages and rules
  -h, --help           Show this help

Examples:
  init-proj
  init-proj node-express my-api --lang ts --pm pnpm --git
  init-proj react-next my-site --lang js
  init-proj expo my-app --lang typescript --no-install
  init-proj flutter my_app
  init-proj nest-prisma my-api -y`;
}

function parseArgs(argv) {
  const result = {
    positionals: [],
    git: undefined,
    install: undefined,
    yes: false,
    list: false,
    help: false,
    pm: undefined,
    language: undefined,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--') {
      result.positionals.push(...argv.slice(index + 1));
      break;
    }
    if (arg === '--list') result.list = true;
    else if (arg === '--help' || arg === '-h') result.help = true;
    else if (arg === '--git') result.git = true;
    else if (arg === '--no-git') result.git = false;
    else if (arg === '--no-install') result.install = false;
    else if (arg === '--install') result.install = true;
    else if (arg === '--yes' || arg === '-y') result.yes = true;
    else if (arg === '--lang' || arg === '--language') {
      index += 1;
      if (!argv[index]) throw new Error('--lang requires a language.');
      result.language = languageSlug(argv[index]);
    } else if (arg.startsWith('--lang=')) {
      result.language = languageSlug(arg.slice('--lang='.length));
    } else if (arg === '--pm') {
      index += 1;
      if (!argv[index]) throw new Error('--pm requires a package manager.');
      result.pm = argv[index];
    } else if (arg.startsWith('--pm=')) {
      result.pm = arg.slice('--pm='.length);
    } else if (arg.startsWith('-')) {
      throw new Error(`Unknown option: ${arg}`);
    } else {
      result.positionals.push(arg);
    }
  }

  if (result.positionals.length > 2) {
    throw new Error('Too many positional arguments.');
  }
  if (result.pm !== undefined && !PACKAGE_MANAGERS.includes(result.pm)) {
    throw new Error(
      `Unsupported package manager '${result.pm}'. Choose ${PACKAGE_MANAGERS.join(', ')}.`,
    );
  }
  return result;
}

function detectPackageManager(env = process.env) {
  const userAgent = env.npm_config_user_agent || '';
  const manager = userAgent.split('/')[0];
  return PACKAGE_MANAGERS.includes(manager) ? manager : 'npm';
}

function listTemplates() {
  const root = templatesRoot();
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('_'))
    .filter((entry) => fs.existsSync(path.join(root, entry.name, '_structure.json')))
    .map((entry) => {
      const config = loadConfig(entry.name);
      return {
        name: entry.name,
        description: config.description || '',
        projectType: config.projectType || 'other',
        languages: config.languages,
        language: config.languages[0],
        framework: config.framework || entry.name,
        ecosystem: config.ecosystem,
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

function asCommandArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function loadConfig(name, seen = new Set()) {
  if (seen.has(name)) throw new Error(`Circular template inheritance involving '${name}'.`);
  seen.add(name);

  const root = templatesRoot();
  const directory = path.resolve(root, name);
  if (directory !== root && !directory.startsWith(`${root}${path.sep}`)) {
    throw new Error(`Invalid template path '${name}'.`);
  }
  const configPath = path.join(directory, '_structure.json');
  if (!fs.existsSync(configPath)) throw new Error(`Template '${name}' has no _structure.json.`);

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const parent = config.extends ? loadConfig(config.extends, seen) : {};
  const languages = config.languages ||
    (config.language ? [config.language] : parent.languages) || ['JavaScript'];
  const merged = {
    ...parent,
    ...config,
    languages,
    language: languages[0],
    ecosystem: config.ecosystem || parent.ecosystem || 'node',
    rules: { ...(parent.rules || {}), ...(config.rules || {}) },
    exclude: [...new Set([...(parent.exclude || []), ...(config.exclude || [])])],
    bootstrap: [...asCommandArray(parent.bootstrap), ...asCommandArray(config.bootstrap)],
    directories: [...new Set([...(parent.directories || []), ...(config.directories || [])])],
    postInstall: [...asCommandArray(parent.postInstall), ...asCommandArray(config.postInstall)],
    nextSteps:
      config.nextSteps === undefined ? parent.nextSteps || [] : asCommandArray(config.nextSteps),
    audit: config.audit === undefined ? parent.audit : config.audit,
  };
  seen.delete(name);
  return merged;
}

function validateProjectName(name) {
  if (!name || !/^[a-z0-9-_]+$/i.test(name)) {
    throw new Error('Project name may contain only letters, numbers, hyphens, and underscores.');
  }
}

// Compatibility rules: a template only supports the languages it declares.
function resolveLanguage(config, requested, templateName) {
  if (!requested) return config.languages[0];
  const match = config.languages.find(
    (language) => languageSlug(language) === languageSlug(requested),
  );
  if (!match) {
    throw new Error(
      `'${templateName}' does not support ${requested}. Supported language(s): ${config.languages.join(', ')}.`,
    );
  }
  return match;
}

function commandExists(command) {
  const probe = process.platform === 'win32' ? 'where' : 'which';
  return spawnSync(probe, [command], { stdio: 'ignore' }).status === 0;
}

function missingRequirements(config, exists = commandExists) {
  return ((config.rules && config.rules.requires) || []).filter((item) => !exists(item.command));
}

function buildVariables({ projectName, pm, language }) {
  const words = projectName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const dartName = /^[a-z]/.test(words) ? words : `app_${words}`;
  const identifier = dartName.replace(/_/g, '');
  return {
    projectName,
    pm,
    language: languageSlug(language),
    languageName: language,
    dartName,
    identifier,
  };
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// Deep-merges language/pm layers into an existing package.json. null deletes a key.
function mergeJson(base, extra) {
  if (Array.isArray(base) && Array.isArray(extra)) return [...new Set([...base, ...extra])];
  if (isPlainObject(base) && isPlainObject(extra)) {
    const output = { ...base };
    for (const [key, value] of Object.entries(extra)) {
      if (value === null) delete output[key];
      else output[key] = key in base ? mergeJson(base[key], value) : value;
    }
    return output;
  }
  return extra;
}

function sortDependencyBlocks(pkg) {
  for (const block of ['dependencies', 'devDependencies']) {
    if (pkg[block])
      pkg[block] = Object.fromEntries(
        Object.entries(pkg[block]).sort(([a], [b]) => a.localeCompare(b)),
      );
  }
  return pkg;
}

function safeDestination(base, relativePath) {
  const destination = path.resolve(base, relativePath);
  if (destination !== base && !destination.startsWith(`${base}${path.sep}`)) {
    throw new Error(`Template path escapes the destination: ${relativePath}`);
  }
  return destination;
}

function isTextFile(filename, buffer) {
  if (buffer.includes(0)) return false;
  const extension = path.extname(filename).toLowerCase();
  return TEXT_FILENAMES.has(filename) || TEXT_EXTENSIONS.has(extension) || extension === '';
}

function renderVariables(content, variables) {
  let output = content;
  for (const [key, value] of Object.entries(variables)) {
    if (value !== undefined) output = output.split(`{{${key}}}`).join(String(value));
  }
  return output;
}

function copyRecursive(source, destination, variables) {
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    if (entry.isSymbolicLink())
      throw new Error(`Symbolic links are not supported in templates: ${entry.name}`);

    const sourcePath = path.join(source, entry.name);
    const outputName = RENAMED_FILES[entry.name] || entry.name;
    const destinationPath = path.join(destination, outputName);

    if (entry.isDirectory()) {
      fs.mkdirSync(destinationPath, { recursive: true });
      copyRecursive(sourcePath, destinationPath, variables);
      continue;
    }

    const buffer = fs.readFileSync(sourcePath);
    if (isTextFile(entry.name, buffer)) {
      const content = renderVariables(buffer.toString('utf8'), variables);
      if (entry.name === 'package.json' && fs.existsSync(destinationPath)) {
        const merged = mergeJson(
          JSON.parse(fs.readFileSync(destinationPath, 'utf8')),
          JSON.parse(content),
        );
        fs.writeFileSync(
          destinationPath,
          `${JSON.stringify(sortDependencyBlocks(merged), null, 2)}\n`,
        );
      } else {
        fs.writeFileSync(destinationPath, content);
      }
    } else {
      fs.copyFileSync(sourcePath, destinationPath);
    }

    if (destinationPath.includes(`${path.sep}.husky${path.sep}`)) {
      fs.chmodSync(destinationPath, 0o755);
    }
  }
}

// Layer order per template: files/ -> languages/<lang>/files/ -> pm/<pm>/files/.
// Parents are applied first, so children can override or (for package.json) merge.
function copyTemplateFiles(name, targetDirectory, variables, selection, seen = new Set()) {
  if (seen.has(name)) throw new Error(`Circular template inheritance involving '${name}'.`);
  seen.add(name);
  const directory = path.join(templatesRoot(), name);
  const config = JSON.parse(fs.readFileSync(path.join(directory, '_structure.json'), 'utf8'));
  if (config.extends)
    copyTemplateFiles(config.extends, targetDirectory, variables, selection, seen);

  const layers = [
    path.join(directory, 'files'),
    path.join(directory, 'languages', selection.language, 'files'),
    path.join(directory, 'pm', selection.pm || 'none', 'files'),
  ];
  for (const layer of layers) {
    if (fs.existsSync(layer)) copyRecursive(layer, targetDirectory, variables);
  }
  seen.delete(name);
}

function applyExcludes(targetDirectory, excludes) {
  for (const relativePath of excludes) {
    fs.rmSync(safeDestination(targetDirectory, relativePath), {
      recursive: true,
      force: true,
    });
  }
}

function canPrompt(options) {
  return !options.yes && !process.env.CI && process.stdin.isTTY && process.stdout.isTTY;
}

async function collectInteractive(values, templates) {
  const prompts = await import('@clack/prompts');
  prompts.intro('Create a new project');
  prompts.note(
    'Answer a few questions to configure your project.\nUse the arrow keys to move, Enter to select, and Ctrl+C to cancel.',
    'Project setup wizard',
  );

  const check = (value) => {
    if (prompts.isCancel(value)) {
      prompts.cancel('Project creation cancelled.');
      throw new Error('Operation cancelled.');
    }
    return value;
  };
  const unique = (items) => [...new Set(items)];
  const typeLabel = (type) => PROJECT_TYPE_LABELS[type] || type;
  const supports = (template, language) =>
    template.languages.some((item) => languageSlug(item) === languageSlug(language));

  if (!values.template) {
    const projectType = check(
      await prompts.select({
        message: 'What type of project do you want to create?',
        options: unique(templates.map((template) => template.projectType)).map((type) => ({
          value: type,
          label: typeLabel(type),
        })),
      }),
    );

    const typeTemplates = templates.filter((template) => template.projectType === projectType);
    const languages = unique(typeTemplates.flatMap((template) => template.languages));
    let language;
    if (values.language) {
      language = languages.find((item) => languageSlug(item) === languageSlug(values.language));
      if (!language) {
        throw new Error(
          `No ${typeLabel(projectType).toLowerCase()} template supports '${values.language}'. Available: ${languages.join(', ')}.`,
        );
      }
    } else if (languages.length === 1) {
      language = languages[0];
    } else {
      language = check(
        await prompts.select({
          message: 'Which language do you want to use?',
          options: languages.map((name) => ({ value: name, label: name })),
        }),
      );
    }
    values.language = language;

    // Only frameworks that support the chosen language are offered (the compatibility rule).
    const languageTemplates = typeTemplates.filter((template) => supports(template, language));
    values.template = check(
      await prompts.select({
        message: 'Which framework or stack do you want to use?',
        options: languageTemplates.map((template) => ({
          value: template.name,
          label: template.framework,
          hint: template.description,
        })),
      }),
    );
  }

  const selected = templates.find((template) => template.name === values.template);
  if (!selected) {
    throw new Error(
      `Unknown template '${values.template}'. Run init-proj --list to see available templates.`,
    );
  }

  if (!values.language && selected.languages.length > 1) {
    values.language = check(
      await prompts.select({
        message: `Which language should ${selected.framework} use?`,
        options: selected.languages.map((name) => ({
          value: name,
          label: name,
        })),
      }),
    );
  }

  if (!values.projectName) {
    values.projectName = check(
      await prompts.text({
        message: 'What is your project name?',
        placeholder: 'my-project',
        validate: (value) => {
          if (!/^[a-z0-9-_]+$/i.test(value || '')) {
            return 'Use only letters, numbers, hyphens, and underscores.';
          }
          if (fs.existsSync(path.resolve(values.cwd, value)))
            return 'That directory already exists.';
          return undefined;
        },
      }),
    );
  }

  if (selected.ecosystem === 'node' && !values.pm) {
    values.pm = check(
      await prompts.select({
        message: 'Which package manager do you want to use?',
        initialValue: detectPackageManager(),
        options: PACKAGE_MANAGERS.map((manager) => ({
          value: manager,
          label: manager,
        })),
      }),
    );
  }

  if (values.git === undefined) {
    values.git = check(
      await prompts.confirm({
        message: 'Initialize a Git repository?',
        initialValue: true,
      }),
    );
  }

  if (values.install === undefined) {
    values.install = check(
      await prompts.confirm({
        message: 'Install dependencies now?',
        initialValue: true,
      }),
    );
  }

  const chosenLanguage = values.language
    ? selected.languages.find((item) => languageSlug(item) === languageSlug(values.language)) ||
      values.language
    : selected.language;
  prompts.note(
    [
      `Project type:  ${typeLabel(selected.projectType)}`,
      `Language:      ${chosenLanguage}`,
      `Framework:     ${selected.framework}`,
      `Project name:  ${values.projectName}`,
      ...(selected.ecosystem === 'node' ? [`Installer:     ${values.pm}`] : []),
      `Git:           ${values.git ? 'yes' : 'no'}`,
      `Install now:   ${values.install ? 'yes' : 'no'}`,
    ].join('\n'),
    'Review your project',
  );
  const confirmed = check(
    await prompts.confirm({
      message: 'Create this project?',
      initialValue: true,
    }),
  );
  if (!confirmed) {
    prompts.cancel('Project creation cancelled. No files were created.');
    throw new Error('Operation cancelled.');
  }

  prompts.outro('Creating your project...');
  return values;
}

function runCommand(command, cwd, allowFailure = false) {
  console.log(`\n> ${command}`);
  try {
    execSync(command, { cwd, stdio: 'inherit' });
  } catch (error) {
    if (allowFailure) {
      console.warn(`Warning: audit command failed; project creation will continue.`);
      return;
    }
    throw new Error(`Command failed in ${cwd}: ${command}`, { cause: error });
  }
}

function generateProject({ template, projectName, pm, language, git, install, cwd }) {
  validateProjectName(projectName);

  const templates = listTemplates().map((item) => item.name);
  if (!templates.includes(template)) {
    throw new Error(
      `Unknown template '${template}'. Run init-proj --list to see available templates.`,
    );
  }

  const config = loadConfig(template);
  const resolvedLanguage = resolveLanguage(config, language, template);

  const isNode = config.ecosystem === 'node';
  const resolvedPm = isNode ? pm || detectPackageManager() : pm || 'npm';
  if (isNode) {
    if (!PACKAGE_MANAGERS.includes(resolvedPm)) {
      throw new Error(`Unsupported package manager '${resolvedPm}'.`);
    }
    const allowed = config.rules && config.rules.packageManagers;
    if (allowed && !allowed.includes(resolvedPm)) {
      throw new Error(`'${template}' supports only these package managers: ${allowed.join(', ')}.`);
    }
  }

  if (install) {
    const missing = missingRequirements(config);
    if (missing.length) {
      const lines = missing.map(
        (item) => `  - ${item.command}${item.hint ? `: ${item.hint}` : ''}`,
      );
      throw new Error(
        `'${template}' needs tools that are not installed:\n${lines.join('\n')}\nInstall them, or re-run with --no-install to only copy the files.`,
      );
    }
  }

  const targetDirectory = path.resolve(cwd, projectName);
  if (fs.existsSync(targetDirectory)) throw new Error(`Directory '${projectName}' already exists.`);

  const variables = buildVariables({
    projectName,
    pm: resolvedPm,
    language: resolvedLanguage,
  });
  fs.mkdirSync(targetDirectory, { recursive: true });

  // Generators such as `flutter create` run first, so template files can refine their output.
  if (install) {
    for (const command of config.bootstrap) {
      runCommand(renderVariables(command, variables), targetDirectory);
    }
  }

  for (const directory of config.directories) {
    fs.mkdirSync(safeDestination(targetDirectory, directory), {
      recursive: true,
    });
  }
  copyTemplateFiles(template, targetDirectory, variables, {
    language: variables.language,
    pm: isNode ? resolvedPm : undefined,
  });
  applyExcludes(targetDirectory, config.exclude);

  if (git) {
    console.log('\nInitializing Git repository...');
    execFileSync('git', ['init', '--initial-branch=main'], {
      cwd: targetDirectory,
      stdio: 'inherit',
    });
  }

  if (install) {
    for (const command of config.postInstall) {
      runCommand(renderVariables(command, variables), targetDirectory);
    }
    if (config.audit) runCommand(renderVariables(config.audit, variables), targetDirectory, true);
  }

  console.log(`\nSuccessfully initialized ${projectName} using ${template} (${resolvedLanguage}).`);
  if (!install && config.bootstrap.length) {
    console.log('\nDependency installation was skipped. Run these first:');
    for (const command of [...config.bootstrap, ...config.postInstall]) {
      console.log(`  ${renderVariables(command, variables)}`);
    }
  }
  if (config.nextSteps.length) {
    console.log('\nNext steps:');
    for (const step of config.nextSteps) {
      console.log(`  ${renderVariables(step, variables)}`);
    }
  }
  return targetDirectory;
}

async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    console.log(usage());
    return;
  }

  const templates = listTemplates();
  if (options.list) {
    const width = (key, min) => Math.max(min, ...templates.map((item) => String(item[key]).length));
    const nameWidth = width('name', 8);
    const typeWidth = 10;
    console.log(
      `${'TEMPLATE'.padEnd(nameWidth)}  ${'TYPE'.padEnd(typeWidth)}  ${'LANGUAGES'.padEnd(22)}  DESCRIPTION`,
    );
    for (const template of templates) {
      console.log(
        `${template.name.padEnd(nameWidth)}  ${template.projectType.padEnd(typeWidth)}  ${template.languages.join(', ').padEnd(22)}  ${template.description}`,
      );
    }
    console.log(
      '\nA template only accepts the languages listed for it (for example, NestJS is TypeScript-only).',
    );
    return;
  }

  const values = {
    template: options.positionals[0],
    projectName: options.positionals[1],
    pm: options.pm,
    language: options.language,
    git: options.git,
    install: options.install,
    cwd: process.cwd(),
  };

  if (canPrompt(options)) {
    await collectInteractive(values, templates);
  } else {
    if (!values.template || !values.projectName) {
      console.error('Template and project name are required in non-interactive mode.\n');
      console.error(usage());
      process.exitCode = 1;
      return;
    }
    values.pm = values.pm || detectPackageManager();
    values.git = values.git ?? false;
    values.install = values.install ?? true;
  }

  generateProject({
    ...values,
    cwd: values.cwd,
  });
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`\nError: ${error.message}`);
    if (process.env.DEBUG && error.stack) console.error(error.stack);
    process.exitCode = 1;
  });
}

module.exports = {
  detectPackageManager,
  generateProject,
  languageSlug,
  listTemplates,
  loadConfig,
  mergeJson,
  missingRequirements,
  parseArgs,
  resolveLanguage,
  validateProjectName,
};
