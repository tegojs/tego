import { PLUGIN_PATTRN } from './build/constant';
import { AppWebPackage } from './buildable-packages/app-web-package';
import { LibPackage } from './buildable-packages/lib-package';
import { PluginPackage } from './buildable-packages/plugin-package';
import { SkipPackage } from './buildable-packages/skip-package';
import { getPackages } from './get-packages';
import { IBuildablePackage, IBuildContext, IProject } from './interfaces';

export class TachybaseBuilder {
  constructor(private ctx: IBuildContext) {}

  #messages: any[] = [];

  async build(pkgs: string[]) {
    process.env.NODE_ENV = this.ctx.development ? 'development' : 'production';

    let packages = await getPackages(pkgs);

    if (packages.length === 0) {
      console.warn('[build] No package matched');
      return;
    }

    const buildable = createBuildablePackages(packages, this.ctx);
    for (const pkg of buildable) {
      try {
        await pkg.build();
      } catch (error) {
        this.#messages.push([pkg.name, error]);
      }
    }
    if (this.#messages.length > 0) {
      this.#messages.forEach((message) => {
        console.log(`🐛 [${message[0]}]`);
        console.error(message[1]);
      });

      console.log('build failed');
      process.exit(1);
    }
  }
}

export function createBuildablePackages(projects: IProject[], context: IBuildContext): IBuildablePackage[] {
  return projects.map((project) => {
    const name = project.manifest.name;
    const dir = project.dir;

    if (PLUGIN_PATTRN.test(name)) {
      return new PluginPackage(name, dir, context);
    }

    if (name === '@tego/web') {
      return new AppWebPackage(name, dir, context);
    }

    if (name === '@tego/devkit') {
      return new SkipPackage(name, dir, context);
    }

    return new LibPackage(name, dir, context);
  });
}
