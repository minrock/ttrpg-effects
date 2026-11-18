import type { StorybookConfig } from "@storybook/react-vite";
import { normalizePath, type Plugin } from "vite";

const checkout = normalizePath(process.cwd());
const forbiddenModule = (id: string): boolean => {
  const moduleId = normalizePath(id.split("?")[0]);
  return moduleId.includes("/src/render/") || moduleId.includes("/src/server/") || moduleId.includes("/src/infrastructure/server/") || moduleId.includes("/src/renderer/src/ui-lab/") ||
    /\/node_modules\/(?:pixi\.js\/|@pixi\/|three\/|cannon-es\/)/.test(moduleId) ||
    /\/src\/renderer\/src\/(?:App|PlayerApp)\.tsx$/.test(moduleId) ||
    /\/src\/renderer\/src\/components\/(?:MapViewport|SharedDrawingPanel)\.tsx$/.test(moduleId) ||
    /\/src\/renderer\/src\/components\/dice\/DiceOverlay\.tsx$/.test(moduleId) ||
    /\/src\/renderer\/src\/components\/workspace\/PublishedDrawingPreview\.tsx$/.test(moduleId) ||
    /\/src\/web\/(?:ServiceApp|GameEditor|LiveEditor|GuestEntry)\.tsx$/.test(moduleId);
};

function storybookIsolation(): Plugin {
  const modules = new Set<string>();
  return {
    name: "ttrpg-storybook-isolation",
    enforce: "pre",
    transform(_source, id) {
      if (forbiddenModule(id)) this.error(`Storybook no admite el módulo excluido: ${normalizePath(id)}`);
      const moduleId = normalizePath(id.split("?")[0]);
      if (moduleId.startsWith(`${checkout}/`)) modules.add(moduleId.slice(checkout.length + 1));
      return null;
    },
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "storybook-modules.json",
        source: `${JSON.stringify([...modules].sort(), null, 2)}\n`
      });
    }
  };
}

const config: StorybookConfig = {
  stories: ["../src/stories/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y"],
  framework: {
    name: "@storybook/react-vite",
    options: {}
  },
  core: {
    disableTelemetry: true
  },
  features: {
    sidebarOnboardingChecklist: false,
    menuOnboardingChecklist: false
  },
  viteFinal: async config => ({
    ...config,
    plugins: [...(config.plugins ?? []), storybookIsolation()]
  })
};

export default config;
