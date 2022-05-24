export function diff(a: any[], b: any[]) {
  return Array.from(
    new Set(
      a
        .filter((item) => !b.includes(item))
        .concat(b.filter((item) => !a.includes(item)))
    )
  );
}
