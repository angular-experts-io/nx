import * as chalk from 'chalk';
import * as inquirer from 'inquirer';
import {formatFiles, installPackagesTask, Tree, updateJson,} from '@nrwl/devkit';
import {libraryGenerator} from '@nrwl/workspace/generators';
import {libraryGenerator as angularLibraryGenerator, ngrxGenerator} from '@nrwl/angular/generators';

import {angularComponentGenerator, DEFAULT_ANGULAR_GENERATOR_COMPONENT_OPTIONS,} from '../utils/generators-angular';
import {getAvailableScopeTypes, ScopeType} from '../model/scope-type';
import {AVAILABLE_LIBRARY_TYPES, LibraryType} from '../model/library-type';
import {camelCase, pascalCase, snakeCase} from '../utils/string';
import {applicationPrompt} from '../prompts/application.prompt';

import moduleBoundariesUpdate from '../module-boundaries-update/generator';
import {createConfigFileIfNonExisting, getAppSuffix, getContexts, getPrefix} from "../config/config.helper";

import {LibGeneratorOptions} from './schema';

export default async function generateWorkspaceLibrary(
  tree: Tree,
  schema: LibGeneratorOptions
) {
  await createConfigFileIfNonExisting(tree);
  await promptMissingSchemaProperties(schema, tree);
  validateOptions(schema, tree);

  const {context, scopeType, scopeAppSpecific, type, name} = schema;
  const prefix = getPrefix(tree);
  const selectedGenerator = [LibraryType.MODEL, LibraryType.UTIL_FN].includes(
    type
  )
    ? libraryGenerator
    : angularLibraryGenerator;
  const libraryPrefix = `${prefix}-${context}`;
  const scope =
    scopeType === ScopeType.APP_SPECIFIC ? scopeAppSpecific : scopeType;
  const path = `${context}/${scope}/${type}/${name}`;
  const packageName = `${prefix}/${path.replace(/\//g, '-')}`;
  const project = `${context}-${scope}-${type}-${name}`;
  const isAppSpecificLazyFeature =
    scopeType === ScopeType.APP_SPECIFIC && type === LibraryType.FEATURE;

  // create schema
  // eslint-disable-next-line
  const enrichedSchema: any = {
    // standard
    strict: true,
    buildable: true,
    standaloneConfig: true,

    // lib specific
    name: path,
    tags: `context:${context},scope:${scope},type:${type}`,
    prefix: libraryPrefix,
  };
  if (type === LibraryType.FEATURE) {
    enrichedSchema.routing = true;
  }
  if (type === LibraryType.UTIL) {
    enrichedSchema.skipModule = true;
  }
  if (isAppSpecificLazyFeature) {
    enrichedSchema.lazy = true;
    enrichedSchema.parentModule = `apps/${context}/${scope}/src/app/app.module.ts`;
  }

  // generate lib
  await selectedGenerator(tree, enrichedSchema);

  // conditionally generate additional files
  await generateInitialLibStructure(tree, {
    type,
    project,
    prefix: libraryPrefix,
    path,
    name,
    context,
    scopeAppSpecific,
  });

  // adjust generated files
  if (isAppSpecificLazyFeature) {
    const parentModuleFilePath = `apps/${context}/${scope}/src/app/app.module.ts`;
    const parentModuleFileContent = tree.read(parentModuleFilePath).toString();

    tree.write(
      parentModuleFilePath,
      parentModuleFileContent.replace(`${prefix}/${path}`, packageName)
    );
  }

  await updateJson(tree, `libs/${path}/package.json`, (pkgJson) => {
    pkgJson.name = packageName;
    return pkgJson;
  });

  await updateJson(tree, `tsconfig.base.json`, (tsconfig) => {
    delete tsconfig.compilerOptions.paths[`${prefix}/${path}`];
    tsconfig.compilerOptions.paths[packageName] = [`libs/${path}/src/index.ts`];
    return tsconfig;
  });

  await moduleBoundariesUpdate(tree, {context, scope, type});
  await formatFiles(tree);

  return () => {
    installPackagesTask(tree);

    // to be able to easily generate additional entities in the newly generated library
    console.log(`\nProject: --project ${project}\n`);
    console.log(
      `Can be used to generate additional components, service and other...`
    );
    console.log(`eg "nx g c <component-name> --project ${project}"`);
  };
}

async function generateInitialLibStructure(
  tree: Tree,
  options: {
    type: LibraryType;
    project: string;
    prefix: string;
    path: string;
    name: string;
    context: string;
    scopeAppSpecific?: string;
  }
) {
  const {type, prefix, project, path, name, context, scopeAppSpecific} =
    options;
  const moduleName = `${path.replace(/\//g, '-')}.module`;
  const selector = scopeAppSpecific
    ? `${prefix}-${scopeAppSpecific}-${name}`
    : `${prefix}-${name}`;

  if ([LibraryType.UI, LibraryType.PATTERN].includes(type)) {
    await angularComponentGenerator(tree, {
      ...DEFAULT_ANGULAR_GENERATOR_COMPONENT_OPTIONS,
      project,
      name,
      selector,
    });
    const indexTsPath = `libs/${path}/src/index.ts`;
    const updatedIndexTsContent = `${tree.read(
      indexTsPath
    )}export * from './lib/${name}/${name}.component';`;
    tree.write(indexTsPath, updatedIndexTsContent);
  }

  if (type === LibraryType.FEATURE) {
    await angularComponentGenerator(tree, {
      ...DEFAULT_ANGULAR_GENERATOR_COMPONENT_OPTIONS,
      project,
      name: `${name}-container`,
      module: moduleName,
      export: false,
      selector,
    });

    const modulePath = `libs/${path}/src/lib/${moduleName}.ts`;
    const moduleContent = tree.read(modulePath).toString();

    tree.write(
      modulePath,
      moduleContent.replace(
        /\/\*.*\*\//gi,
        `{ path: '', pathMatch: 'full', component: ${pascalCase(
          `${name}-container`
        )}Component }`
      )
    );
  }

  if (type === LibraryType.DATA_ACCESS) {
    await ngrxGenerator(tree, {
      name,
      module: `libs/${path}/src/lib/${moduleName}.ts`,
      directory: '+state',
      minimal: false,
      useDataPersistence: true,
    });

    prefixStateSlice(tree, path, context, scopeAppSpecific, name);
  }
  if (type === LibraryType.MODEL) {
    const modelFileName = `${path.replace(/\//g, '-')}`;
    const modelClassName = pascalCase(modelFileName);
    tree.delete(`libs/${path}/src/lib/${modelFileName}.spec.ts`);
    tree.write(
      `libs/${path}/src/lib/${modelFileName}.ts`,
      `export interface ${modelClassName} {}`
    );
    const indexTsPath = `libs/${path}/src/index.ts`;
    tree.write(indexTsPath, `export * from './lib/${modelFileName}';`);
  }
}

async function promptMissingSchemaProperties(
  schema: LibGeneratorOptions,
  tree: Tree
) {
  console.log(
    `Let's create a library, the final name will follow ${chalk.grey(
      '<prefix>/<context>-<scope>-<type>-<name>'
    )} pattern`
  );

  if (!schema.context) {
    schema.context = (
      await inquirer.prompt([
        {
          type: 'list',
          name: 'context',
          message: 'What context does your library belong to?',
          choices: getContexts(tree),
        },
      ])
    ).context;
  }

  if (!schema.scopeType) {
    schema.scopeType = (
      await inquirer.prompt([
        {
          type: 'list',
          name: 'scopeType',
          message: 'What scope does your library belong to?',
          choices: getAvailableScopeTypes(schema.context),
        },
      ])
    ).scopeType;
  }
  if (schema.scopeType === ScopeType.APP_SPECIFIC && !schema.scopeAppSpecific) {
    schema.scopeAppSpecific = await applicationPrompt(tree, schema.context);
  }
  if (!schema.type) {
    schema.type = (
      await inquirer.prompt([
        {
          type: 'list',
          name: 'type',
          message: 'What is the library type?',
          choices: AVAILABLE_LIBRARY_TYPES,
        },
      ])
    ).type;
  }
  if (!schema.name) {
    schema.name = (
      await inquirer.prompt([
        {
          type: 'input',
          name: 'name',
          message: 'What is the library name?',
        },
      ])
    ).name;
  }
}

function validateOptions(options: LibGeneratorOptions, tree: Tree) {
  const {scopeType, scopeAppSpecific, name} = options;
  if (name.includes(' ')) {
    throw new Error(
      `The lib name "${name}" should not contain spaces. Please use "-" instead.`
    );
  }

  const appSuffix = getAppSuffix(tree);
  if (
    scopeType === ScopeType.APP_SPECIFIC &&
    !scopeAppSpecific.endsWith(appSuffix)
  ) {
    throw new Error(
      `The app specific scope "${scopeAppSpecific}" must end with "${appSuffix}".`
    );
  }
}

function prefixStateSlice(
  tree: Tree,
  path: string,
  context: string,
  scopeAppSpecific: string,
  name: string
) {
  const reducerFilePath = `./libs/${path}/src/lib/+state/${name}.reducer.ts`;
  const reducerContent = tree.read(reducerFilePath);
  const updatedContent = reducerContent
    .toString()
    .replace(
      `export const ${snakeCase(name).toUpperCase()}_FEATURE_KEY = '${camelCase(name)}';`,
      `export const ${name.toUpperCase()}_FEATURE_KEY = '${context}${
        scopeAppSpecific ? `_${scopeAppSpecific}` : ''
      }_${name}';`
    );
  tree.write(reducerFilePath, updatedContent);
}
