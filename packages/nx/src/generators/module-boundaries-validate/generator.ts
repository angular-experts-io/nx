import * as chalk from 'chalk';
import { formatFiles, readJson, Tree, updateJson } from '@nrwl/devkit';

import { diff } from '../utils/list';

import { ModuleBoundariesValidateGeneratorOptions } from './schema';

export interface Project {
  name: string;
  path: string;
}

export interface Result {
  violations: string[];
  fixes: string[];
}


export default async function validateModuleBoundaries(
  tree: Tree,
  schema: ModuleBoundariesValidateGeneratorOptions
) {
  const { fix } = schema;

  const projects = await getProjects(tree);
  const aggregateViolations = [];
  const aggregateFixes = [];

  for (const project of projects) {
    const result = await validateProjectTagsMatchProjectLocation(
      tree,
      project,
      fix
    );
    const { violations, fixes } = result;
    aggregateFixes.push(...fixes);
    aggregateViolations.push(...violations);
  }

  aggregateViolations.push(
    ...(await validateEslintEnforceModuleBoundariesMatchesFolderStructure(tree))
  );

  if (aggregateFixes.filter(Boolean)?.length > 0) {
    console.info(chalk.green.bold(aggregateFixes.join('\n\n'), '\n\n'));
    await formatFiles(tree);
  }
  return () => {
    if (aggregateViolations.filter(Boolean)?.length > 0) {
      if (aggregateFixes.filter(Boolean)?.length > 0) {
        console.log('\n');
      }
      console.error(chalk.red.bold(aggregateViolations.join('\n\n'), '\n\n'));
      throw new Error('Module boundaries validation failed');
    }
  };
}

async function validateProjectTagsMatchProjectLocation(
  tree: Tree,
  project: Project,
  fix = false
): Promise<Result> {
  const { name, path } = project;
  const violations = [];
  const fixes = [];
  const [appsOrLibs, context, scopeOrName, type] = path.split('/');
  const projectJson = await readJson(tree, `${path}/project.json`);
  const tags: string[] = projectJson?.tags ?? [];
  const expectedTags = [`context:${context}`];

  if (appsOrLibs === 'apps') {
    expectedTags.push(`type:${scopeOrName.endsWith('-e2e') ? 'e2e' : 'app'}`);
  } else {
    expectedTags.push(`scope:${scopeOrName}`);
    expectedTags.push(`type:${type}`);
  }

  const tagsDiff = diff(tags, expectedTags);
  if (tagsDiffer(expectedTags, tags)) {
    if (fix) {
      projectJson.tags = expectedTags;
      fixes.push(`${chalk.inverse(
        'FIX'
      )} Project ${name} (${appsOrLibs}) and its project.json was updated with
new tags:      ${chalk.inverse(expectedTags.join(','))}
original tags: ${tags.join(',')}`);
      updateJson(tree, `${path}/project.json`, (json) => {
        json.tags = expectedTags;
        return json;
      });
    } else {
      violations.push(`Project ${name} (${appsOrLibs}) has a project.json with tags that do not match its location.
Expected:   ${expectedTags.join(', ')}
Actual:     ${tags.join(', ')}
Difference: ${chalk.inverse(tagsDiff.join(', '))}`);
    }
  }
  return {
    violations,
    fixes,
  };
}

async function validateEslintEnforceModuleBoundariesMatchesFolderStructure(
  tree: Tree
): Promise<string[]> {
  const violations = [];
  const moduleBoundaries = await getModuleBoundaries(tree);
  const relevantBoundaries = moduleBoundaries.filter((item) =>
    ['context:', 'scope:'].some((prefix) => item.sourceTag.startsWith(prefix))
  );
  const contexts = Array.from(
    new Set(
      relevantBoundaries
        .filter((item) => item.sourceTag.startsWith('context:'))
        .map((item) => item.sourceTag.split(':')[1])
    )
  );
  const scopes = Array.from(
    new Set(
      relevantBoundaries
        .filter((item) => item.sourceTag.startsWith('scope:'))
        .map((item) => item.sourceTag.split(':')[1])
    )
  );

  const contextApps = getFoldersFromTheeForDepth(tree, './apps', 0);
  const contextLibs = getFoldersFromTheeForDepth(tree, './libs', 0);
  const contextDirs = Array.from(new Set([...contextApps, ...contextLibs]));
  const contextDiff = diff(contexts, contextDirs);
  if (JSON.stringify(contextDirs.sort()) !== JSON.stringify(contexts.sort())) {
    violations.push(`Contexts (definitions): ${contexts.join(', ')}
Folder structure:       ${contextDirs.join(', ')}
Difference:             ${chalk.inverse(contextDiff.join(', '))}`);
  }
  const scopeApps = getFoldersFromTheeForDepth(tree, './apps', 1);
  const scopeLibs = getFoldersFromTheeForDepth(tree, './libs', 1);
  const scopeDirs = Array.from(new Set([...scopeApps, ...scopeLibs])).filter(
    (scope) => scope.endsWith('-rwc')
  );
  const scopeDiff = diff(scopes, scopeDirs);
  if (JSON.stringify(scopeDirs.sort()) !== JSON.stringify(scopes.sort())) {
    violations.push(`Scopes (definitions):   ${scopes.join(', ')}
Folder structure:       ${scopeDirs.join(', ')}
Difference:             ${chalk.inverse(scopeDiff.join(', '))}`);
  }

  if (violations.length > 0) {
    violations.unshift(
      `Enforce module boundaries definitions in ".eslintrc.json" are out of sync with the workspace folder structure, please resolve the conflict by adjusting rules or removing redundant folders.`
    );
  }
  return violations;
}

async function getModuleBoundaries(tree: Tree) {
  const ENFORCE_MODULE_BOUNDARIES = '@nrwl/nx/enforce-module-boundaries';
  const eslintJson = await readJson(tree, './.eslintrc.json');
  const boundaries = eslintJson?.overrides.find(
    (o) => o?.rules?.[ENFORCE_MODULE_BOUNDARIES]
  )?.rules?.[ENFORCE_MODULE_BOUNDARIES]?.[1]?.depConstraints;
  if (!boundaries) {
    throw new Error(
      `The definition for eslint rule "'@nrwl/nx/enforce-module-boundaries'" not found in the root .eslintrc.json, it should be the first item in the "overrides" array`
    );
  }
  return boundaries;
}

function getFoldersFromTheeForDepth(
  tree: Tree,
  path: string,
  maxDepth: number,
  results: string[] = []
) {
  const IGNORE = ['.gitkeep'];
  const folders = tree
    .children(path)
    .filter(
      (path) =>
        !IGNORE.some((ignore) => path.includes(ignore)) && !tree.isFile(path)
    );

  if (maxDepth > 0) {
    for (const folder of folders) {
      getFoldersFromTheeForDepth(
        tree,
        `${path}/${folder}`,
        maxDepth - 1,
        results
      );
    }
  } else {
    results.push(...folders);
  }
  return results;
}

async function getProjects(tree: Tree): Promise<Project[]> {
  const projectsRaw = (await readJson(tree, 'angular.json')?.projects) ?? {};
  return Object.keys(projectsRaw).map((key) => ({
    name: key,
    path: projectsRaw[key],
  }));
}

function tagsDiffer(expectedTags: string[], tags: string[]) {
  return JSON.stringify(expectedTags.sort()) !== JSON.stringify(tags.sort());
}

