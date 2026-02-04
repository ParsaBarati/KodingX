import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const schemaMap = {
  task: 'task.schema.json',
  report: 'report.schema.json',
  approval: 'approval.schema.json'
};

function usage() {
  console.error('Usage: node src/validate.js <task|report|approval> <path_to_json>');
}

const [type, filePath] = process.argv.slice(2);
if (!type || !filePath || !schemaMap[type]) {
  usage();
  process.exit(2);
}

const schemaPath = path.join(__dirname, '..', 'schemas', schemaMap[type]);
const schemaRaw = fs.readFileSync(schemaPath, 'utf-8');
const dataRaw = fs.readFileSync(filePath, 'utf-8');

let schema;
let data;
try {
  schema = JSON.parse(schemaRaw);
} catch (err) {
  console.error(`Invalid schema JSON: ${schemaPath}`);
  console.error(err.message);
  process.exit(2);
}

try {
  data = JSON.parse(dataRaw);
} catch (err) {
  console.error(`Invalid data JSON: ${filePath}`);
  console.error(err.message);
  process.exit(2);
}

const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
addFormats(ajv);

const validate = ajv.compile(schema);
const valid = validate(data);

if (!valid) {
  console.error(JSON.stringify(validate.errors, null, 2));
  process.exit(1);
}

console.log('OK');
