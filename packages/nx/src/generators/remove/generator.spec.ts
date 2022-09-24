import {createTreeWithEmptyWorkspace} from "@nrwl/devkit/testing";
import {applicationGenerator} from "@nrwl/angular/generators";
import * as nrwlWorkspaceGenerators from '@nrwl/workspace';
import * as nrwlDevkit from "@nrwl/devkit";
import * as inquirer from "inquirer";
import {Tree} from "@nrwl/devkit";

import * as validateModuleBoundaries from "../module-boundaries-validate/generator";
import * as projectPrompts from '../prompts/project.prompt';
import * as configHelper from "../config/config.helper";

import remove from "./generator";

jest
  .spyOn(configHelper, 'createConfigFileIfNonExisting')
  .mockImplementation(() => Promise.resolve());
jest
  .spyOn(configHelper, 'getContexts')
  .mockImplementation(() => []);

describe('move generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace(2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should delete the project and the end to end project if we want to delete all deps', async () => {
    const projectName = 'nx';
    await applicationGenerator(tree, {name: projectName});

    jest.spyOn(projectPrompts, 'projectPrompt').mockReturnValue(Promise.resolve(projectName));
    jest.spyOn(inquirer, 'prompt').mockReturnValue(Promise.resolve({
      answer: 'deleteAll'
    }));
    jest.spyOn(nrwlWorkspaceGenerators, 'removeGenerator');

    await remove(tree, {});

    expect(nrwlWorkspaceGenerators.removeGenerator).toHaveBeenCalledTimes(2);
  });

  it('should only delete the project if we want to delte the selected project only', async () => {
    const projectName = 'nx';
    await applicationGenerator(tree, {name: projectName});

    jest.spyOn(projectPrompts, 'projectPrompt').mockReturnValue(Promise.resolve(projectName));
    jest.spyOn(inquirer, 'prompt').mockReturnValue(Promise.resolve({
      answer: 'forceDelete'
    }));
    jest.spyOn(nrwlWorkspaceGenerators, 'removeGenerator');

    await remove(tree, {});

    expect(nrwlWorkspaceGenerators.removeGenerator).toHaveBeenCalledTimes(1);
  });

  it('should abort the process if we choose to do so', async () => {
    const projectName = 'nx';
    await applicationGenerator(tree, {name: projectName});

    jest.spyOn(projectPrompts, 'projectPrompt').mockReturnValue(Promise.resolve(projectName));
    jest.spyOn(inquirer, 'prompt').mockReturnValue(Promise.resolve({
      answer: 'abort'
    }));
    jest.spyOn(nrwlWorkspaceGenerators, 'removeGenerator');

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    jest.spyOn(process, 'exit').mockImplementation(() => {});

    await remove(tree, {});

    expect(nrwlWorkspaceGenerators.removeGenerator).not.toHaveBeenCalled();
    expect(process.exit).toHaveBeenCalled();
  });

  it('should format the files after deleting the projects', async () => {
    const projectName = 'nx';
    await applicationGenerator(tree, {name: projectName});

    jest.spyOn(projectPrompts, 'projectPrompt').mockReturnValue(Promise.resolve(projectName));
    jest.spyOn(inquirer, 'prompt').mockReturnValue(Promise.resolve({
      answer: 'deleteAll'
    }));
    jest.spyOn(nrwlWorkspaceGenerators, 'removeGenerator');
    jest.spyOn(nrwlDevkit, 'formatFiles');

    await remove(tree, {});

    expect(nrwlDevkit.formatFiles).toHaveBeenCalled();
  });

  it('should validate the module boundaries if we execute the callback', async () => {
    const projectName = 'nx';
    await applicationGenerator(tree, {name: projectName});

    jest.spyOn(projectPrompts, 'projectPrompt').mockReturnValue(Promise.resolve(projectName));
    jest.spyOn(inquirer, 'prompt').mockReturnValue(Promise.resolve({
      answer: 'deleteAll'
    }));
    jest.spyOn(nrwlWorkspaceGenerators, 'removeGenerator');
    jest.spyOn(nrwlDevkit, 'formatFiles');
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    jest.spyOn(validateModuleBoundaries, 'default').mockImplementation(() => Promise.resolve(() => {}));

    await (await remove(tree, {}))();

    expect(validateModuleBoundaries.default).toHaveBeenCalled();
  });
});
