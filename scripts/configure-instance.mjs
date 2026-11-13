import { access, writeFile } from "node:fs/promises";
import { instanceFiles } from "./instance-config.mjs";
try {
  const flags = process.argv.slice(2);
  if (!flags.length || flags.includes("--help")) {
    console.log(
      'Uso: npm run instance:init -- --id cliente-a --name "Empresa A" --domain agenda.exemplo.com --project projeto-cliente-a',
    );
    process.exit(0);
  }
  const options = {};
  for (let index = 0; index < flags.length; index += 2) {
    const key = flags[index].replace(/^--/, "");
    if (
      !flags[index].startsWith("--") ||
      !["id", "name", "domain", "project"].includes(key) ||
      !flags[index + 1] ||
      Object.hasOwn(options, key)
    )
      throw new Error(
        "Argumentos inválidos. Execute npm run instance:init -- --help.",
      );
    options[key] = flags[index + 1];
  }
  const files = instanceFiles(options);
  for (const path of Object.keys(files)) {
    let exists = true;
    try {
      await access(path);
    } catch {
      exists = false;
    }
    if (exists)
      throw new Error(
        `${path} já existe. Use outro checkout para o novo cliente; nenhum arquivo foi substituído.`,
      );
  }
  for (const [path, content] of Object.entries(files))
    await writeFile(path, content, { flag: "wx" });
  console.log(
    "Configuração local criada: .env.local e .firebaserc. Nenhuma conta, domínio ou recurso externo foi alterado.",
  );
  console.log(
    "A v0.1 continua demonstrativa/local. Preencher a configuração não conecta autenticação, banco ou recuperação de senha.",
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
