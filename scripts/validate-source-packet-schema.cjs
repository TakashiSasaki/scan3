const fs = require("fs");
const path = require("path");
const { createValidator } = require("./lib/source-packet-schema-validator.cjs");

function main() {
  const args = process.argv.slice(2);
  if (args.length !== 1) {
    console.error("Usage: node validate-source-packet-schema.cjs <packet-root-or-manifest>");
    process.exit(1);
  }

  let inputPath = args[0];
  if (fs.statSync(inputPath).isDirectory()) {
    inputPath = path.join(inputPath, "manifest.json");
  }

  if (!fs.existsSync(inputPath)) {
    console.error(`Manifest file not found: ${inputPath}`);
    process.exit(1);
  }

  const manifestStr = fs.readFileSync(inputPath, "utf-8");
  let manifest;
  try {
    manifest = JSON.parse(manifestStr);
  } catch (e) {
    console.error("Failed to parse manifest as JSON:");
    console.error(e.message);
    process.exit(1);
  }

  const validator = createValidator();
  const { valid, errors } = validator.validateManifestSchema(manifest);

  if (valid) {
    console.log("schema-valid");
    process.exit(0);
  } else {
    console.log("schema-invalid");
    console.log(JSON.stringify(errors, null, 2));
    process.exit(1);
  }
}

main();
