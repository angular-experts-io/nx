import {Tree} from '@nrwl/devkit';
import {createTreeWithEmptyWorkspace} from '@nrwl/devkit/testing';

import * as inquirer from 'inquirer';

import * as applicationPrompts from '../prompts/application.prompt';
import * as configHelper from '../config/config.helper';
import * as generatorUtils from '../utils/generators-angular';

import generateWorkspaceLibrary from './generator';
import {getAvailableScopeTypes, ScopeType} from '../model/scope-type';
import {AVAILABLE_LIBRARY_TYPES, LibraryType} from '../model/library-type';
import {getContexts} from '../config/config.helper';
import {DEFAULT_ANGULAR_GENERATOR_COMPONENT_OPTIONS} from '../utils/generators-angular';
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
          const schema = {
            context: 'my-awesome-context',
            scopeType: ScopeType.SHARED,
            type: LibraryType.UI,
            name: 'my-awesome-app',
          };

          const project = `${schema.context}-${schema.scopeType}-${schema.type}-${schema.name}`;
          const selector = `${prefix}-${schema.context}-${schema.name}`;

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
          const schema = {
            context: 'my-awesome-context',
            scopeType: ScopeType.SHARED,
            type: LibraryType.UI,
            name: 'my-awesome-app',
          };
          const libpath = `${schema.context}/${schema.scopeType}/${schema.type}/${schema.name}`;

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
          const schema = {
            context: 'my-awesome-context',
            scopeType: ScopeType.PUBLIC,
            type: LibraryType.UI,
            name: 'my-awesome-app',
          };

          const project = `${schema.context}-${schema.scopeType}-${schema.type}-${schema.name}`;
          const selector = `${prefix}-${schema.context}-${schema.name}`;

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
          const schema = {
            context: 'my-awesome-context',
            scopeType: ScopeType.PUBLIC,
            type: LibraryType.UI,
            name: 'my-awesome-app',
          };
          const libpath = `${schema.context}/${schema.scopeType}/${schema.type}/${schema.name}`;

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
          const schema = {
            context: 'context',
            scopeType: ScopeType.APP_SPECIFIC,
            type: LibraryType.UI,
            name: 'test',
          };

          const project = `${schema.context}-${applicationScope}-${schema.type}-${schema.name}`;
          const selector = `${prefix}-${schema.context}-${applicationScope}-${schema.name}`;

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

          const schema = {
            context: 'my-awesome-context',
            scopeType: ScopeType.APP_SPECIFIC,
            type: LibraryType.UI,
            name: 'my-awesome-app',
          };
          const libpath = `${schema.context}/${applicationScope}/${schema.type}/${schema.name}`;

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
          const schema = {
            context: 'my-awesome-context',
            scopeType: ScopeType.SHARED,
            type: LibraryType.PATTERN,
            name: 'my-awesome-app',
          };

          const project = `${schema.context}-${schema.scopeType}-${schema.type}-${schema.name}`;
          const selector = `${prefix}-${schema.context}-${schema.name}`;

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
          const schema = {
            context: 'my-awesome-context',
            scopeType: ScopeType.SHARED,
            type: LibraryType.PATTERN,
            name: 'my-awesome-app',
          };
          const libpath = `${schema.context}/${schema.scopeType}/${schema.type}/${schema.name}`;

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
          const schema = {
            context: 'my-awesome-context',
            scopeType: ScopeType.PUBLIC,
            type: LibraryType.PATTERN,
            name: 'my-awesome-app',
          };

          const project = `${schema.context}-${schema.scopeType}-${schema.type}-${schema.name}`;
          const selector = `${prefix}-${schema.context}-${schema.name}`;

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
          const schema = {
            context: 'my-awesome-context',
            scopeType: ScopeType.PUBLIC,
            type: LibraryType.PATTERN,
            name: 'my-awesome-app',
          };
          const libpath = `${schema.context}/${schema.scopeType}/${schema.type}/${schema.name}`;

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
          const schema = {
            context: 'context',
            scopeType: ScopeType.APP_SPECIFIC,
            type: LibraryType.PATTERN,
            name: 'test',
          };

          const project = `${schema.context}-${applicationScope}-${schema.type}-${schema.name}`;
          const selector = `${prefix}-${schema.context}-${applicationScope}-${schema.name}`;

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

          const schema = {
            context: 'my-awesome-context',
            scopeType: ScopeType.APP_SPECIFIC,
            type: LibraryType.PATTERN,
            name: 'my-awesome-app',
          };
          const libpath = `${schema.context}/${applicationScope}/${schema.type}/${schema.name}`;

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
          const schema = {
            context: 'context',
            scopeType: ScopeType.SHARED,
            type: LibraryType.FEATURE,
            name: 'test',
          };

          const project = `${schema.context}-${schema.scopeType}-${schema.type}-${schema.name}`;
          const selector = `${prefix}-${schema.context}-${schema.name}`;
          const module = `${schema.context}-${schema.scopeType}-${schema.type}-${schema.name}.module`;

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
          const schema = {
            context: 'context',
            scopeType: ScopeType.PUBLIC,
            type: LibraryType.FEATURE,
            name: 'test',
          };

          const project = `${schema.context}-${schema.scopeType}-${schema.type}-${schema.name}`;
          const selector = `${prefix}-${schema.context}-${schema.name}`;
          const module = `${schema.context}-${schema.scopeType}-${schema.type}-${schema.name}.module`;

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
          const librarySchema = {
            context,
            scopeType: ScopeType.APP_SPECIFIC,
            scope: appName,
            scopeAppSpecific: appName,
            type: LibraryType.FEATURE,
            name: 'my-lib',
          };
          const project = `${librarySchema.context}-${librarySchema.scope}-${librarySchema.type}-${librarySchema.name}`;
          const selector = `${prefix}-${librarySchema.context}-${librarySchema.scope}-${librarySchema.name}`;
          const moduleName = `${librarySchema.context}-${librarySchema.scope}-${librarySchema.type}-${librarySchema.name}.module`;

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
          const librarySchema = {
            context,
            scopeType: ScopeType.APP_SPECIFIC,
            scope: appName,
            scopeAppSpecific: appName,
            type: LibraryType.FEATURE,
            name: 'my-lib',
          };
          const moduleName = `${librarySchema.context}-${librarySchema.scope}-${librarySchema.type}-${librarySchema.name}.module`;
          const path = `${context}/${librarySchema.scope}/${librarySchema.type}/${librarySchema.name}`;
          const modulePath = `libs/${path}/src/lib/${moduleName}.ts`;
          const appModuleContent = appTree.read(modulePath).toString();

          jest
            .spyOn(applicationPrompts, 'applicationPrompt')
            .mockReturnValue(Promise.resolve(appName));
          jest.spyOn(generatorUtils, 'angularComponentGenerator');
          jest
            .spyOn(configHelper, 'getPrefix')
            .mockReturnValue(Promise.resolve(prefix));

          await generateWorkspaceApp(appTree, {context, name: appName});
          await generateWorkspaceLibrary(appTree, librarySchema);

          expect(appModuleContent).toContain(`{ path: '', pathMatch: 'full', component: ${pascalCase(
            `${librarySchema.name}-container`
          )}Component }`)
        });
      });
    });
  });
});
