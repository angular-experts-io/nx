export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function camelCase(str: string): string {
  return str.replace(/[-_\s]+(.)?/g, (match, chr) =>
    chr ? chr.toUpperCase() : ''
  );
}

export function pascalCase(str: string): string {
  return capitalize(camelCase(str));
}
