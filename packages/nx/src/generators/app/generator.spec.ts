import {createTreeWithEmptyWorkspace} from '@nrwl/devkit/testing';
import {Tree, readJson} from '@nrwl/devkit';

import * as nrwlAngularGenerators from '@nrwl/angular/generators';
import * as nrwlWorkspaceGenerators from '@nrwl/workspace/generators';
import * as importConductor from 'import-conductor';
import * as nrwlDevKit from '@nrwl/devkit';
import * as inquirer from 'inquirer';

import * as moduleBoundariesGenerator from '../module-boundaries-update/generator';
import * as configHelper from '../config/config.helper';

import generateWorkspaceApp from './generator';

jest
  .spyOn(configHelper, 'createConfigFileIfNonExisting')
  .mockImplementation(() => Promise.resolve());
jest
  .spyOn(configHelper, 'getContexts')
  .mockImplementation(() => []);

jest.mock('@nrwl/angular/generators', () => {
  const actualModule = jest.requireActual('@nrwl/angular/generators');
  return {
    __esModule: true,
    ...actualModule,
  };
});

jest.mock('@nrwl/workspace/generators', () => {
  const actualModule = jest.requireActual('@nrwl/workspace/generators');
  return {
    __esModule: true,
    ...actualModule,
  };
});

// eslint-disable-next-line @typescript-eslint/no-empty-function
jest.spyOn(console, 'warn').mockImplementation(() => {});

describe('app generator', () => {
  let appTree: Tree;

  beforeEach(() => {
    appTree = createTreeWithEmptyWorkspace(2);
  });

  describe('Config', () => {
    it('should should check if a config file exists or not', async () => {
      const schema = {
        context: 'context',
        name: 'name',
        prefix: 'prefix',
      };
      await generateWorkspaceApp(appTree, schema);
      expect(configHelper.createConfigFileIfNonExisting).toHaveBeenCalled();
    });
  });

  describe('Missing Schema Properties', () => {
    it('should prompt for missing context', async () => {
      // TODO evaluate if context can also be CamelCase - if not handle this accordingly
      const schema = {
        name: 'name',
        prefix: 'prefix',
      };
      const exampleContexts = ['sales', 'marketing'];

      jest
        .spyOn(configHelper, 'getContexts')
        .mockImplementation(() => exampleContexts);

      jest.spyOn(inquirer, 'prompt').mockImplementation(() =>
        Promise.resolve({
          context: 'sales',
        })
      );

      await generateWorkspaceApp(appTree, schema);
      expect(inquirer.prompt).toHaveBeenCalledWith([
        {
          type: 'list',
          name: 'context',
          message: 'What context does your application belong to?',
          choices: exampleContexts,
        },
      ]);
    });

    it('should prompt for missing name', async () => {
      // TODO evaluate if name can also be CamelCase - if not handle this accordingly
      const appName = 'myawesomeapp';
      const schema = {
        context: 'context',
        prefix: 'prefix',
      };
      jest.spyOn(inquirer, 'prompt').mockImplementation(() =>
        Promise.resolve({
          name: appName,
        })
      );

      await generateWorkspaceApp(appTree, schema);
      expect(inquirer.prompt).toHaveBeenCalledWith([
        {
          type: 'input',
          name: 'name',
          message: 'What is the application name?',
        },
      ]);
    });

    // TODO check if prefix will be refactored - if not test it here as well
  });

  describe('Name', () => {

    it('should ensure that a name does not contain spaces', async () => {
      const appName = 'my awesome app';
      const schema = {
        context: 'context',
        name: appName,
        prefix: 'prefix',
      };
      await expect(async () => await generateWorkspaceApp(appTree, schema)).rejects.toThrow(
        `The app name "${appName}" should not contain spaces. Please use "-" instead.`
      );
    });

    it('should ensure that the name does not end with a dash', async () => {
      const appName = 'my-awesome-app-';
      const schema = {
        context: 'context',
        name: appName,
        prefix: 'prefix',
      };
      await expect(async () => await generateWorkspaceApp(appTree, schema)).rejects.toThrow(
        `The app name "${appName}" should not end with "-"`
      );
    });
  });

  describe('Nrwl Angular generators', () => {

    it('should generate a new application with the correct schema', async () => {
      const context = 'my-context';
      const prefix = 'my-prefix';
      const name = 'my-awesome-app';
      const schema = {
        context,
        name,
        prefix,
      }
      jest.spyOn(nrwlAngularGenerators, 'applicationGenerator');

      await generateWorkspaceApp(appTree, schema);

      expect(nrwlAngularGenerators.applicationGenerator).toHaveBeenCalledWith(
        appTree,
        {
          name: `${context}/${name}`,
          style: 'scss',
          routing: true,
          tags: `context:${context},type:app`,
          standaloneConfig: true,
          prefix: `${prefix}-${context}`,
        }
      );
    });

    it('should update the import path of the e2e project', async () => {
      const context = 'my-context';
      const prefix = 'my-prefix';
      const name = 'my-awesome-app';
      const schema = {
        context,
        name,
        prefix,
      }
      jest.spyOn(nrwlWorkspaceGenerators, 'moveGenerator');

      await generateWorkspaceApp(appTree, schema);

      expect(nrwlWorkspaceGenerators.moveGenerator).toHaveBeenCalledWith(
        appTree,
        {
          destination: `${context}/${name}-e2e`,
          projectName: `${context}-${name}-e2e`,
          updateImportPath: true,
        }
      );

    });

  });

  describe('Project tags', () => {

    it('should update the project tags', async () => {
      const context = 'my-context';
      const name = 'my-awesome-app';
      const schema = {
        context,
        name,
        prefix: 'prefix'
      };

      await generateWorkspaceApp(appTree, schema);
      const e2eProjectJson = readJson(appTree, `apps/${context}/${name}-e2e/project.json`) as any;
      expect(e2eProjectJson.tags).toEqual([`context:${context}`, 'type:e2e']);
    });

  });

  describe('Update package.json scripts', () => {
    it('should add serve script', async () => {
      const name = 'awesome-app';
      const context = 'awesome-context';
      const projectName = `${context}-${name}`;

      const schema = {
        context, name, prefix: 'my-prefix'
      }

      await generateWorkspaceApp(appTree, schema);

      const scripts = readJson(appTree, 'package.json').scripts;
      expect(scripts[`serve:${context}-${name}:app`]).toEqual(
        `nx serve --project ${projectName} -o`
      );
    });

    it('should add build script', async () => {
      const name = 'awesome-app';
      const context = 'awesome-context';
      const projectName = `${context}-${name}`;
      const schema = {
        context, name, prefix: 'my-prefix'
      }

      await generateWorkspaceApp(appTree, schema);

      const scripts = readJson(appTree, 'package.json').scripts;
      expect(scripts[`build:${context}-${name}`]).toEqual(
        `nx build --project ${projectName}`
      );
    });

    it('should add an analyze script', async () => {
      const name = 'awesome-app';
      const context = 'awesome-context';
      const projectName = `${context}-${name}`;
      const schema = {
        context, name, prefix: 'my-prefix'
      }

      await generateWorkspaceApp(appTree, schema);

      const scripts = readJson(appTree, 'package.json').scripts;
      expect(scripts[`analyze:${context}-${name}`]).toEqual(
        `nx build --project ${projectName} --stats-json && webpack-bundle-analyzer dist/apps/${context}/${name}/stats.json`
      );
    });

    it('should add a lint script', async () => {
      const name = 'awesome-app';
      const context = 'awesome-context';
      const projectName = `${context}-${name}`;
      const schema = {
        context, name, prefix: 'my-prefix'
      }

      await generateWorkspaceApp(appTree, schema);

      const scripts = readJson(appTree, 'package.json').scripts;
      expect(scripts[`lint:${context}-${name}`]).toEqual(
        `nx lint --project ${projectName} && nx stylelint --project ${projectName} --fix`
      );
    });

    it('should add a test script', async () => {
      const name = 'awesome-app';
      const context = 'awesome-context';
      const projectName = `${context}-${name}`;
      const schema = {
        context, name, prefix: 'my-prefix'
      }

      await generateWorkspaceApp(appTree, schema);

      const scripts = readJson(appTree, 'package.json').scripts;
      expect(scripts[`test:${context}-${name}`]).toEqual(
        `nx test --project ${projectName}`
      );
    });

    it('should add a e2e script', async () => {
      const name = 'awesome-app';
      const context = 'awesome-context';
      const projectName = `${context}-${name}`;
      const schema = {
        context, name, prefix: 'my-prefix'
      }

      await generateWorkspaceApp(appTree, schema);

      const scripts = readJson(appTree, 'package.json').scripts;
      expect(scripts[`e2e:${context}-${name}`]).toEqual(
        `nx e2e --project ${projectName}-e2e`
      );
    });
  });

  describe('Module boundaries', () => {
    it('should call updateModuleBoundaries with the correct params', async () => {
      const context = 'my-awesome-context';
      const name = 'my-awesome-app';
      const schema = {
        context,
        name,
        prefix: 'my-awesome-prefix'
      };

      jest.spyOn(moduleBoundariesGenerator, 'default');

      await generateWorkspaceApp(appTree, schema);
      expect(moduleBoundariesGenerator.default).toHaveBeenCalledWith(
        appTree, {context, scope: `${name}`}
      );
    });
  });

  describe('Cleanup initial Nx configurations', () => {

    it('should remove the initial navigation configuration', async () => {
      const context = 'my-awesome-context';
      const name = 'my-awesome-name';
      const schema = {
        context,
        name,
        prefix: 'my-awesome-prefix'
      }

      await generateWorkspaceApp(appTree, schema);

      const appModule = appTree.read(`apps/${context}/${name}/src/app/app.module.ts`).toString();
      expect(appModule).not.toContain('{ initialNavigation: \'enabledBlocking\' }');
    });

    it('should remove the Nx Welcome Component', async () => {
      const context = 'my-awesome-context';
      const name = 'my-awesome-name';
      const schema = {
        context,
        name,
        prefix: 'my-awesome-prefix'
      }

      await generateWorkspaceApp(appTree, schema);

      expect(appTree.exists(
        `apps/${context}/${name}/src/app/nx-welcome.component.ts`)
      ).toBeFalsy();
    });
  });

  describe('Formatting', () => {

    it('should call formatFiles', async () => {
      const schema = {
        context: 'my-awesome-context',
        name: 'my-awesome-name',
        prefix: 'my-awesome-prefix'
      }
      jest.spyOn(nrwlDevKit, 'formatFiles');

      await generateWorkspaceApp(appTree, schema);
      expect(nrwlDevKit.formatFiles).toHaveBeenCalledWith(appTree);
    });

    it('should organize the imports of the app.module', async () => {
      const context = 'my-awesome-context';
      const name = 'my-awesome-name';
      const schema = {
        context,
        name,
        prefix: 'my-awesome-prefix'
      }
      jest.spyOn(importConductor, 'organizeImports');

      await generateWorkspaceApp(appTree, schema);
      expect(importConductor.organizeImports).toHaveBeenCalled();
    });

  });

  describe('return function', () => {

    it('should return a function that allows to call installPackagesTask', async () => {
      const schema = {
        context: 'my-awesome-context',
        name: 'my-awesome-name',
        prefix: 'my-awesome-prefix'
      }

      // eslint-disable-next-line @typescript-eslint/no-empty-function
      jest.spyOn(nrwlDevKit, 'installPackagesTask').mockImplementation(() => () => {});

      (await generateWorkspaceApp(appTree, schema))();

      expect(nrwlDevKit.installPackagesTask).toHaveBeenCalled();
    });

  });


});
