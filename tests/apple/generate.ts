import { readFileSync } from "node:fs";
import { renderApple, writeApple } from "../../implementation/apple/render.ts";

// Writes the files for the fixture application into the directory given as the first argument.
const fixture = JSON.parse(readFileSync(new URL("../fixtures/application.json", import.meta.url), "utf8"));
writeApple(process.argv[2], renderApple(fixture.settings, fixture.options).files);
