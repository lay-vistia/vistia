import { build } from "esbuild";
import { readdir, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const LAMBDAS_DIR = path.resolve("apps/lambdas");
const DIST_DIR = path.resolve("dist");

async function main() {
  await mkdir(DIST_DIR, { recursive: true });

  const entries = await readdir(LAMBDAS_DIR, { withFileTypes: true });
  const lambdaDirs = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);

  for (const name of lambdaDirs) {
    const entry = path.join(LAMBDAS_DIR, name, "handler.ts");
    const outDir = path.join(DIST_DIR, name);
    const outfile = path.join(outDir, "index.js");

    await mkdir(outDir, { recursive: true });

    await build({
      entryPoints: [entry],
      outfile,
      bundle: true,
      platform: "node",
      target: "node20",
      sourcemap: false,
      format: "cjs",
      external: ["sharp"],
    });

    const zipHint = path.join(outDir, `${name}.zip`);
    await writeFile(path.join(outDir, ".zip-hint"), `zip -j ${zipHint} ${outfile}\n`);
  }

  console.log("Lambda build completed.");
  console.log("Zip example: zip -j dist/manage-signup/manage-signup.zip dist/manage-signup/index.js");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
