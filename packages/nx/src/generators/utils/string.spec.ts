import {camelCase, capitalize, pascalCase} from "./string";

describe('String utils', () => {

  it('should capitalize a string', () => {
    expect(capitalize('foo')).toEqual('Foo');
  });

  it('should camelCase a string', () => {
    expect(camelCase('foo-bar')).toEqual('fooBar');
  });

  it('should pascaleCase a string', () => {
    expect(pascalCase('foo-bar')).toEqual('FooBar');
  });

});
