const Ajv = require("ajv");
const fs = require("fs");
const path = require("path");

function createValidator() {
  const schemaPath = path.join(__dirname, "..", "..", "reconstruction", "source-packet.schema.json");
  const schemaContent = fs.readFileSync(schemaPath, "utf-8");
  const schema = JSON.parse(schemaContent);

  const ajv = new Ajv({
    allErrors: true,
    strict: true
  });

  const validate = ajv.compile(schema);

  return {
    validateManifestSchema(manifest) {
      const valid = validate(manifest);
      return {
        valid,
        errors: valid ? [] : validate.errors
      };
    }
  };
}

module.exports = { createValidator };
