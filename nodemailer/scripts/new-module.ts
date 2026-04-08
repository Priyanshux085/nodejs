import { mkdirSync, existsSync, writeFileSync, readFileSync, appendFileSync } from "fs";
import { join } from "path";

// Utility helpers
function writeFile(file: string, content: string) {
  writeFileSync(file, content, { flag: "w" });
}

function appendLine(file: string, line: string) {
  appendFileSync(file, line + "\n");
}

const moduleName = process.argv[2];
if (!moduleName) {
  console.error(
    "Please provide a module name as an argument (lowercase, alphanumeric).\nUsage: bun scripts/new-module.ts <module>",
  );
  process.exit(1);
}

if (!/^[a-z][a-zA-Z0-9]+$/.test(moduleName)) {
  console.error(
    "Error: Module name must start with a lowercase letter and contain only alphanumeric characters.",
  );
  process.exit(1);
}

const moduleDir = join("src", "modules", moduleName);
mkdirSync(moduleDir, { recursive: true });

// create boilerplate files
const ServiceName = `${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)}Service`;
// ${moduleName}.service.ts, eg - sample.service.ts
// interface ISampleService, class SampleService
writeFile(
  join(moduleDir, `${moduleName}.service.ts`),
  `// ${moduleName}.service.ts
import { type I${ServiceName} } from "./${moduleName}.definition";

// Define service interface
export class ${ServiceName} implements I${ServiceName} {
  //TODO:: Implement service methods here
}

// Export a singleton instance of the service
export const ${moduleName}Service = new ${ServiceName}();
`,
);

// ${moduleName}.definition.ts
writeFile(
  join(moduleDir, `${moduleName}.definition.ts`),
  `// ${moduleName}.definition.ts
export interface ${moduleName}DTO {
  // Define DTO properties here
}

export interface create${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)}Input {}

// Service Interface
export interface I${ServiceName} {
  //TODO:: Define service method signatures here
}
`,
);

// ${moduleName}.spec.ts
writeFile(
  join(moduleDir, `${moduleName}.spec.ts`),
  `// ${moduleName}.spec.ts
import { type I${ServiceName} } from "./${moduleName}.definition";
import { ${ServiceName} } from "./${moduleName}.service";
import { describe, it, expect, beforeEach } from "vitest";

describe("${ServiceName}", () => {
  let service: I${ServiceName};
  beforeEach(() => { service = new ${ServiceName}(); });
  it("should be defined", () => { expect(service).toBeDefined(); });
});
`,
);

// index.ts
writeFile(
  join(moduleDir, "index.ts"),
  `export * from "./${moduleName}.service";
export * from "./${moduleName}.definition";
`,
);

// update modules index
const modulesIndex = "src/modules/index.ts";
const exportLine = `export * from "./${moduleName}";`;
if (!existsSync(modulesIndex)) {
  writeFile(modulesIndex, exportLine + "\n");
} else {
  const content = readFileSync(modulesIndex, "utf8");
  if (!content.includes(exportLine)) {
    appendLine(modulesIndex, exportLine);
  }
}

// create test samples and mocks
const testDir = "src/test";
mkdirSync(testDir, { recursive: true });

// ${moduleName}.sample.ts
writeFile(
  join(testDir, `${moduleName}.sample.ts`),
  `// ${moduleName}.sample.ts
import { type ${moduleName}DTO } from "@/modules/${moduleName}";
export const sample${moduleName}Data: ${moduleName}DTO = {
  // Populate with sample data
};
`,
);

// ${moduleName}-mocks.ts
const mocksDir = join(testDir, "__mocks__");
mkdirSync(mocksDir, { recursive: true });
writeFile(
  join(mocksDir, `${moduleName}-mocks.ts`),
  `// ${moduleName}-mocks.ts
import { type ${moduleName}DTO } from "@/modules/${moduleName}";
import { vi } from "vitest";

export const setup${moduleName}Mocks = (options: Partial<${moduleName}DTO> = {}) => {
  // Implement mock setup using options to customize return values
};
`,
);

// update mocks index
const mocksIndex = join(mocksDir, "index.ts");
const mocksExportLine = `export * from "./${moduleName}-mocks";`;
if (!existsSync(mocksIndex)) {
  writeFile(mocksIndex, mocksExportLine + "\n");
} else {
  const content = readFileSync(mocksIndex, "utf8");
  if (!content.includes(mocksExportLine)) {
    appendLine(mocksIndex, mocksExportLine);
  }
}

console.log(`Module '${moduleName}' created successfully at '${moduleDir}'.`);
