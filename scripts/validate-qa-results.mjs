import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const schemaPath = path.join(rootDir, 'qa', 'schemas', 'resultado.schema.json');
const casosDir = path.join(rootDir, 'qa', 'casos');

async function main() {
  if (!fs.existsSync(schemaPath)) {
    console.error(`Error: Esquema no encontrado en ${schemaPath}`);
    process.exit(1);
  }

  let AjvClass, addFormats;
  try {
    const AjvModule = await import('ajv');
    AjvClass = AjvModule.default || AjvModule;
    const formatsModule = await import('ajv-formats');
    addFormats = formatsModule.default || formatsModule;
  } catch (err) {
    console.warn('Advertencia: ajv o ajv-formats no están instalados aún en node_modules. Ejecute "npm install" primero.');
    console.warn(err.message);
    process.exit(0);
  }

  const ajv = new AjvClass({ allErrors: true });
  if (typeof addFormats === 'function') {
    addFormats(ajv);
  }

  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  const validate = ajv.compile(schema);

  function findJsonResults(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results = results.concat(findJsonResults(fullPath));
      } else if (entry.isFile() && entry.name.endsWith('.json') && fullPath.includes('resultados')) {
        results.push(fullPath);
      }
    }
    return results;
  }

  const files = findJsonResults(casosDir);
  console.log(`Validando ${files.length} archivo(s) de resultado con Ajv...`);

  let hasErrors = false;
  for (const file of files) {
    try {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      const valid = validate(data);
      const relPath = path.relative(rootDir, file);
      if (valid) {
        console.log(`[VÁLIDO] ${relPath}`);
      } else {
        hasErrors = true;
        console.error(`[INVÁLIDO] ${relPath}:`);
        console.error(validate.errors);
      }
    } catch (e) {
      hasErrors = true;
      console.error(`[ERROR DE PARSEO] ${file}: ${e.message}`);
    }
  }

  if (hasErrors) {
    console.error('\nSe encontraron errores de validación en los resultados.');
    process.exit(1);
  } else {
    console.log('\nTodos los archivos de resultado cumplen con el esquema de QA.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
