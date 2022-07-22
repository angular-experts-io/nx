import * as inquirer from 'inquirer';
import {organizeImports} from 'import-conductor';
import {formatFiles, installPackagesTask, Tree, updateJson,} from '@nrwl/devkit';
import {applicationGenerator} from '@nrwl/angular/generators';

// TODO do we want to go with stylelint?
/*
import { configurationGenerator, scssGenerator } from 'nx-stylelint';
*/
import moduleBoundariesUpdate from '../module-boundaries-update/generator';

import {AppGeneratorOptions} from './schema';
import {createConfigFileIfNonExisting, getContexts} from '../utils/context.util';
import {moveGenerator} from "@nrwl/workspace/generators";

export default async function generateWorkspaceApp(
  tree: Tree,
  schema: AppGeneratorOptions
) {
  await createConfigFileIfNonExisting(tree);
  await promptMissingSchemaProperties(tree, schema);
  validateSchema(schema);

  const { context, name } = schema;
  // TODO should this be configurable?
  const prefix = `somePrefix-${context}`;
  const path = `${context}/${name}`;
  const enrichedSchema = {
    name: path,
    style: 'scss' as any,
    routing: true,
    buildable: true,
    tags: `context:${context},type:app`,
    standaloneConfig: true,
    prefix,
  };
  const projectName = `${context}-${name}`;

  await applicationGenerator(tree, enrichedSchema);
  await moveGenerator(tree, {
    destination: `${context}/${name}-e2e`,
    projectName: `${context}-${name}-e2e`,
    updateImportPath: true,
  });
  removeInitialNavigationConfig(tree, context, name);
  removeWelcomeComponent(tree, context, name);

  await updateJson(
    tree,
    `apps/${context}/${name}-e2e/project.json`,
    (projectJson) => {
      projectJson.tags = [`context:${context}`, 'type:e2e'];
      return projectJson;
    }
  );

  await updateJson(tree, `package.json`, (packageJson) => {
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

  // TODO do we want to use stylelint
  // await scssGenerator(tree, { project: projectName, skipFormat: true });
  await moduleBoundariesUpdate(tree, { context, scope: `${name}` });
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
  const modulePath = `apps/${context}/${name}/src/app/app.module.ts`;
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

function removeInitialNavigationConfig(
  tree: Tree,
  context: string,
  name: string
) {
  const modulePath = `apps/${context}/${name}/src/app/app.module.ts`;
  let moduleContent = tree.read(modulePath).toString();
  moduleContent = moduleContent.replace(
    ", { initialNavigation: 'enabledBlocking' }",
    ''
  );
  tree.write(modulePath, moduleContent);
}

function removeWelcomeComponent(tree: Tree, context: string, name: string) {
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
  let htmlContent = `
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
