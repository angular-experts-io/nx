import * as chalk from 'chalk';
import * as inquirer from 'inquirer';
import { organizeImports } from 'import-conductor';
import {
  Tree,
  formatFiles,
  installPackagesTask,
  updateJson,
  readProjectConfiguration,
  generateFiles,
  joinPathFragments,
} from '@nrwl/devkit';
import { moveGenerator } from '@nrwl/workspace/generators';
import { applicationGenerator } from '@nrwl/angular/generators';
// TODO do we want to go with stylelint?
/*
import { configurationGenerator, scssGenerator } from 'nx-stylelint';
*/

import moduleBoundariesUpdate from '../module-boundaries-update/generator';

import { AppGeneratorOptions } from './schema';
import { getContexts } from '../utils/context.util';

export default async function generateWorkspaceApp(
  tree: Tree,
  schema: AppGeneratorOptions
) {
  await promptMissingSchemaProperties(tree, schema);
  validateSchema(schema);

  const { context, name } = schema;
  const prefix = `mobi-${context}`;
  const path = `${context}/${name}-rwc`;
  const enrichedSchema = {
    name: path,
    style: 'scss' as any,
    routing: true,
    buildable: true,
    tags: `context:${context},type:app`,
    standaloneConfig: true,
    prefix,
  };
  const projectName = `${context}-${name}-rwc`;

  await applicationGenerator(tree, enrichedSchema);
  await moveGenerator(tree, {
    destination: `${context}/${name}-rwc-e2e`,
    projectName: `${context}-${name}-rwc-e2e`,
    updateImportPath: true,
  });

  removeInitialNavigationConfig(tree, context, name);
  removeWelcomeComponent(tree, context, name);
  importBrowserAnimationsModule(tree, context, name);

  generateRelevantFiles(tree, projectName);
  await updateProjectJson(tree, context, name, path);

  await updateJson(
    tree,
    `apps/${context}/${name}-rwc-e2e/project.json`,
    (projectJson) => {
      projectJson.tags = [`context:${context}`, 'type:e2e'];
      return projectJson;
    }
  );

  await updateJson(tree, `package.json`, (packageJson) => {
    packageJson.scripts[
      `serve:${projectName}`
    ] = `run-p -r auth-server serve:${projectName}:app`;
    packageJson.scripts[
      `serve:${projectName}:app`
    ] = `nx serve --project ${projectName} -o`;
    packageJson.scripts[
      `build:${projectName}`
    ] = `nx build --project ${projectName}`;
    packageJson.scripts[
      `analyze:${projectName}`
    ] = `nx build --project ${projectName} --stats-json && webpack-bundle-analyzer dist/apps/${context}/${name}-rwc/stats.json`;
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

  // await scssGenerator(tree, { project: projectName, skipFormat: true });

  await moduleBoundariesUpdate(tree, { context, scope: `${name}-rwc` });
  await formatFiles(tree);
  await organizeImportStatements(tree, context, name);

  return () => {
    installPackagesTask(tree);
  };
}

async function organizeImportStatements(
  tree: Tree,
  context: string,
  name: string
) {
  const modulePath = `apps/${context}/${name}-rwc/src/app/app.module.ts`;
  const appModuleContent = tree.read(modulePath).toString();
  const appModuleContentWithOrganizedImports = await organizeImports(
    appModuleContent
  );
  tree.write(modulePath, appModuleContentWithOrganizedImports);
}

async function promptMissingSchemaProperties(
  tree: Tree,
  schema: AppGeneratorOptions
) {
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
          message:
            'What is the application name?',
        },
      ])
    ).name;
  }
}

function importBrowserAnimationsModule(
  tree: Tree,
  context: string,
  name: string
) {
  const modulePath = `apps/${context}/${name}-rwc/src/app/app.module.ts`;
  let moduleContent = tree.read(modulePath).toString();
  moduleContent = moduleContent.replace(
    "import { BrowserModule } from '@angular/platform-browser';",
    `import { BrowserModule } from \'@angular/platform-browser\';
    import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
    `
  );
  moduleContent = moduleContent.replace(
    'BrowserModule,',
    `BrowserModule,
  BrowserAnimationsModule,`
  );
  tree.write(modulePath, moduleContent);
}

function removeInitialNavigationConfig(
  tree: Tree,
  context: string,
  name: string
) {
  const modulePath = `apps/${context}/${name}-rwc/src/app/app.module.ts`;
  let moduleContent = tree.read(modulePath).toString();
  moduleContent = moduleContent.replace(
    ", { initialNavigation: 'enabledBlocking' }",
    ''
  );
  tree.write(modulePath, moduleContent);
}

function removeWelcomeComponent(tree: Tree, context: string, name: string) {
  const srcPath = `apps/${context}/${name}-rwc/src/app/`;
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
  let htmlContent = `
    <h1>Welcome ${context}-${name}-rwc</h1>
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

function generateRelevantFiles(tree: Tree, projectName: string) {
  const applicationRoot = readProjectConfiguration(tree, projectName).root;
  generateFiles(
    tree,
    joinPathFragments(__dirname, './files/proxy'),
    applicationRoot,
    { tkNameId: projectName }
  );
}

async function updateProjectJson(
  tree: Tree,
  context: string,
  name: string,
  path: string
) {
  await updateJson(
    tree,
    `apps/${context}/${name}-rwc/project.json`,
    (projectJson) => {
      projectJson.targets.serve.options = {
        ...(projectJson.targets.serve.options || {}),
        proxyConfig: `apps/${path}/proxy.conf.js`,
      };
      projectJson.targets.build.options.styles = [
        'libs/b2e/public/ui/styles/src/styles.scss',
        ...projectJson.targets.build.options.styles,
      ];
      projectJson.targets.build.options.assets = [
        {
          glob: '**/*',
          input: 'libs/b2e/public/ui/assets/src',
          output: 'assets',
        },
        ...projectJson.targets.build.options.assets,
      ];
      projectJson.implicitDependencies = ['b2e-public-ui-styles'];
      return projectJson;
    }
  );
}

function validateSchema(schema: AppGeneratorOptions) {
  const { name } = schema;
  if (name.includes(' ')) {
    throw new Error(
      `The app name "${name}" should not contain spaces. Please use "-" instead.`
    );
  }

  if (name.endsWith('-')) {
    throw new Error(`The app name "${name}" should not end with "-"`);
  }
}
