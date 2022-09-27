import * as inquirer from 'inquirer';
import * as nrwlDevKit from '@nrwl/devkit';
import {readJson, Tree} from '@nrwl/devkit';
import * as nrwlAngularGenerators from '@nrwl/angular/generators';
import {createTreeWithEmptyWorkspace} from '@nrwl/devkit/testing';

import generateWorkspaceApp from '../app/generator';
import * as configHelper from '../config/config.helper';
import * as generatorUtils from '../utils/generators-angular';
import {camelCase, capitalize, pascalCase} from '../utils/string';
import * as applicationPrompts from '../prompts/application.prompt';
import {getAvailableScopeTypes, ScopeType} from '../model/scope-type';
import {AVAILABLE_LIBRARY_TYPES, LibraryType} from '../model/library-type';
import * as moduleBoundariesGenerator from '../module-boundaries-update/generator';
import {DEFAULT_ANGULAR_GENERATOR_COMPONENT_OPTIONS} from '../utils/generators-angular';

import generateWorkspaceLibrary from './generator';

const mockContexts = ['foo', 'bar', 'baz'];
const mockPrefix = 'my-awesome-prefix';
const mockAppSuffix = 'app';

jest
  .spyOn(configHelper, 'createConfigFileIfNonExisting')
  .mockImplementation(() => Promise.resolve());

jest
  .spyOn(configHelper, 'getContexts')
  .mockImplementation(() => mockContexts);

jest
  .spyOn(configHelper, 'getPrefix')
  .mockImplementation(() => mockPrefix);

jest
  .spyOn(configHelper, 'getAppSuffix')
  .mockImplementation(() => mockAppSuffix);


jest.mock('@nrwl/angular/generators', () => {
  const actualModule = jest.requireActual('@nrwl/angular/generators');
  return {
    __esModule: true,
    ...actualModule,
  };
});

describe('library generator', () => {
  let appTree: Tree;

  beforeEach(() => {
    appTree = createTreeWithEmptyWorkspace(2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Config', () => {
    it('should should check if a config file exists or not', async () => {
      const schema = {
        context: 'context',
        name: 'name',
        scopeType: ScopeType.PUBLIC,
        prefix: 'prefix',
        type: LibraryType.UI,
      };
      await generateWorkspaceLibrary(appTree, schema);
      expect(configHelper.createConfigFileIfNonExisting).toHaveBeenCalled();
    });
  });

  describe('prompt missing schema properties', () => {
    it('should prompt for missing context', async () => {
      const context = 'my-awesome-context';
      const schema = {
        name: 'name',
        scopeType: ScopeType.PUBLIC,
        prefix: 'prefix',
        type: LibraryType.UI,
      };

      jest
        .spyOn(inquirer, 'prompt')
        .mockImplementation(() => Promise.resolve({context}));

      await generateWorkspaceLibrary(appTree, schema);
      expect(inquirer.prompt).toHaveBeenCalledWith([
        {
          type: 'list',
          name: 'context',
          message: 'What context does your library belong to?',
          choices: mockContexts,
        },
      ]);
    });

    it('should prompt for missing name', async () => {
      const name = 'my-awesome-name';
      const schema = {
        context: 'my-awesome-context',
        scopeType: ScopeType.PUBLIC,
        prefix: 'prefix',
        type: LibraryType.UI,
      };

      jest
        .spyOn(inquirer, 'prompt')
        .mockImplementation(() => Promise.resolve({name}));

      await generateWorkspaceLibrary(appTree, schema);
      expect(inquirer.prompt).toHaveBeenCalledWith([
        {
          type: 'input',
          name: 'name',
          message: 'What is the library name?',
        },
      ]);
    });

    it('should prompt for missing scopeType', async () => {
      const scopeType = ScopeType.PUBLIC;
      const schema = {
        context: 'my-awesome-context',
        name: 'my-awesome-name',
        prefix: 'prefix',
        type: LibraryType.UI,
      };

      jest
        .spyOn(inquirer, 'prompt')
        .mockImplementation(() => Promise.resolve({scopeType}));

      await generateWorkspaceLibrary(appTree, schema);
      expect(inquirer.prompt).toHaveBeenCalledWith([
        {
          type: 'list',
          name: 'scopeType',
          message: 'What scope does your library belong to?',
          choices: getAvailableScopeTypes(schema.context),
        },
      ]);
    });

    it('should prompt for missing type', async () => {
      const type = LibraryType.UI;
      const schema = {
        context: 'my-awesome-context',
        scopeType: ScopeType.PUBLIC,
        name: 'my-awesome-name',
      };

      jest
        .spyOn(inquirer, 'prompt')
        .mockImplementation(() => Promise.resolve({type}));

      await generateWorkspaceLibrary(appTree, schema);
      expect(inquirer.prompt).toHaveBeenCalledWith([
        {
          type: 'list',
          name: 'type',
          message: 'What is the library type?',
          choices: AVAILABLE_LIBRARY_TYPES,
        },
      ]);
    });

    it(`should call the application prompts for app specific scopeType
      and missing app specific scope`, async () => {
      const appName = 'my-awesome';
      const context = 'my-awesome-context';

      const librarySchema = {
        context,
        scopeType: ScopeType.APP_SPECIFIC,
        type: LibraryType.FEATURE,
        name: 'my-awesome-lib',
        appName,
      };

      jest
        .spyOn(applicationPrompts, 'applicationPrompt')
        .mockReturnValue(Promise.resolve(`${appName}-${mockAppSuffix}`));

      await generateWorkspaceApp(appTree, {name: appName, context});
      await generateWorkspaceLibrary(appTree, librarySchema);

      expect(applicationPrompts.applicationPrompt).toHaveBeenCalledWith(
        expect.anything(),
        context
      );
    });
  });

  describe('Validate options', () => {
    it('should ensure that a name does not contain spaces', async () => {
      const appName = 'my awesome app';
      const schema = {
        context: 'context',
        scopeType: ScopeType.SHARED,
        type: LibraryType.UI,
        name: appName,
        prefix: 'prefix'
      };
      await expect(
        async () => await generateWorkspaceLibrary(appTree, schema)
      ).rejects.toThrow(
        `The lib name "${appName}" should not contain spaces. Please use "-" instead.`
      );
    });

    it('should trow an error if the app specific scope doesnt end with the appSuffix', async () => {
      const appName = 'hero-caller';
      const appSuffix = 'app';
      const scopeAppSpecific = appName;
      const schema = {
        context: 'context',
        scopeType: ScopeType.APP_SPECIFIC,
        scopeAppSpecific,
        type: LibraryType.UI,
        name: appName,
        prefix: 'prefix'
      };
      await expect(
        async () => await generateWorkspaceLibrary(appTree, schema)
      ).rejects.toThrow(
        `The app specific scope "${scopeAppSpecific}" must end with "${appSuffix}".`
      );
    });
  });

  describe('Generate library structure', () => {
    describe('Library type UI', () => {
      describe('Shared scope', () => {
        it('should generate a library of type UI', async () => {
          const prefix = 'my-prefix';
          const context = 'my-awesome-context';
          const scopeType = ScopeType.SHARED;
          const type = LibraryType.UI;
          const name = 'my-awesome-app';
          const project = `${context}-${scopeType}-${type}-${name}`;
          const selector = `${prefix}-${context}-${name}`;
          const schema = {
            context,
            scopeType,
            type,
            name,
          };

          jest.spyOn(generatorUtils, 'angularComponentGenerator');
          jest
            .spyOn(configHelper, 'getPrefix')
            .mockReturnValue(prefix);

          await generateWorkspaceLibrary(appTree, schema);

          expect(generatorUtils.angularComponentGenerator).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining(
              {
                ...DEFAULT_ANGULAR_GENERATOR_COMPONENT_OPTIONS,
                project,
                name: schema.name,
                selector,
              })
          );
        });

        it(`should export the generated component
          of a shared UI library from the index file`, async () => {
          const prefix = 'my-prefix';
          const context = 'my-awesome-context';
          const scopeType = ScopeType.SHARED;
          const type = LibraryType.UI;
          const name = 'my-awesome-app';
          const libpath = `${context}/${scopeType}/${type}/${name}`;
          const schema = {
            context,
            scopeType,
            type,
            name,
          };

          jest.spyOn(generatorUtils, 'angularComponentGenerator');
          jest
            .spyOn(configHelper, 'getPrefix')
            .mockReturnValue(prefix);

          await generateWorkspaceLibrary(appTree, schema);

          const indexFile = appTree
            .read(`libs/${libpath}/src/index.ts`)
            .toString();
          expect(indexFile).toContain(
            `export * from './lib/${schema.name}/${schema.name}.component';`
          );
        });
      });

      describe('Public scope', () => {
        it('should generate a library of type UI', async () => {
          const prefix = 'my-prefix';
          const context = 'my-awesome-context';
          const scopeType = ScopeType.PUBLIC;
          const type = LibraryType.UI;
          const name = 'my-awesome-app';
          const project = `${context}-${scopeType}-${type}-${name}`;
          const selector = `${prefix}-${context}-${name}`;
          const schema = {
            context,
            scopeType,
            type,
            name,
          };

          jest.spyOn(generatorUtils, 'angularComponentGenerator');
          jest
            .spyOn(configHelper, 'getPrefix')
            .mockReturnValue(prefix);

          await generateWorkspaceLibrary(appTree, schema);

          expect(generatorUtils.angularComponentGenerator).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining(
              {
                ...DEFAULT_ANGULAR_GENERATOR_COMPONENT_OPTIONS,
                project,
                name: schema.name,
                selector,
              })
          );
        });

        it(`should export the generated component
            of a public UI library from the index file`, async () => {
          const prefix = 'my-prefix';
          const context = 'my-awesome-context';
          const scopeType = ScopeType.PUBLIC;
          const type = LibraryType.UI;
          const name = 'my-awesome-app';
          const libpath = `${context}/${scopeType}/${type}/${name}`;
          const schema = {
            context,
            scopeType,
            type,
            name,
          };

          jest.spyOn(generatorUtils, 'angularComponentGenerator');
          jest
            .spyOn(configHelper, 'getPrefix')
            .mockReturnValue(prefix);

          await generateWorkspaceLibrary(appTree, schema);

          const indexFile = appTree
            .read(`libs/${libpath}/src/index.ts`)
            .toString();
          expect(indexFile).toContain(
            `export * from './lib/${schema.name}/${schema.name}.component';`
          );
        });
      });

      describe('App scope', () => {
        it('should generate a library of type UI', async () => {
          const prefix = 'prefix';
          const applicationScope = `foo-${mockAppSuffix}`;
          const context = 'context';
          const scopeType = ScopeType.APP_SPECIFIC;
          const type = LibraryType.UI;
          const name = 'test';
          const project = `${context}-${applicationScope}-${type}-${name}`;
          const selector = `${prefix}-${context}-${applicationScope}-${name}`;
          const schema = {
            context,
            scopeType,
            type,
            name,
          };

          jest
            .spyOn(applicationPrompts, 'applicationPrompt')
            .mockReturnValue(Promise.resolve(applicationScope));
          jest.spyOn(generatorUtils, 'angularComponentGenerator');
          jest
            .spyOn(configHelper, 'getPrefix')
            .mockReturnValue(prefix);

          await generateWorkspaceLibrary(appTree, schema);

          expect(generatorUtils.angularComponentGenerator).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining(
              {
                ...DEFAULT_ANGULAR_GENERATOR_COMPONENT_OPTIONS,
                project,
                name: schema.name,
                selector,
              })
          );
        });

        it(`should export the generated component
          of a app-specific UI library from the index file`, async () => {
          const prefix = 'my-prefix';
          const applicationScope = `foo-${mockAppSuffix}`;
          const context = 'my-awesome-context';
          const scopeType = ScopeType.APP_SPECIFIC;
          const type = LibraryType.UI;
          const name = 'my-awesome-app';
          const libpath = `${context}/${applicationScope}/${type}/${name}`;
          const schema = {
            context,
            scopeType,
            type,
            name,
          };

          jest
            .spyOn(applicationPrompts, 'applicationPrompt')
            .mockReturnValue(Promise.resolve(applicationScope));
          jest.spyOn(generatorUtils, 'angularComponentGenerator');
          jest
            .spyOn(configHelper, 'getPrefix')
            .mockReturnValue(prefix);

          await generateWorkspaceLibrary(appTree, schema);

          const indexFile = appTree
            .read(`libs/${libpath}/src/index.ts`)
            .toString();
          expect(indexFile).toContain(
            `export * from './lib/${schema.name}/${schema.name}.component';`
          );
        });
      });
    });

    describe('Library type Pattern', () => {
      describe('Shared scope', () => {
        it('should generate a library of type Pattern', async () => {
          const prefix = 'my-prefix';
          const context = 'my-awesome-context';
          const scopeType = ScopeType.SHARED;
          const type = LibraryType.PATTERN;
          const name = 'my-awesome-app';
          const project = `${context}-${scopeType}-${type}-${name}`;
          const selector = `${prefix}-${context}-${name}`;
          const schema = {
            context,
            scopeType,
            type,
            name,
          };

          jest.spyOn(generatorUtils, 'angularComponentGenerator');
          jest
            .spyOn(configHelper, 'getPrefix')
            .mockReturnValue(prefix);

          await generateWorkspaceLibrary(appTree, schema);

          expect(generatorUtils.angularComponentGenerator).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining(
              {
                ...DEFAULT_ANGULAR_GENERATOR_COMPONENT_OPTIONS,
                project,
                name: schema.name,
                selector,
              })
          );
        });

        it(`should export the generated component
          of a shared UI library from the index file`, async () => {
          const prefix = 'my-prefix';
          const context = 'my-awesome-context';
          const scopeType = ScopeType.SHARED;
          const type = LibraryType.PATTERN;
          const name = 'my-awesome-app';
          const libpath = `${context}/${scopeType}/${type}/${name}`;
          const schema = {
            context,
            scopeType,
            type,
            name,
          };

          jest.spyOn(generatorUtils, 'angularComponentGenerator');
          jest
            .spyOn(configHelper, 'getPrefix')
            .mockReturnValue(prefix);

          await generateWorkspaceLibrary(appTree, schema);

          const indexFile = appTree
            .read(`libs/${libpath}/src/index.ts`)
            .toString();
          expect(indexFile).toContain(
            `export * from './lib/${schema.name}/${schema.name}.component';`
          );
        });
      });

      describe('Public scope', () => {
        it('should generate a library of type Pattern', async () => {
          const prefix = 'my-prefix';
          const context = 'my-awesome-context';
          const scopeType = ScopeType.PUBLIC;
          const type = LibraryType.PATTERN;
          const name = 'my-awesome-app';
          const project = `${context}-${scopeType}-${type}-${name}`;
          const selector = `${prefix}-${context}-${name}`;
          const schema = {
            context,
            scopeType,
            type,
            name,
          };

          jest.spyOn(generatorUtils, 'angularComponentGenerator');
          jest
            .spyOn(configHelper, 'getPrefix')
            .mockReturnValue(prefix);

          await generateWorkspaceLibrary(appTree, schema);

          expect(generatorUtils.angularComponentGenerator).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining(
              {
                ...DEFAULT_ANGULAR_GENERATOR_COMPONENT_OPTIONS,
                project,
                name: schema.name,
                selector,
              })
          );
        });

        it(`should export the generated component
          of a public UI library from the index file`, async () => {
          const prefix = 'my-prefix';
          const context = 'my-awesome-context';
          const scopeType = ScopeType.PUBLIC;
          const type = LibraryType.PATTERN;
          const name = 'my-awesome-app';
          const libpath = `${context}/${scopeType}/${type}/${name}`;
          const schema = {
            context,
            scopeType,
            type,
            name,
          };

          jest.spyOn(generatorUtils, 'angularComponentGenerator');
          jest
            .spyOn(configHelper, 'getPrefix')
            .mockReturnValue(prefix);

          await generateWorkspaceLibrary(appTree, schema);

          const indexFile = appTree
            .read(`libs/${libpath}/src/index.ts`)
            .toString();
          expect(indexFile).toContain(
            `export * from './lib/${schema.name}/${schema.name}.component';`
          );
        });
      });

      describe('App scope', () => {
        it('should generate a library of type Pattern', async () => {
          const prefix = 'prefix';
          const applicationScope = `foo-${mockAppSuffix}`;
          const context = 'context';
          const scopeType = ScopeType.APP_SPECIFIC;
          const type = LibraryType.PATTERN;
          const name = 'test';
          const project = `${context}-${applicationScope}-${type}-${name}`;
          const selector = `${prefix}-${context}-${applicationScope}-${name}`;
          const schema = {
            context,
            scopeType,
            type,
            name,
          };

          jest
            .spyOn(applicationPrompts, 'applicationPrompt')
            .mockReturnValue(Promise.resolve(applicationScope));
          jest.spyOn(generatorUtils, 'angularComponentGenerator');
          jest
            .spyOn(configHelper, 'getPrefix')
            .mockReturnValue(prefix);

          await generateWorkspaceLibrary(appTree, schema);

          expect(generatorUtils.angularComponentGenerator).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining(
              {
                ...DEFAULT_ANGULAR_GENERATOR_COMPONENT_OPTIONS,
                project,
                name: schema.name,
                selector,
              })
          );
        });

        it(`should export the generated component
          of a app-specific UI library from the index file`, async () => {
          const prefix = 'my-prefix';
          const applicationScope = `foo-${mockAppSuffix}`;
          const context = 'my-awesome-context';
          const scopeType = ScopeType.APP_SPECIFIC;
          const type = LibraryType.PATTERN;
          const name = 'my-awesome-app';
          const libpath = `${context}/${applicationScope}/${type}/${name}`;
          const schema = {
            context,
            scopeType,
            type,
            name,
          };

          jest
            .spyOn(applicationPrompts, 'applicationPrompt')
            .mockReturnValue(Promise.resolve(applicationScope));
          jest.spyOn(generatorUtils, 'angularComponentGenerator');
          jest
            .spyOn(configHelper, 'getPrefix')
            .mockReturnValue(prefix);

          await generateWorkspaceLibrary(appTree, schema);

          const indexFile = appTree
            .read(`libs/${libpath}/src/index.ts`)
            .toString();
          expect(indexFile).toContain(
            `export * from './lib/${schema.name}/${schema.name}.component';`
          );
        });
      });
    });

    describe('Library type feature', () => {
      describe('Scope shared', () => {
        it('should generate a library of type feature', async () => {
          const prefix = 'prefix';
          const context = 'context';
          const scopeType = ScopeType.SHARED;
          const type = LibraryType.FEATURE;
          const name = 'test';
          const project = `${context}-${scopeType}-${type}-${name}`;
          const selector = `${prefix}-${context}-${name}`;
          const module = `${context}-${scopeType}-${type}-${name}.module`;
          const schema = {
            context,
            scopeType,
            type,
            name,
          };

          jest.spyOn(generatorUtils, 'angularComponentGenerator');
          jest
            .spyOn(configHelper, 'getPrefix')
            .mockReturnValue(prefix);

          await generateWorkspaceLibrary(appTree, schema);

          expect(generatorUtils.angularComponentGenerator).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining(
              {
                ...DEFAULT_ANGULAR_GENERATOR_COMPONENT_OPTIONS,
                project,
                name: `${schema.name}-container`,
                module,
                export: false,
                selector,
              })
          );
        });

        it('should adjust the package JSON', async () => {
          const prefix = 'prefix';
          const context = 'domain-a';
          const appName = 'test';
          const scopeType = ScopeType.SHARED;
          const scope = 'foo';
          const type = LibraryType.FEATURE;
          const name = 'my-lib';
          const libpath = `${context}/${scopeType}/${type}/${name}`;
          const packageJSONPath = `libs/${libpath}/package.json`;
          const packageName = `${prefix}/${libpath.replace(/\//g, '-')}`;

          const librarySchema = {
            context,
            scopeType,
            scope,
            type,
            name,
          };

          jest
            .spyOn(applicationPrompts, 'applicationPrompt')
            .mockReturnValue(Promise.resolve(appName));
          jest.spyOn(generatorUtils, 'angularComponentGenerator');
          jest
            .spyOn(configHelper, 'getPrefix')
            .mockReturnValue(prefix);

          await generateWorkspaceApp(appTree, {context, name: appName});
          await generateWorkspaceLibrary(appTree, librarySchema);

          const packageJSON = readJson(appTree, packageJSONPath);

          expect(packageJSON.name).toBe(packageName);
        });

        it('should adjust the tsconfig', async () => {
          const prefix = 'prefix';
          const context = 'domain-a';
          const appName = 'test';
          const scopeType = ScopeType.SHARED;
          const scope = 'foo';
          const type = LibraryType.FEATURE;
          const name = 'my-lib';
          const libpath = `${context}/${scopeType}/${type}/${name}`;
          const packageName = `${prefix}/${libpath.replace(/\//g, '-')}`;

          const librarySchema = {
            context,
            scopeType,
            scope,
            type,
            name,
          };

          jest
            .spyOn(applicationPrompts, 'applicationPrompt')
            .mockReturnValue(Promise.resolve(appName));
          jest.spyOn(generatorUtils, 'angularComponentGenerator');
          jest
            .spyOn(configHelper, 'getPrefix')
            .mockReturnValue(prefix);

          await generateWorkspaceApp(appTree, {context, name: appName});
          await generateWorkspaceLibrary(appTree, librarySchema);

          const tsconfig = readJson(appTree, `tsconfig.base.json`);
          expect(
            tsconfig.compilerOptions.paths[`${prefix}/${libpath}`]
          ).not.toBeDefined();
          expect(tsconfig.compilerOptions.paths[packageName]).toEqual([
            `libs/${libpath}/src/index.ts`,
          ]);
        });

        it('should call the moduleBoundaries updates', async () => {
          const prefix = 'prefix';
          const context = 'domain-a';
          const appName = 'test';
          const scopeType = ScopeType.SHARED;
          const scope = 'foo';
          const type = LibraryType.FEATURE;
          const name = 'my-lib';

          const librarySchema = {
            context,
            scopeType,
            scope,
            type,
            name,
          };

          jest.spyOn(moduleBoundariesGenerator, 'default');
          jest
            .spyOn(applicationPrompts, 'applicationPrompt')
            .mockReturnValue(Promise.resolve(appName));
          jest.spyOn(generatorUtils, 'angularComponentGenerator');
          jest
            .spyOn(configHelper, 'getPrefix')
            .mockReturnValue(prefix);

          await generateWorkspaceApp(appTree, {context, name: appName});
          await generateWorkspaceLibrary(appTree, librarySchema);

          expect(moduleBoundariesGenerator.default).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining(
              {context, scope: scopeType, type}
            )
          );
        });

        it('should format the files', async () => {
          const prefix = 'prefix';
          const context = 'domain-a';
          const appName = 'test';
          const scopeType = ScopeType.SHARED;
          const scope = 'foo';
          const type = LibraryType.FEATURE;
          const scopeAppSpecific = appName;
          const name = 'my-lib';

          const librarySchema = {
            context,
            scopeType,
            scope,
            scopeAppSpecific,
            type,
            name,
          };

          jest.spyOn(nrwlDevKit, 'formatFiles');
          jest
            .spyOn(applicationPrompts, 'applicationPrompt')
            .mockReturnValue(Promise.resolve(appName));
          jest.spyOn(generatorUtils, 'angularComponentGenerator');
          jest
            .spyOn(configHelper, 'getPrefix')
            .mockReturnValue(prefix);

          await generateWorkspaceApp(appTree, {context, name: appName});
          await generateWorkspaceLibrary(appTree, librarySchema);

          expect(nrwlDevKit.formatFiles).toHaveBeenCalled();
        });

        it('should return a function that allows to call installPackagesTask', async () => {
          const prefix = 'prefix';
          const context = 'domain-a';
          const appName = 'test';
          const scopeType = ScopeType.SHARED;
          const scope = 'foo';
          const type = LibraryType.FEATURE;
          const scopeAppSpecific = appName;
          const name = 'my-lib';

          const librarySchema = {
            context,
            scopeType,
            scope,
            scopeAppSpecific,
            type,
            name,
          };

          jest
            .spyOn(nrwlDevKit, 'installPackagesTask')
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            .mockImplementation(() => () => {
            });
          jest
            .spyOn(applicationPrompts, 'applicationPrompt')
            .mockReturnValue(Promise.resolve(appName));
          jest.spyOn(generatorUtils, 'angularComponentGenerator');
          jest
            .spyOn(configHelper, 'getPrefix')
            .mockReturnValue(prefix);

          await generateWorkspaceApp(appTree, {context, name: appName});
          (await generateWorkspaceLibrary(appTree, librarySchema))();

          expect(nrwlDevKit.installPackagesTask).toHaveBeenCalled();
        });
      });

      describe('Scope public', () => {
        it('should generate a library of type feature', async () => {
          const prefix = 'prefix';
          const context = 'context';
          const scopeType = ScopeType.PUBLIC;
          const type = LibraryType.FEATURE;
          const name = 'test';
          const project = `${context}-${scopeType}-${type}-${name}`;
          const selector = `${prefix}-${context}-${name}`;
          const module = `${context}-${scopeType}-${type}-${name}.module`;
          const schema = {
            context,
            scopeType,
            type,
            name,
          };

          jest.spyOn(generatorUtils, 'angularComponentGenerator');
          jest
            .spyOn(configHelper, 'getPrefix')
            .mockReturnValue(prefix);

          await generateWorkspaceLibrary(appTree, schema);

          expect(generatorUtils.angularComponentGenerator).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining(
              {
                ...DEFAULT_ANGULAR_GENERATOR_COMPONENT_OPTIONS,
                project,
                name: `${schema.name}-container`,
                module,
                export: false,
                selector,
              })
          );
        });

        it('should adjust the package JSON', async () => {
          const prefix = 'prefix';
          const context = 'domain-a';
          const appName = 'test';
          const scopeType = ScopeType.PUBLIC;
          const scope = 'foo';
          const type = LibraryType.FEATURE;
          const name = 'my-lib';
          const libpath = `${context}/${scopeType}/${type}/${name}`;
          const packageJSONPath = `libs/${libpath}/package.json`;
          const packageName = `${prefix}/${libpath.replace(/\//g, '-')}`;

          const librarySchema = {
            context,
            scopeType,
            scope,
            type,
            name,
          };

          jest
            .spyOn(applicationPrompts, 'applicationPrompt')
            .mockReturnValue(Promise.resolve(appName));
          jest.spyOn(generatorUtils, 'angularComponentGenerator');
          jest
            .spyOn(configHelper, 'getPrefix')
            .mockReturnValue(prefix);

          await generateWorkspaceApp(appTree, {context, name: appName});
          await generateWorkspaceLibrary(appTree, librarySchema);

          const packageJSON = readJson(appTree, packageJSONPath);

          expect(packageJSON.name).toBe(packageName);
        });

        it('should adjust the tsconfig', async () => {
          const prefix = 'prefix';
          const context = 'domain-a';
          const appName = 'test';
          const scopeType = ScopeType.PUBLIC;
          const scope = 'foo';
          const type = LibraryType.FEATURE;
          const name = 'my-lib';
          const libpath = `${context}/${scopeType}/${type}/${name}`;
          const packageName = `${prefix}/${libpath.replace(/\//g, '-')}`;

          const librarySchema = {
            context,
            scopeType,
            scope,
            type,
            name,
          };

          jest
            .spyOn(applicationPrompts, 'applicationPrompt')
            .mockReturnValue(Promise.resolve(appName));
          jest.spyOn(generatorUtils, 'angularComponentGenerator');
          jest
            .spyOn(configHelper, 'getPrefix')
            .mockReturnValue(prefix);

          await generateWorkspaceApp(appTree, {context, name: appName});
          await generateWorkspaceLibrary(appTree, librarySchema);

          const tsconfig = readJson(appTree, `tsconfig.base.json`);
          expect(
            tsconfig.compilerOptions.paths[`${prefix}/${libpath}`]
          ).not.toBeDefined();
          expect(tsconfig.compilerOptions.paths[packageName]).toEqual([
            `libs/${libpath}/src/index.ts`,
          ]);
        });

        it('should call the moduleBoundaries updates', async () => {
          const prefix = 'prefix';
          const context = 'domain-a';
          const appName = 'test';
          const scopeType = ScopeType.PUBLIC;
          const scope = 'foo';
          const type = LibraryType.FEATURE;
          const name = 'my-lib';

          const librarySchema = {
            context,
            scopeType,
            scope,
            type,
            name,
          };

          jest.spyOn(moduleBoundariesGenerator, 'default');
          jest
            .spyOn(applicationPrompts, 'applicationPrompt')
            .mockReturnValue(Promise.resolve(appName));
          jest.spyOn(generatorUtils, 'angularComponentGenerator');
          jest
            .spyOn(configHelper, 'getPrefix')
            .mockReturnValue(prefix);

          await generateWorkspaceApp(appTree, {context, name: appName});
          await generateWorkspaceLibrary(appTree, librarySchema);

          expect(moduleBoundariesGenerator.default).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining(
              {context, scope: scopeType, type}
            )
          );
        });

        it('should format the files', async () => {
          const prefix = 'prefix';
          const context = 'domain-a';
          const appName = 'test';
          const scopeType = ScopeType.PUBLIC;
          const scope = 'foo';
          const type = LibraryType.FEATURE;
          const scopeAppSpecific = appName;
          const name = 'my-lib';

          const librarySchema = {
            context,
            scopeType,
            scope,
            scopeAppSpecific,
            type,
            name,
          };

          jest.spyOn(nrwlDevKit, 'formatFiles');
          jest
            .spyOn(applicationPrompts, 'applicationPrompt')
            .mockReturnValue(Promise.resolve(appName));
          jest.spyOn(generatorUtils, 'angularComponentGenerator');
          jest
            .spyOn(configHelper, 'getPrefix')
            .mockReturnValue(prefix);

          await generateWorkspaceApp(appTree, {context, name: appName});
          await generateWorkspaceLibrary(appTree, librarySchema);

          expect(nrwlDevKit.formatFiles).toHaveBeenCalled();
        });

        it('should return a function that allows to call installPackagesTask', async () => {
          const prefix = 'prefix';
          const context = 'domain-a';
          const appName = 'test';
          const scopeType = ScopeType.PUBLIC;
          const scope = 'foo';
          const type = LibraryType.FEATURE;
          const scopeAppSpecific = appName;
          const name = 'my-lib';

          const librarySchema = {
            context,
            scopeType,
            scope,
            scopeAppSpecific,
            type,
            name,
          };

          // eslint-disable-next-line @typescript-eslint/no-empty-function
          jest
            .spyOn(nrwlDevKit, 'installPackagesTask')
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            .mockImplementation(() => () => {
            });
          jest
            .spyOn(applicationPrompts, 'applicationPrompt')
            .mockReturnValue(Promise.resolve(appName));
          jest.spyOn(generatorUtils, 'angularComponentGenerator');
          jest
            .spyOn(configHelper, 'getPrefix')
            .mockReturnValue(prefix);

          await generateWorkspaceApp(appTree, {context, name: appName});
          (await generateWorkspaceLibrary(appTree, librarySchema))();

          expect(nrwlDevKit.installPackagesTask).toHaveBeenCalled();
        });
      });

      describe('Scope app specific', () => {
        it('should generate a library of type feature', async () => {
          const prefix = 'prefix';
          const context = 'domain-a';
          const appName = 'test';
          const scopeType = ScopeType.APP_SPECIFIC;
          const scope = 'foo';
          const type = LibraryType.FEATURE;
          const scopeAppSpecific = `${appName}-${mockAppSuffix}`;
          const name = 'my-lib';
          const project = `${context}-${scopeAppSpecific}-${type}-${name}`;
          const selector = `${prefix}-${context}-${scopeAppSpecific}-${name}`;
          const moduleName = `${context}-${scopeAppSpecific}-${type}-${name}.module`;
          const librarySchema = {
            context,
            scopeType,
            scope,
            scopeAppSpecific,
            type,
            name,
          };

          jest
            .spyOn(applicationPrompts, 'applicationPrompt')
            .mockReturnValue(Promise.resolve(appName));
          jest.spyOn(generatorUtils, 'angularComponentGenerator');
          jest
            .spyOn(configHelper, 'getPrefix')
            .mockReturnValue(prefix);

          await generateWorkspaceApp(appTree, {context, name: appName});

          appTree.listChanges().forEach((change) => {
            console.log(change.path);
          });

          await generateWorkspaceLibrary(appTree, librarySchema);

          expect(generatorUtils.angularComponentGenerator).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining(
              {
                ...DEFAULT_ANGULAR_GENERATOR_COMPONENT_OPTIONS,
                project,
                name: `${librarySchema.name}-container`,
                module: moduleName,
                export: false,
                selector,
              })
          );
        });

        it('should add a route configuration for our freshly generated component', async () => {
          const prefix = 'prefix';
          const context = 'domain-a';
          const appName = 'test';
          const scope = 'foo';
          const scopeType = ScopeType.APP_SPECIFIC;
          const type = LibraryType.FEATURE;
          const name = 'my-lib';
          const scopeAppSpecific = `${appName}-${mockAppSuffix}`;
          const moduleName = `${context}-${scopeAppSpecific}-${type}-${name}.module`;
          const path = `${context}/${scopeAppSpecific}/${type}/${name}`;
          const modulePath = `libs/${path}/src/lib/${moduleName}.ts`;

          const librarySchema = {
            context,
            scopeType,
            scope,
            scopeAppSpecific,
            type,
            name,
          };

          jest
            .spyOn(applicationPrompts, 'applicationPrompt')
            .mockReturnValue(Promise.resolve(appName));
          jest.spyOn(generatorUtils, 'angularComponentGenerator');
          jest
            .spyOn(configHelper, 'getPrefix')
            .mockReturnValue(prefix);

          await generateWorkspaceApp(appTree, {context, name: appName});
          await generateWorkspaceLibrary(appTree, librarySchema);

          const appModuleContent = appTree.read(modulePath).toString();
          expect(appModuleContent).toContain(
            `{ path: '', pathMatch: 'full', component: ${pascalCase(
              `${librarySchema.name}-container`
            )}Component }`
          );
        });

        it('should adjust the package JSON', async () => {
          const prefix = 'prefix';
          const context = 'domain-a';
          const appName = 'test';
          const scopeType = ScopeType.APP_SPECIFIC;
          const scope = 'foo';
          const type = LibraryType.FEATURE;
          const scopeAppSpecific = `${appName}-${mockAppSuffix}`;
          const name = 'my-lib';
          const libpath = `${context}/${scopeAppSpecific}/${type}/${name}`;
          const packageJSONPath = `libs/${libpath}/package.json`;
          const packageName = `${prefix}/${libpath.replace(/\//g, '-')}`;

          const librarySchema = {
            context,
            scopeType,
            scope,
            scopeAppSpecific,
            type,
            name,
          };

          jest
            .spyOn(applicationPrompts, 'applicationPrompt')
            .mockReturnValue(Promise.resolve(appName));
          jest.spyOn(generatorUtils, 'angularComponentGenerator');
          jest
            .spyOn(configHelper, 'getPrefix')
            .mockReturnValue(prefix);

          await generateWorkspaceApp(appTree, {context, name: appName});
          await generateWorkspaceLibrary(appTree, librarySchema);

          const packageJSON = readJson(appTree, packageJSONPath);

          expect(packageJSON.name).toBe(packageName);
        });

        it('should adjust the tsconfig', async () => {
          const prefix = 'prefix';
          const context = 'domain-a';
          const appName = 'test';
          const scopeType = ScopeType.APP_SPECIFIC;
          const scope = 'foo';
          const type = LibraryType.FEATURE;
          const scopeAppSpecific = `${appName}-${mockAppSuffix}`;
          const name = 'my-lib';
          const libpath = `${context}/${scopeAppSpecific}/${type}/${name}`;
          const packageName = `${prefix}/${libpath.replace(/\//g, '-')}`;

          const librarySchema = {
            context,
            scopeType,
            scope,
            scopeAppSpecific,
            type,
            name,
          };

          jest
            .spyOn(applicationPrompts, 'applicationPrompt')
            .mockReturnValue(Promise.resolve(appName));
          jest.spyOn(generatorUtils, 'angularComponentGenerator');
          jest
            .spyOn(configHelper, 'getPrefix')
            .mockReturnValue(prefix);

          await generateWorkspaceApp(appTree, {context, name: appName});
          await generateWorkspaceLibrary(appTree, librarySchema);

          const tsconfig = readJson(appTree, `tsconfig.base.json`);
          expect(
            tsconfig.compilerOptions.paths[`${prefix}/${libpath}`]
          ).not.toBeDefined();
          expect(tsconfig.compilerOptions.paths[packageName]).toEqual([
            `libs/${libpath}/src/index.ts`,
          ]);
        });

        it('should call the moduleBoundaries updates', async () => {
          const prefix = 'prefix';
          const context = 'domain-a';
          const appName = 'test';
          const scopeType = ScopeType.APP_SPECIFIC;
          const scope = 'foo';
          const type = LibraryType.FEATURE;
          const scopeAppSpecific = `${appName}-${mockAppSuffix}`;
          const name = 'my-lib';

          const librarySchema = {
            context,
            scopeType,
            scope,
            scopeAppSpecific,
            type,
            name,
          };

          jest.spyOn(moduleBoundariesGenerator, 'default');
          jest
            .spyOn(applicationPrompts, 'applicationPrompt')
            .mockReturnValue(Promise.resolve(appName));
          jest.spyOn(generatorUtils, 'angularComponentGenerator');
          jest
            .spyOn(configHelper, 'getPrefix')
            .mockReturnValue(prefix);

          await generateWorkspaceApp(appTree, {context, name: appName});
          await generateWorkspaceLibrary(appTree, librarySchema);

          expect(moduleBoundariesGenerator.default).toHaveBeenCalledWith(
            appTree,
            {context, scope: scopeAppSpecific}
          );
        });

        it('should format the files', async () => {
          const prefix = 'prefix';
          const context = 'domain-a';
          const appName = 'test';
          const scopeType = ScopeType.APP_SPECIFIC;
          const scope = 'foo';
          const type = LibraryType.FEATURE;
          const scopeAppSpecific = `${appName}-${mockAppSuffix}`;
          const name = 'my-lib';

          const librarySchema = {
            context,
            scopeType,
            scope,
            scopeAppSpecific,
            type,
            name,
          };

          jest.spyOn(nrwlDevKit, 'formatFiles');
          jest
            .spyOn(applicationPrompts, 'applicationPrompt')
            .mockReturnValue(Promise.resolve(appName));
          jest.spyOn(generatorUtils, 'angularComponentGenerator');
          jest
            .spyOn(configHelper, 'getPrefix')
            .mockReturnValue(prefix);

          await generateWorkspaceApp(appTree, {context, name: appName});
          await generateWorkspaceLibrary(appTree, librarySchema);

          expect(nrwlDevKit.formatFiles).toHaveBeenCalled();
        });

        it('should return a function that allows to call installPackagesTask', async () => {
          const prefix = 'prefix';
          const context = 'domain-a';
          const appName = 'test';
          const scopeType = ScopeType.APP_SPECIFIC;
          const scope = 'foo';
          const type = LibraryType.FEATURE;
          const scopeAppSpecific = `${appName}-${mockAppSuffix}`;
          const name = 'my-lib';

          const librarySchema = {
            context,
            scopeType,
            scope,
            scopeAppSpecific,
            type,
            name,
          };

          // eslint-disable-next-line @typescript-eslint/no-empty-function
          jest
            .spyOn(nrwlDevKit, 'installPackagesTask')
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            .mockImplementation(() => () => {
            });
          jest
            .spyOn(applicationPrompts, 'applicationPrompt')
            .mockReturnValue(Promise.resolve(appName));
          jest.spyOn(generatorUtils, 'angularComponentGenerator');
          jest
            .spyOn(configHelper, 'getPrefix')
            .mockReturnValue(prefix);

          await generateWorkspaceApp(appTree, {context, name: appName});
          (await generateWorkspaceLibrary(appTree, librarySchema))();

          expect(nrwlDevKit.installPackagesTask).toHaveBeenCalled();
        });
      });
    });

    describe('Library type data-access', () => {
      describe('Scope shared', () => {
        it('should call the ngrxGenerator for libraries of type data-access', async () => {
          const prefix = 'my-prefix';
          const applicationScope = 'foo';
          const context = 'my-awesome-context';
          const scopeType = ScopeType.SHARED;
          const type = LibraryType.DATA_ACCESS;
          const name = 'my-awesome';
          const libpath = `${context}/${scopeType}/${type}/${name}`;
          const moduleName = `${context}-${scopeType}-${type}-${name}.module`;

          const schema = {
            context,
            scopeType,
            type,
            name,
          };

          jest.spyOn(nrwlAngularGenerators, 'ngrxGenerator');
          jest
            .spyOn(applicationPrompts, 'applicationPrompt')
            .mockReturnValue(Promise.resolve(applicationScope));
          jest.spyOn(generatorUtils, 'angularComponentGenerator');
          jest
            .spyOn(configHelper, 'getPrefix')
            .mockReturnValue(prefix);

          await generateWorkspaceLibrary(appTree, schema);

          expect(nrwlAngularGenerators.ngrxGenerator).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
              name: schema.name,
              module: `libs/${libpath}/src/lib/${moduleName}.ts`,
              directory: '+state',
              minimal: false,
              useDataPersistence: true,
            })
          );
        });

        it('should prefix the state slice', async () => {
          const prefix = 'my-prefix';
          const applicationScope = 'foo';
          const context = 'my-awesome-context';
          const scopeType = ScopeType.SHARED;
          const type = LibraryType.DATA_ACCESS;
          const name = 'my-awesome';
          const libpath = `${context}/${scopeType}/${type}/${name}`;
          const reducerFilePath = `./libs/${libpath}/src/lib/+state/${name}.reducer.ts`;
          const schema = {
            context,
            scopeType,
            type,
            name,
          };

          jest.spyOn(nrwlAngularGenerators, 'ngrxGenerator');
          jest
            .spyOn(applicationPrompts, 'applicationPrompt')
            .mockReturnValue(Promise.resolve(applicationScope));
          jest.spyOn(generatorUtils, 'angularComponentGenerator');
          jest
            .spyOn(configHelper, 'getPrefix')
            .mockReturnValue(prefix);

          await generateWorkspaceLibrary(appTree, schema);

          const reducer = appTree.read(reducerFilePath).toString();

          expect(reducer).toContain(
            `export const ${name.toUpperCase()}_FEATURE_KEY = '${context}_${name}';`
          );
        });
      });

      describe('Scope public', () => {
        it('should call the ngrxGenerator for libraries of type data-access', async () => {
          const prefix = 'my-prefix';
          const applicationScope = 'foo';
          const context = 'my-awesome-context';
          const scopeType = ScopeType.PUBLIC;
          const type = LibraryType.DATA_ACCESS;
          const name = 'my-awesome';
          const libpath = `${context}/${scopeType}/${type}/${name}`;
          const moduleName = `${context}-${scopeType}-${type}-${name}.module`;

          const schema = {
            context,
            scopeType,
            type,
            name,
          };

          jest.spyOn(nrwlAngularGenerators, 'ngrxGenerator');
          jest
            .spyOn(applicationPrompts, 'applicationPrompt')
            .mockReturnValue(Promise.resolve(applicationScope));
          jest.spyOn(generatorUtils, 'angularComponentGenerator');
          jest
            .spyOn(configHelper, 'getPrefix')
            .mockReturnValue(prefix);

          await generateWorkspaceLibrary(appTree, schema);

          expect(nrwlAngularGenerators.ngrxGenerator).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining(
              {
                name: schema.name,
                module: `libs/${libpath}/src/lib/${moduleName}.ts`,
                directory: '+state',
                minimal: false,
                useDataPersistence: true,
              })
          );
        });

        it('should prefix the state slice', async () => {
          const prefix = 'my-prefix';
          const applicationScope = 'foo';
          const context = 'my-awesome-context';
          const scopeType = ScopeType.PUBLIC;
          const type = LibraryType.DATA_ACCESS;
          const name = 'my-awesome';
          const libpath = `${context}/${scopeType}/${type}/${name}`;
          const reducerFilePath = `./libs/${libpath}/src/lib/+state/${name}.reducer.ts`;
          const schema = {
            context,
            scopeType,
            type,
            name,
          };

          jest.spyOn(nrwlAngularGenerators, 'ngrxGenerator');
          jest
            .spyOn(applicationPrompts, 'applicationPrompt')
            .mockReturnValue(Promise.resolve(applicationScope));
          jest.spyOn(generatorUtils, 'angularComponentGenerator');
          jest
            .spyOn(configHelper, 'getPrefix')
            .mockReturnValue(prefix);

          await generateWorkspaceLibrary(appTree, schema);

          const reducer = appTree.read(reducerFilePath).toString();

          expect(reducer).toContain(
            `export const ${name.toUpperCase()}_FEATURE_KEY = '${context}_${name}';`
          );
        });
      });

      describe('Scope app specific', () => {
        it('should call the ngrxGenerator for libraries of type data-access', async () => {
          const prefix = 'my-prefix';
          const applicationScope = 'foo';
          const context = 'my-awesome-context';
          const scopeType = ScopeType.APP_SPECIFIC;
          const type = LibraryType.DATA_ACCESS;
          const scopeAppSpecific = 'my-awesome-app';
          const name = 'my-awesome';
          const libpath = `${context}/${scopeAppSpecific}/${type}/${name}`;
          const moduleName = `${context}-${scopeAppSpecific}-${type}-${name}.module`;
          const schema = {
            context,
            scopeType,
            scopeAppSpecific,
            type,
            name,
          };

          jest.spyOn(nrwlAngularGenerators, 'ngrxGenerator');
          jest
            .spyOn(applicationPrompts, 'applicationPrompt')
            .mockReturnValue(Promise.resolve(applicationScope));
          jest.spyOn(generatorUtils, 'angularComponentGenerator');
          jest
            .spyOn(configHelper, 'getPrefix')
            .mockReturnValue(prefix);

          await generateWorkspaceLibrary(appTree, schema);

          expect(nrwlAngularGenerators.ngrxGenerator).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining(
              {
                name: schema.name,
                module: `libs/${libpath}/src/lib/${moduleName}.ts`,
                directory: '+state',
                minimal: false,
                useDataPersistence: true,
              })
          );
        });

        it('should prefix the state slice', async () => {
          const prefix = 'my-prefix';
          const applicationScope = 'foo';
          const context = 'my-awesome-context';
          const scopeType = ScopeType.APP_SPECIFIC;
          const type = LibraryType.DATA_ACCESS;
          const scopeAppSpecific = 'my-awesome-app';
          const name = 'my-awesome';
          const libpath = `${context}/${scopeAppSpecific}/${type}/${name}`;
          const reducerFilePath = `./libs/${libpath}/src/lib/+state/${name}.reducer.ts`;
          const schema = {
            context,
            scopeType,
            scopeAppSpecific,
            type,
            name,
          };

          jest.spyOn(nrwlAngularGenerators, 'ngrxGenerator');
          jest
            .spyOn(applicationPrompts, 'applicationPrompt')
            .mockReturnValue(Promise.resolve(applicationScope));
          jest.spyOn(generatorUtils, 'angularComponentGenerator');
          jest
            .spyOn(configHelper, 'getPrefix')
            .mockReturnValue(prefix);

          await generateWorkspaceLibrary(appTree, schema);

          const reducer = appTree.read(reducerFilePath).toString();

          expect(reducer).toContain(
            `export const ${name.toUpperCase()}_FEATURE_KEY = '${context}_${scopeAppSpecific}_${name}';`
          );
        });
      });
    });

    describe('Library type model', () => {
      describe('Scope shared', () => {
        it('should generate a library of type model', async () => {
          const prefix = 'prefix';
          const context = 'context';
          const scopeType = ScopeType.SHARED;
          const type = LibraryType.MODEL;
          const name = 'test';
          const modelFileName = `${context}-${scopeType}-${type}-${name}`;
          const libpath = `${context}/${scopeType}/${type}/${name}`;
          const specFilePath = `libs/${libpath}/src/lib/${modelFileName}.spec.ts`;
          const modelFilePath = `libs/${libpath}/src/lib/${modelFileName}.ts`;
          const indexFilePath = `libs/${libpath}/src/index.ts`;
          const schema = {
            context,
            scopeType,
            type,
            name,
          };

          jest.spyOn(generatorUtils, 'angularComponentGenerator');
          jest
            .spyOn(configHelper, 'getPrefix')
            .mockReturnValue(prefix);

          await generateWorkspaceLibrary(appTree, schema);

          const modelFileContent = appTree.read(modelFilePath).toString();
          const indexFileContent = appTree.read(indexFilePath).toString();

          expect(appTree.exists(specFilePath)).toBeFalsy();
          expect(modelFileContent).toContain(
            `export interface ${pascalCase(modelFileName)} {}`
          );
          expect(indexFileContent).toContain(
            `export * from './lib/${modelFileName}';`
          );
        });
      });

      describe('Scope public', () => {
        it('should generate a library of type model', async () => {
          const prefix = 'prefix';
          const context = 'context';
          const scopeType = ScopeType.PUBLIC;
          const type = LibraryType.MODEL;
          const name = 'test';
          const modelFileName = `${context}-${scopeType}-${type}-${name}`;
          const libpath = `${context}/${scopeType}/${type}/${name}`;
          const specFilePath = `libs/${libpath}/src/lib/${modelFileName}.spec.ts`;
          const modelFilePath = `libs/${libpath}/src/lib/${modelFileName}.ts`;
          const indexFilePath = `libs/${libpath}/src/index.ts`;
          const schema = {
            context,
            scopeType,
            type,
            name,
          };

          jest.spyOn(generatorUtils, 'angularComponentGenerator');
          jest
            .spyOn(configHelper, 'getPrefix')
            .mockReturnValue(prefix);

          await generateWorkspaceLibrary(appTree, schema);

          const modelFileContent = appTree.read(modelFilePath).toString();
          const indexFileContent = appTree.read(indexFilePath).toString();

          expect(appTree.exists(specFilePath)).toBeFalsy();
          expect(modelFileContent).toContain(
            `export interface ${pascalCase(modelFileName)} {}`
          );
          expect(indexFileContent).toContain(
            `export * from './lib/${modelFileName}';`
          );
        });
      });

      describe('Scope app specific', () => {
        it('should generate a library of type model', async () => {
          const prefix = 'prefix';
          const context = 'context';
          const scopeType = ScopeType.APP_SPECIFIC;
          const scopeAppSpecific = 'my-awesome-app';
          const type = LibraryType.MODEL;
          const name = 'test';
          const modelFileName = `${context}-${scopeAppSpecific}-${type}-${name}`;
          const libpath = `${context}/${scopeAppSpecific}/${type}/${name}`;
          const specFilePath = `libs/${libpath}/src/lib/${modelFileName}.spec.ts`;
          const modelFilePath = `libs/${libpath}/src/lib/${modelFileName}.ts`;
          const indexFilePath = `libs/${libpath}/src/index.ts`;
          const applicationScope = 'foo';
          const schema = {
            context,
            scopeType,
            scopeAppSpecific,
            type,
            name,
          };

          jest
            .spyOn(applicationPrompts, 'applicationPrompt')
            .mockReturnValue(Promise.resolve(applicationScope));
          jest.spyOn(generatorUtils, 'angularComponentGenerator');
          jest
            .spyOn(configHelper, 'getPrefix')
            .mockReturnValue(prefix);

          await generateWorkspaceLibrary(appTree, schema);

          const modelFileContent = appTree.read(modelFilePath).toString();
          const indexFileContent = appTree.read(indexFilePath).toString();

          expect(appTree.exists(specFilePath)).toBeFalsy();
          expect(modelFileContent).toContain(
            `export interface ${pascalCase(modelFileName)} {}`
          );
          expect(indexFileContent).toContain(
            `export * from './lib/${modelFileName}';`
          );
        });
      });
    });

    describe('Library type util function', () => {
      describe('Scope shared', () => {
        it('should generate a library of type UTIL_FN', async () => {
          const context = 'context';
          const scopeType = ScopeType.SHARED;
          const type = LibraryType.UTIL_FN;
          const name = 'test';
          const libpath = `${context}/${scopeType}/${type}/${name}`;
          const filePath = `libs/${libpath}/src/lib/${context}-${scopeType}-${type}-${name}.ts`;
          const schema = {
            context,
            scopeType,
            type,
            name,
          };

          await generateWorkspaceLibrary(appTree, schema);

          const fileContent = appTree.read(filePath).toString();

          const expectedFunctionName = `${context}${capitalize(scopeType)}${capitalize(camelCase(type))}${capitalize(name)}`;
          const expectedReturnValue = `${context}-${scopeType}-${type}-${name}`;

          expect(fileContent).toEqual(
            `export function ${expectedFunctionName}(): string {
    return '${expectedReturnValue}';
}
`
          );
        });
      });

      describe('Scope public', () => {
        it('should generate a library of type UTIL_FN', async () => {
          const context = 'context';
          const scopeType = ScopeType.PUBLIC;
          const type = LibraryType.UTIL_FN;
          const name = 'test';
          const libpath = `${context}/${scopeType}/${type}/${name}`;
          const filePath = `libs/${libpath}/src/lib/${context}-${scopeType}-${type}-${name}.ts`;
          const schema = {
            context,
            scopeType,
            type,
            name,
          };

          await generateWorkspaceLibrary(appTree, schema);

          const fileContent = appTree.read(filePath).toString();

          const expectedFunctionName = `${context}${capitalize(scopeType)}${capitalize(camelCase(type))}${capitalize(name)}`;
          const expectedReturnValue = `${context}-${scopeType}-${type}-${name}`;

          expect(fileContent).toEqual(
            `export function ${expectedFunctionName}(): string {
    return '${expectedReturnValue}';
}
`
          );
        });
      });

      describe('Scope app specific', () => {
        it('should generate a library of type UTIL_FN', async () => {
          const context = 'context';
          const scopeType = ScopeType.APP_SPECIFIC;
          const scopeAppSpecific = 'my-awesome-app';
          const type = LibraryType.UTIL_FN;
          const name = 'test';
          const libpath = `${context}/${scopeAppSpecific}/${type}/${name}`;
          const filePath = `libs/${libpath}/src/lib/${context}-${scopeAppSpecific}-${type}-${name}.ts`;
          const applicationScope = 'foo';
          const schema = {
            context,
            scopeType,
            scopeAppSpecific,
            type,
            name,
          };

          jest
            .spyOn(applicationPrompts, 'applicationPrompt')
            .mockReturnValue(Promise.resolve(applicationScope));
          jest.spyOn(generatorUtils, 'angularComponentGenerator');

          await generateWorkspaceLibrary(appTree, schema);

          const fileContent = appTree.read(filePath).toString();

          const expectedFunctionName = `${context}${capitalize(camelCase(scopeAppSpecific))}${capitalize(camelCase(type))}${capitalize(name)}`;
          const expectedReturnValue = `${context}-${scopeAppSpecific}-${type}-${name}`;

          expect(fileContent).toEqual(
            `export function ${expectedFunctionName}(): string {
    return '${expectedReturnValue}';
}
`
          );
        });
      });
    });

    describe('Library type Util', () => {
      describe('Shared scope', () => {
        it('should generate a library of type Util', async () => {
          const prefix = 'my-prefix';
          const context = 'my-awesome-context';
          const scopeType = ScopeType.SHARED;
          const type = LibraryType.UTIL;
          const name = 'my-awesome-app';
          const schema = {
            context,
            scopeType,
            type,
            name,
          };

          jest.spyOn(nrwlAngularGenerators, 'libraryGenerator');
          jest
            .spyOn(configHelper, 'getPrefix')
            .mockReturnValue(prefix);

          await generateWorkspaceLibrary(appTree, schema);

          expect(nrwlAngularGenerators.libraryGenerator).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining(
              {
                skipModule: true,
                prefix: `${prefix}-${context}`,
                name: `${context}/${scopeType}/${type}/${name}`
              })
          );
        });
      });

      describe('Public scope', () => {
        it('should generate a library of type Util', async () => {
          const prefix = 'my-prefix';
          const context = 'my-awesome-context';
          const scopeType = ScopeType.PUBLIC;
          const type = LibraryType.UTIL;
          const name = 'my-awesome-app';
          const schema = {
            context,
            scopeType,
            type,
            name,
          };

          jest.spyOn(nrwlAngularGenerators, 'libraryGenerator');
          jest
            .spyOn(configHelper, 'getPrefix')
            .mockReturnValue(prefix);

          await generateWorkspaceLibrary(appTree, schema);

          expect(nrwlAngularGenerators.libraryGenerator).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining(
              {
                skipModule: true,
                prefix: `${prefix}-${context}`,
                name: `${context}/${scopeType}/${type}/${name}`
              })
          );
        });
      });

      describe('App scope', () => {
        it('should generate a library of type Util', async () => {
          const prefix = 'my-prefix';
          const context = 'my-awesome-context';
          const scopeAppSpecific = 'my-awesome-app';
          const scopeType = ScopeType.APP_SPECIFIC;
          const type = LibraryType.UTIL;
          const name = 'my-awesome-app';
          const schema = {
            context,
            scopeType,
            scopeAppSpecific,
            type,
            name,
          };

          jest.spyOn(nrwlAngularGenerators, 'libraryGenerator');
          jest
            .spyOn(applicationPrompts, 'applicationPrompt')
            .mockReturnValue(Promise.resolve(context));
          jest
            .spyOn(configHelper, 'getPrefix')
            .mockReturnValue(prefix);

          await generateWorkspaceLibrary(appTree, schema);

          expect(nrwlAngularGenerators.libraryGenerator).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining(
              {
                skipModule: true,
                prefix: `${prefix}-${context}`,
                name: `${context}/${scopeAppSpecific}/${type}/${name}`
              })
          );
        });
      });
    });
  });
});
