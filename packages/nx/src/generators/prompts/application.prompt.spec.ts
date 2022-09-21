import {createTreeWithEmptyWorkspace} from "@nrwl/devkit/testing";
import * as nrwlDevkit from '@nrwl/devkit';
import * as inquirier from "inquirer";
import {Tree} from "@nrwl/devkit";

import {applicationPrompt} from "./application.prompt";

describe('ApplicationPrompt', () => {

  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace(2);
  });

  it('should return an empty list if no apps are found under the specified context', async () => {
    const context = 'foo';
    const projects = new Map();
    projects.set('bar-test', {projectType: 'application'});
    projects.set('bar-test-e2e', {projectType: 'application'});
    projects.set('baz-test', {projectType: 'application'});
    projects.set('baz-test-e2e', {projectType: 'application'});

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    jest.spyOn(process, 'exit').mockImplementation(() => {});
    jest.spyOn(nrwlDevkit, 'getProjects').mockReturnValue(projects);
    jest.spyOn(console, 'log');

    await applicationPrompt(tree, context)

    expect(console.log).toHaveBeenCalledWith(`🤷‍️ no application for context ${context} found`);
    expect(process.exit).toHaveBeenCalled();
  });

  it('should return the selected application', async () => {
    const context = 'bar';
    const projects = new Map();
    projects.set('bar-test', {projectType: 'application'});
    projects.set('bar-test-e2e', {projectType: 'application'});
    projects.set('baz-test', {projectType: 'application'});
    projects.set('baz-test-e2e', {projectType: 'application'});

    jest.spyOn(nrwlDevkit, 'getProjects').mockReturnValue(projects);

    jest.spyOn(inquirier, 'prompt').mockReturnValue({
      selectedApplication: 'bar'
    });

    expect(await applicationPrompt(tree, context)).toBe('bar');
  });
});
