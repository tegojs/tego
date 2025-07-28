/**
 * 可构建的项目，可以设计成兼容 pnpm、npm、yarn 等 monorepo
 */
export interface IProject {
  dir: string;
  manifest: {
    name: string;
  };
}

export type IBuildContext =
  | {
      onlyTar: true;
      sourcemap?: boolean;
      dts?: boolean;
      retry?: boolean;
      development?: boolean;
      tar?: boolean;
    }
  | {
      onlyTar?: false | undefined;
      sourcemap: boolean;
      dts: boolean;
      retry: boolean;
      development: boolean;
      tar: boolean;
    };
export interface IBuildablePackage {
  name: string;
  dir: string;
  context: IBuildContext;
  build(): Promise<void>;
}

export interface IBuilder {
  build(): Promise<void>;
}
