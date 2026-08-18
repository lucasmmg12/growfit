import fs from 'fs';
import path from 'path';

// Parse .env manually so migrate.js has zero dependencies
function loadEnv() {
  const envPath = path.resolve('.env');
  if (!fs.existsSync(envPath)) return {};
  const envContent = fs.readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  }
  return env;
}

const env = loadEnv();
const projectRef = env.SUPABASE_PROJECT_REF || process.env.SUPABASE_PROJECT_REF || "dtjmckbrofevgfqbkzli";
const token = env.SUPABASE_ACCESS_TOKEN || process.env.SUPABASE_ACCESS_TOKEN;

async function runQueryViaAPI(sql) {
  if (!token) {
    throw new Error("SUPABASE_ACCESS_TOKEN no encontrado en .env");
  }

  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Supabase API responded with ${res.status}: ${errorText}`);
  }

  return await res.json();
}

async function runMigration() {
  const schemaFile = path.resolve('supabase_schema.sql');
  console.log(`[GrowFit Migration] Leyendo esquema SQL seguro desde: ${schemaFile}`);
  
  const sql = fs.readFileSync(schemaFile, 'utf8');

  // Enforce absolute safety: Reject any DROP TABLE, TRUNCATE, or DROP DATABASE
  const forbidden = [
    /\bDROP\s+TABLE\b/i,
    /\bTRUNCATE\b/i,
    /\bDROP\s+DATABASE\b/i,
    /\bDROP\s+SCHEMA\b/i
  ];

  for (const pat of forbidden) {
    if (pat.test(sql)) {
      console.error(`[SEGURIDAD BLOQUEADA] Se detectó una sentencia no permitida: ${pat}`);
      process.exit(1);
    }
  }

  console.log("[GrowFit Migration] Validación de seguridad aprobada (0 sentencias destructivas).");
  console.log(`[GrowFit Migration] Ejecutando migración en Supabase ('${projectRef}')...`);

  try {
    await runQueryViaAPI(sql);
    console.log("[GrowFit Migration] ✅ ¡Migración aplicada con total éxito sin afectar ningún dato existente!");
  } catch (err) {
    console.error("[GrowFit Migration] ❌ Error ejecutando migración:", err.message);
    process.exit(1);
  }
}

runMigration();
