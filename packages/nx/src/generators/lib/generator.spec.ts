import {Tree} from '@nrwl/devkit';
import {createTreeWithEmptyWorkspace} from '@nrwl/devkit/testing';

import * as inquirer from 'inquirer';

import * as applicationPrompts from '../prompts/application.prompt';
import * as configHelper from '../config/config.helper';
import {getContexts} from '../config/config.helper';
import * as generatorUtils from '../utils/generators-angular';
import {DEFAULT_ANGULAR_GENERATOR_COMPONENT_OPTIONS} from '../utils/generators-angular';
import * as nrwlAngularGenerators from '@nrwl/angular/generators';

import generateWorkspaceLibrary from './generator';
import {getAvailableScopeTypes, ScopeType} from '../model/scope-type';
import {AVAILABLE_LIBRARY_TYPES, LibraryType} from '../model/library-type';
import generateWorkspaceApp from "../app/generator";
import {pascalCase} from "../utils/string";

const mockContexts = ['foo', 'bar', 'baz'];
const mockPrefix = 'my-awesome-prefix';

jest
  .spyOn(configHelper, 'createConfigFileIfNonExisting')
  .mockImplementation(() => Promise.resolve());

jest
  .spyOn(configHelper, 'getContexts')
  .mockImplementation(() => Promise.resolve(mockContexts));

jest
  .spyOn(configHelper, 'getPrefix')
  .mockImplementation(() => Promise.resolve(mockPrefix));

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
      const schema = {
        context: 'my-awesome-context',
        scopeType: ScopeType.APP_SPECIFIC,
        type: LibraryType.FEATURE,
        name: 'my-awesome-name',
      };
      jest.spyOn(applicationPrompts, 'applicationPrompt');

      await generateWorkspaceLibrary(appTree, schema);
      expect(applicationPrompts.applicationPrompt).toHaveBeenCalledWith(
        appTree,
        schema.context
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
        prefix: 'prefix', // TODO: cleanup all the prefixes
      };
      await expect(
        async () => await generateWorkspaceLibrary(appTree, schema)
      ).rejects.toThrow(
        `The lib name "${appName}" should not contain spaces. Please use "-" instead.`
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
            name
          };

          jest.spyOn(generatorUtils, 'angularComponentGenerator');
          jest
            .spyOn(configHelper, 'getPrefix')
            .mockReturnValue(Promise.resolve(prefix));

          await generateWorkspaceLibrary(appTree, schema);

          expect(generatorUtils.angularComponentGenerator).toHaveBeenCalledWith(
            appTree,
            {
              ...DEFAULT_ANGULAR_GENERATOR_COMPONENT_OPTIONS,
              project,
              name: schema.name,
              selector,
            }
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
            name
          };

          jest.spyOn(generatorUtils, 'angularComponentGenerator');
          jest
            .spyOn(configHelper, 'getPrefix')
            .mockReturnValue(Promise.resolve(prefix));

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
            name
          };

          jest.spyOn(generatorUtils, 'angularComponentGenerator');
          jest
            .spyOn(configHelper, 'getPrefix')
            .mockReturnValue(Promise.resolve(prefix));

          await generateWorkspaceLibrary(appTree, schema);

          expect(generatorUtils.angularComponentGenerator).toHaveBeenCalledWith(
            appTree,
            {
              ...DEFAULT_ANGULAR_GENERATOR_COMPONENT_OPTIONS,
              project,
              name: schema.name,
              selector,
            }
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
            name
          };

          jest.spyOn(generatorUtils, 'angularComponentGenerator');
          jest
            .spyOn(configHelper, 'getPrefix')
            .mockReturnValue(Promise.resolve(prefix));

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
          const applicationScope = 'foo';
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
            name
          };

          jest
            .spyOn(applicationPrompts, 'applicationPrompt')
            .mockReturnValue(Promise.resolve(applicationScope));
          jest.spyOn(generatorUtils, 'angularComponentGenerator');
          jest
            .spyOn(configHelper, 'getPrefix')
            .mockReturnValue(Promise.resolve(prefix));

          await generateWorkspaceLibrary(appTree, schema);

          expect(generatorUtils.angularComponentGenerator).toHaveBeenCalledWith(
            appTree,
            {
              ...DEFAULT_ANGULAR_GENERATOR_COMPONENT_OPTIONS,
              project,
              name: schema.name,
              selector,
            }
          );
        });

        it(`should export the generated component
  of a app-specific UI library from the index file`, async () => {
          const prefix = 'my-prefix';
          const applicationScope = 'foo';
          const context = 'my-awesome-context';
          const scopeType = ScopeType.APP_SPECIFIC;
          const type = LibraryType.UI;
          const name = 'my-awesome-app';
          const libpath = `${context}/${applicationScope}/${type}/${name}`;
          const schema = {
            context,
            scopeType,
            type,
            name
          };

          jest
            .spyOn(applicationPrompts, 'applicationPrompt')
            .mockReturnValue(Promise.resolve(applicationScope));
          jest.spyOn(generatorUtils, 'angularComponentGenerator');
          jest
            .spyOn(configHelper, 'getPrefix')
            .mockReturnValue(Promise.resolve(prefix));

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
        it('should generate a library of type UI', async () => {
          const prefix = 'my-prefix';
          const context = 'my-awesome-context';
          const scopeType = ScopeType.SHARED;
          const type = LibraryType.PATTERN;
          const name = 'my-awesome-app';
          const project = `${context}-${scopeType}-${type}-${name}`;
          const selector = `${prefix}-${context}-${name}`;
          const schema = {
            context, scopeType, type, name
          };

          jest.spyOn(generatorUtils, 'angularComponentGenerator');
          jest
            .spyOn(configHelper, 'getPrefix')
            .mockReturnValue(Promise.resolve(prefix));

          await generateWorkspaceLibrary(appTree, schema);

          expect(generatorUtils.angularComponentGenerator).toHaveBeenCalledWith(
            appTree,
            {
              ...DEFAULT_ANGULAR_GENERATOR_COMPONENT_OPTIONS,
              project,
              name: schema.name,
              selector,
            }
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
            name
          };

          jest.spyOn(generatorUtils, 'angularComponentGenerator');
          jest
            .spyOn(configHelper, 'getPrefix')
            .mockReturnValue(Promise.resolve(prefix));

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
          const type = LibraryType.PATTERN;
          const name = 'my-awesome-app';
          const project = `${context}-${scopeType}-${type}-${name}`;
          const selector = `${prefix}-${context}-${name}`;
          const schema = {
            context,
            scopeType,
            type,
            name
          };

          jest.spyOn(generatorUtils, 'angularComponentGenerator');
          jest
            .spyOn(configHelper, 'getPrefix')
            .mockReturnValue(Promise.resolve(prefix));

          await generateWorkspaceLibrary(appTree, schema);

          expect(generatorUtils.angularComponentGenerator).toHaveBeenCalledWith(
            appTree,
            {
              ...DEFAULT_ANGULAR_GENERATOR_COMPONENT_OPTIONS,
              project,
              name: schema.name,
              selector,
            }
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
            name
          };

          jest.spyOn(generatorUtils, 'angularComponentGenerator');
          jest
            .spyOn(configHelper, 'getPrefix')
            .mockReturnValue(Promise.resolve(prefix));

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
          const applicationScope = 'foo';
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
            name
          };

          jest
            .spyOn(applicationPrompts, 'applicationPrompt')
            .mockReturnValue(Promise.resolve(applicationScope));
          jest.spyOn(generatorUtils, 'angularComponentGenerator');
          jest
            .spyOn(configHelper, 'getPrefix')
            .mockReturnValue(Promise.resolve(prefix));

          await generateWorkspaceLibrary(appTree, schema);

          expect(generatorUtils.angularComponentGenerator).toHaveBeenCalledWith(
            appTree,
            {
              ...DEFAULT_ANGULAR_GENERATOR_COMPONENT_OPTIONS,
              project,
              name: schema.name,
              selector,
            }
          );
        });

        it(`should export the generated component
  of a app-specific UI library from the index file`, async () => {
          const prefix = 'my-prefix';
          const applicationScope = 'foo';
          const context = 'my-awesome-context';
          const scopeType = ScopeType.APP_SPECIFIC;
          const type = LibraryType.PATTERN;
          const name = 'my-awesome-app';
          const libpath = `${context}/${applicationScope}/${type}/${name}`;
          const schema = {
            context,
            scopeType,
            type,
            name
          };

          jest
            .spyOn(applicationPrompts, 'applicationPrompt')
            .mockReturnValue(Promise.resolve(applicationScope));
          jest.spyOn(generatorUtils, 'angularComponentGenerator');
          jest
            .spyOn(configHelper, 'getPrefix')
            .mockReturnValue(Promise.resolve(prefix));

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
            name
          };

          jest.spyOn(generatorUtils, 'angularComponentGenerator');
          jest
            .spyOn(configHelper, 'getPrefix')
            .mockReturnValue(Promise.resolve(prefix));

          await generateWorkspaceLibrary(appTree, schema);

          expect(generatorUtils.angularComponentGenerator).toHaveBeenCalledWith(
            appTree, {
              ...DEFAULT_ANGULAR_GENERATOR_COMPONENT_OPTIONS,
              project,
              name: `${schema.name}-container`,
              module,
              export: false,
              selector,
            }
          );
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
            .mockReturnValue(Promise.resolve(prefix));

          await generateWorkspaceLibrary(appTree, schema);

          expect(generatorUtils.angularComponentGenerator).toHaveBeenCalledWith(
            appTree, {
              ...DEFAULT_ANGULAR_GENERATOR_COMPONENT_OPTIONS,
              project,
              name: `${schema.name}-container`,
              module,
              export: false,
              selector,
            }
          );
        });
      });

      describe('Scope app specific', () => {
        it('should generate a library of type feature', async () => {
          const prefix = 'prefix';
          const context = 'domain-a';
          const appName = 'test-app';
          const scopeType = ScopeType.APP_SPECIFIC;
          const scope = 'foo';
          const type = LibraryType.FEATURE;
          const scopeAppSpecific = appName;
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
            name
          };

          jest
            .spyOn(applicationPrompts, 'applicationPrompt')
            .mockReturnValue(Promise.resolve(appName));
          jest.spyOn(generatorUtils, 'angularComponentGenerator');
          jest
            .spyOn(configHelper, 'getPrefix')
            .mockReturnValue(Promise.resolve(prefix));

          await generateWorkspaceApp(appTree, {context, name: appName});
          await generateWorkspaceLibrary(appTree, librarySchema);

          expect(generatorUtils.angularComponentGenerator).toHaveBeenCalledWith(
            appTree, {
              ...DEFAULT_ANGULAR_GENERATOR_COMPONENT_OPTIONS,
              project,
              name: `${librarySchema.name}-container`,
              module: moduleName,
              export: false,
              selector,
            }
          );
        });

        it('should add a route configuration for our freshly generated component', async () => {
          const prefix = 'prefix';
          const context = 'domain-a';
          const appName = 'test-app';
          const scope = 'foo';
          const scopeType = ScopeType.APP_SPECIFIC;
          const type = LibraryType.FEATURE;
          const name = 'my-lib';
          const scopeAppSpecific = appName;
          const moduleName = `${context}-${scopeAppSpecific}-${type}-${name}.module`;
          const path = `${context}/${scopeAppSpecific}/${type}/${name}`;
          const modulePath = `libs/${path}/src/lib/${moduleName}.ts`;

          const librarySchema = {
            context,
            scopeType,
            scope,
            scopeAppSpecific,
            type,
            name
          };

          jest
            .spyOn(applicationPrompts, 'applicationPrompt')
            .mockReturnValue(Promise.resolve(appName));
          jest.spyOn(generatorUtils, 'angularComponentGenerator');
          jest
            .spyOn(configHelper, 'getPrefix')
            .mockReturnValue(Promise.resolve(prefix));

          await generateWorkspaceApp(appTree, {context, name: appName});
          await generateWorkspaceLibrary(appTree, librarySchema);

          const appModuleContent = appTree.read(modulePath).toString();
          expect(appModuleContent).toContain(`{ path: '', pathMatch: 'full', component: ${pascalCase(
            `${librarySchema.name}-container`
          )}Component }`)
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
          const name = 'my-awesome-app';
          const libpath = `${context}/${scopeType}/${type}/${name}`;
          const moduleName = `${context}-${scopeType}-${type}-${name}.module`;

          const schema = {
            context,
            scopeType,
            type,
            name
          };

          jest.spyOn(nrwlAngularGenerators, 'ngrxGenerator');
          jest
            .spyOn(applicationPrompts, 'applicationPrompt')
            .mockReturnValue(Promise.resolve(applicationScope));
          jest.spyOn(generatorUtils, 'angularComponentGenerator');
          jest
            .spyOn(configHelper, 'getPrefix')
            .mockReturnValue(Promise.resolve(prefix));

          await generateWorkspaceLibrary(appTree, schema);

          expect(nrwlAngularGenerators.ngrxGenerator).toHaveBeenCalledWith(
            appTree, {
              name: schema.name,
              module: `libs/${libpath}/src/lib/${moduleName}.ts`,
              directory: '+state',
              minimal: false,
              useDataPersistence: true,
            }
          );
        });

      });
    });
  });
});
