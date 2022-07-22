import {Tree, readJson, updateJson} from '@nrwl/devkit';

const ENFORCE_MODULE_BOUNDARIES = '@nrwl/nx/enforce-module-boundaries';

import {ModuleBoundariesUpdateGeneratorOptions} from './schema';

interface GroupedTags {
  context: string[];
  scope: string[];
  type: string[];
}

export default async function updateModuleBoundaries(
  tree: Tree,
  schema: ModuleBoundariesUpdateGeneratorOptions
): Promise<void> {
  const esLintConfiguration = await readJson(tree, '.eslintrc.json');
  const depConstraints = getDepConstraints(esLintConfiguration);
  const groupedTags = getGroupedTags(depConstraints);

  const {context, scope} = schema;

  if (isNewContext(context, groupedTags)) {
    await updateJson(tree, '.eslintrc.json', (json) => {
      getDepConstraints(json).unshift({
        sourceTag: `context:${schema.context}`,
        onlyDependOnLibsWithTags: [`context:${schema.context}`, 'scope:public'],
      });
      return json;
    });
  }

  if (
    isNewScope(scope, groupedTags)
  ) {
    await updateJson(tree, '.eslintrc.json', (json) => {
      getDepConstraints(json).unshift({
        sourceTag: `scope:${schema.scope}`,
        onlyDependOnLibsWithTags: [
          'scope:public',
          'scope:shared',
          `scope:${schema.scope}`,
        ],
      });
      return json;
    });
  }
}

function getGroupedTags(constraints): GroupedTags {
  return Array.from(
    new Set(
      constraints.flatMap((c) => [
        c.sourceTag,
        ...(c.onlyDependOnLibsWithTags ?? []),
      ])
    )
  ).reduce(
    (groupedByCategory, next: string) => {
      const [category, name] = next.split(':');
      groupedByCategory[category] = groupedByCategory[category] ?? [];
      if (!groupedByCategory[category].includes(name)) {
        groupedByCategory[category].push(name);
      }
      return groupedByCategory;
    },
    {context: [], scope: [], type: []}
  ) as GroupedTags;
}

function getDepConstraints(esLintConfiguration) {
  return esLintConfiguration?.overrides.find(
    (o) => o?.rules?.[ENFORCE_MODULE_BOUNDARIES]
  )?.rules?.[ENFORCE_MODULE_BOUNDARIES]?.[1]?.depConstraints;
}

function isNewContext(context: string, groupedTags: GroupedTags): boolean {
  return context && !groupedTags?.context?.includes(context);
}

function isNewScope(scope: string, groupedTags: GroupedTags): boolean {
  return scope &&
    !['public', 'shared'].includes(scope) &&
    !groupedTags?.scope?.includes(scope);
}

