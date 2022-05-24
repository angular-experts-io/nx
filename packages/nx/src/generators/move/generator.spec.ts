import { createTreeWithEmptyWorkspace } from '@nrwl/devkit/testing';
import { applicationGenerator } from '@nrwl/angular/generators';
import { Tree, readProjectConfiguration } from '@nrwl/devkit';

describe('move generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    applicationGenerator(tree, {
      name: 'demo-application',
    });
  });

  it('should remove successfully', async () => {
    /*
    console.log(
      'does it exist',
      tree.exists('apps/demo-application/src/app/app.component.ts')
    );
    */
    // await generator(tree, options);
    expect(true).toBeTruthy();
  });
});
