import glob from "fast-glob";
import fs from "fs";

import { alerts } from "./alerts.js";
import { ConfigOptions } from "./types.js";
import { fileToClassNames } from "../sass/index.js";
import {
  classNamesToTypeDefinitions,
  getTypeDefinitionPath,
} from "../typescript/index.js";

export const listDifferent = async (
  pattern: string,
  options: ConfigOptions
): Promise<void> => {
  // Find all the files that match the provided pattern.
  const files = glob.sync(pattern);

  if (!files || !files.length) {
    alerts.notice("No files found.");
    return;
  }

  // Wait for all the files to be checked.
  await Promise.all(files.map((file) => checkFile(file, options))).then(
    (results) => {
      results.includes(false) && process.exit(1);
    }
  );
};

export const checkFile = (
  file: string,
  options: ConfigOptions
): Promise<boolean> => {
  return new Promise((resolve) =>
    fileToClassNames(file, options)
      .then(async (classNames) => {
        const typeDefinition = await classNamesToTypeDefinitions({
          classNames: classNames,
          ...options,
        });

        if (!typeDefinition) {
          // Assume if no type defs are necessary it's fine
          resolve(true);
          return;
        }

        const path = getTypeDefinitionPath(file, options);

        if (!fs.existsSync(path)) {
          alerts.error(
            `[INVALID TYPES] Type file needs to be generated for ${file} `
          );
          resolve(false);
          return;
        }

        const content = fs.readFileSync(path, { encoding: "utf8" });

        if (content !== typeDefinition) {
          alerts.error(`[INVALID TYPES] Check type definitions for ${file}`);
          resolve(false);
          return;
        }

        resolve(true);
      })
      .catch((error) => {
        alerts.error(
          `An error occurred checking ${file}:\n${JSON.stringify(error)}`
        );
        resolve(false);
      })
  );
};
