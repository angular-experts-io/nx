import * as inquirer from 'inquirer';
import { organizeImports } from 'import-conductor';
import { moveGenerator } from '@nrwl/workspace/generators';
import { applicationGenerator } from '@nrwl/angular/generators';
import {
  formatFiles,
  installPackagesTask,
  Tree,
  updateJson,
} from '@nrwl/devkit';

import updateModuleBoundaries from '../module-boundaries-update/generator';
import {createConfigFileIfNonExisting, getContexts} from "../config/config.helper";

import { AppGeneratorOptions } from './schema';

export default async function generateWorkspaceApp(
  tree: Tree,
  schema: AppGeneratorOptions
): Promise<() => void> {
  await createConfigFileIfNonExisting(tree);
  await promptMissingSchemaProperties(tree, schema);

  const { context, name, prefix } = schema;

  validateName(name);

  await applicationGenerator(tree, {
    name: `${context}/${name}`,
    style: 'scss',
    routing: true,
    tags: `context:${context},type:app`,
    standaloneConfig: true,
    prefix: `${prefix}-${context}`,
  });

  // TODO: why is this needed
  await moveGenerator(tree, {
    destination: `${context}/${name}-e2e`,
    projectName: `${context}-${name}-e2e`,
    updateImportPath: true,
  });

  await updateProjectTags(tree, context, name);
  await updatePackageJSONScripts(tree, context, name);
  await updateModuleBoundaries(tree, { context, scope: `${name}` });

  removeInitialNavigationConfig(tree, context, name);
  removeWelcomeComponent(tree, context, name);

  await formatFiles(tree);
  await organizeAppModuleImportStatements(tree, context, name);

  return () => {
    installPackagesTask(tree);
  };
}

async function promptMissingSchemaProperties(
  tree: Tree,
  schema: AppGeneratorOptions
): Promise<void> {
  if (!schema.context) {
    schema.context = (
      await inquirer.prompt([
        {
          type: 'list',
          name: 'context',
          message: 'What context does your application belong to?',
          choices: await getContexts(tree),
        },
      ])
    ).context;
  }
  if (!schema.name) {
    schema.name = (
      await inquirer.prompt([
        {
          type: 'input',
          name: 'name',
          message: 'What is the application name?',
        },
      ])
    ).name;
  }

  // TODO this should probably come from the config
  if (!schema.prefix) {
    schema.prefix = (
      await inquirer.prompt([
        {
          type: 'input',
          name: 'prefix',
          message: 'Which prefix should be used?',
        },
      ])
    ).prefix;
  }
}

function validateName(name: string): void {
  if (name.includes(' ')) {
    console.log('Hier');
    throw new Error(
      `The app name "${name}" should not contain spaces. Please use "-" instead.`
    );
  }

  if (name.endsWith('-')) {
    throw new Error(`The app name "${name}" should not end with "-"`);
  }
}

function removeInitialNavigationConfig(
  tree: Tree,
  context: string,
  name: string
): void {
  const modulePath = `apps/${context}/${name}/src/app/app.module.ts`;
  let moduleContent = tree.read(modulePath).toString();
  moduleContent = moduleContent.replace(
    ", { initialNavigation: 'enabledBlocking' }",
    ''
  );
  tree.write(modulePath, moduleContent);
}

function removeWelcomeComponent(tree: Tree, context: string, name: string): void {
  // TODO - also remove it from the declarations array in AppModule
  const srcPath = `apps/${context}/${name}/src/app/`;
  tree.delete(`${srcPath}nx-welcome.component.ts`);

  const modulePath = `${srcPath}/app.module.ts`;
  let moduleContent = tree.read(modulePath).toString();
  moduleContent = moduleContent.replace(', NxWelcomeComponent', '');
  moduleContent = moduleContent.replace(
    "import { NxWelcomeComponent } from './nx-welcome.component';",
    ''
  );
  tree.write(modulePath, moduleContent);

  const htmlPath = `${srcPath}/app.component.html`;
  const htmlContent = `
    <h1>Welcome ${context}-${name}</h1>
    <router-outlet></router-outlet>
 `;
  tree.write(htmlPath, htmlContent);

  const specPath = `${srcPath}/app.component.spec.ts`;
  let specContent = tree.read(specPath).toString();
  specContent = specContent.replace(', NxWelcomeComponent', '');
  specContent = specContent.replace(
    "import { NxWelcomeComponent } from './nx-welcome.component';",
    ''
  );
  tree.write(specPath, specContent);
}

async function updateProjectTags(tree: Tree, context: string, name: string): Promise<void> {
  await updateJson(
    tree,
    `apps/${context}/${name}-e2e/project.json`,
    (projectJson) => {
      projectJson.tags = [`context:${context}`, 'type:e2e'];
      return projectJson;
    }
  );
}

export async function updatePackageJSONScripts(
  tree: Tree,
  context: string,
  name: string
): Promise<void> {
  const projectName = `${context}-${name}`;
  await updateJson(tree, `package.json`, (packageJson) => {
    if (!packageJson.scripts) {
      packageJson.scripts = {};
    }
    packageJson.scripts[
      `serve:${projectName}:app`
    ] = `nx serve --project ${projectName} -o`;
    packageJson.scripts[
      `build:${projectName}`
    ] = `nx build --project ${projectName}`;
    packageJson.scripts[
      `analyze:${projectName}`
    ] = `nx build --project ${projectName} --stats-json && webpack-bundle-analyzer dist/apps/${context}/${name}/stats.json`;
    packageJson.scripts[
      `lint:${projectName}`
    ] = `nx lint --project ${projectName} && nx stylelint --project ${projectName} --fix`;
    packageJson.scripts[
      `test:${projectName}`
    ] = `nx test --project ${projectName}`;
    packageJson.scripts[
      `e2e:${projectName}`
    ] = `nx e2e --project ${projectName}-e2e`;
    return packageJson;
  });
}

async function organizeAppModuleImportStatements(
  tree: Tree,
  context: string,
  name: string
): Promise<void> {
  const modulePath = `apps/${context}/${name}/src/app/app.module.ts`;
  const appModuleContent = tree.read(modulePath).toString();
  const appModuleContentWithOrganizedImports = await organizeImports(
    appModuleContent
  );
  tree.write(modulePath, appModuleContentWithOrganizedImports);
}
