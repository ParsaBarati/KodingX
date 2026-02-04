import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadSchema(schemaDir, name) {
  const schemaPath = path.join(schemaDir, name);
  const raw = fs.readFileSync(schemaPath, 'utf-8');
  return JSON.parse(raw);
}

export function createValidators(schemaDir = path.join(__dirname, '..', 'schemas')) {
  const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
  addFormats(ajv);

  const taskSchema = loadSchema(schemaDir, 'task.schema.json');
  const reportSchema = loadSchema(schemaDir, 'report.schema.json');
  const approvalSchema = loadSchema(schemaDir, 'approval.schema.json');

  return {
    validateTask: ajv.compile(taskSchema),
    validateReport: ajv.compile(reportSchema),
    validateApproval: ajv.compile(approvalSchema)
  };
}
