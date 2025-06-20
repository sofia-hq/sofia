// Temporary type declarations for js-yaml to fix build issues
declare module 'js-yaml' {
  export function load(str: string, opts?: any): any;
  export function dump(obj: any, opts?: any): string;
  export class YAMLException extends Error {
    mark?: any;
  }

  const yaml: {
    load: typeof load;
    dump: typeof dump;
    YAMLException: typeof YAMLException;
  };
  export default yaml;
}
