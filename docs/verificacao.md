# Verificação da atualização da base — 13/11/2026

- `npm install`: concluído; auditoria informou zero vulnerabilidades.
- `npm test`: 282 testes unitários passaram.
- `npm run build`: TypeScript do frontend/backend e build Vite aprovados; aviso de tamanho dos pacotes Firebase e ExcelJS.
- Emulador Firestore: 18 testes de regras e persistência passaram, com dados fictícios.
- Configuração padrão demonstrativa; nenhum domínio, banco, administrador ou Worker de produção configurado nesta cópia.
- Caminhos do frontend e Worker usam o identificador da instalação. As regras padrão restringem-se a `demo`; personalize os dois caminhos antes de publicar outra instalação.
- Segredos, arquivos `.env.local`, `.firebaserc`, dependências, builds e logs estão fora do Git.

Os testes não substituem a validação de credenciais, domínio e isolamento em cada nova implantação. Nenhum deploy externo foi feito nesta atualização.

Atualização de 17/11/2026: bloco Agenda por profissional removido do Início, pilha em tela cheia com escala adaptável, botões estáveis e na mesma linha da data, carregamento inicial em etapas com proteção contra gravação antes da leitura. A configuração por cliente foi preservada; nenhum deploy de produção foi realizado nesta atualização da base.
