import {createTreeWithEmptyWorkspace} from "@nrwl/devkit/testing";
import * as inquirier from 'inquirer';
import {Tree} from "@nrwl/devkit";

import * as configHelper from "../config/config.helper";

import {contextPrompt} from "./context.prompt";

describe('Context prompt', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace(2);
  });

  it('should return the selected context', async () => {
    const selectedContext = 'foo';
    const message = 'Choose a context'
    const contexts = ['foo', 'bar', 'baz'];
    jest.spyOn(inquirier, 'prompt').mockReturnValue({
      selectedContext
    });
    jest.spyOn(configHelper, 'getContexts').mockReturnValue(contexts);


    expect(
      await contextPrompt(tree, message)
    ).toBe(selectedContext);

    expect(inquirier.prompt).toHaveBeenCalledWith(
      {
        type: 'list',
        name: 'selectedContext',
        message,
        choices: contexts,
      });
  });
});
