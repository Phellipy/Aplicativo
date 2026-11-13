# Acesso profissional por usuário e senha

**Estado desta base:** código de backend disponível, sem Worker ou segredo de produção configurado. Cada cliente precisa de implantação própria. A implementação de origem foi validada com criação de acesso, login, cliente e agendamento; isso não provisiona esta cópia.

O backend é um Cloudflare Worker independente do Hosting. Não é necessário transferir o domínio ou alterar servidores DNS. Não habilita Blaze, Cloud Functions, Storage ou cobranças. Workers e Firebase têm franquias e limites próprios; usar somente o plano gratuito aprovado nesta instalação.

## Funcionamento e autorização

- O administrador continua autenticando por e-mail/senha pelo SDK oficial do Firebase. A recuperação por e-mail permanece exclusiva desse fluxo.
- Em Profissionais → Acesso, o administrador define um usuário único de 3 a 32 caracteres e senha de 12 a 128 caracteres.
- O serviço valida o token administrativo no Firebase, o projeto de origem, a expiração, a revogação informada pelo provedor e o documento administrativo ativo no Firestore.
- A senha profissional é gerida pelo Firebase Authentication. Usa-se uma conta de credencial interna com endereço técnico aleatório e sem caixa postal; esse endereço e os tokens do provedor nunca são entregues ao profissional. Não há senha nem hash de senha nos documentos de gestão.
- O profissional envia usuário/senha ao Worker. Após a validação pelo provedor, recebe uma sessão opaca de oito horas, armazenada somente na sessão do navegador. O banco armazena apenas o SHA-256 do token, a validade e a versão de acesso.
- Não há endpoint de troca ou recuperação de senha profissional. Uma sessão profissional não é um token do Firebase e não pode chamar APIs do Authentication para alterar a credencial interna.
- Redefinir a senha suspende o acesso antes da alteração e avança a versão, invalidando todas as sessões anteriores. Uma falha mantém a conta suspensa. Em redefinição interrompida, aguarde dois minutos antes de repetir.
- Desabilitar ou excluir o cadastro bloqueia novas requisições de sessões existentes. Sair revoga a sessão atual. O serviço relê o vínculo e o cadastro a cada operação.
- O profissional recebe o próprio cadastro resumido, jornada, atendimentos e procedimentos habilitados, além dos nomes e telefones dos clientes ativos do estabelecimento para agendar. CPF/CNPJ e histórico de retorno não são enviados no diretório. A área oferece consulta de resultados próprios, confirmação, falta, cancelamento, conclusão/pagamento e reagendamento validado. Pode cadastrar clientes (nome e telefone, sem duplicar telefone existente) e criar atendimentos simples ou recorrentes exclusivamente para si. Preço, repasse, duração e disponibilidade são verificados no servidor. Jornada/ausências, catálogo, repasses, edição/exclusão de clientes e senhas continuam sob gestão do administrador.
- O Worker não confia em profissional, cliente, valor ou repasse enviados pelo navegador. Atualizações usam os dados existentes, uma lista de ações permitidas, revisão do registro e precondições no Firestore. Concluir atendimento e atualizar a visita do cliente ocorrem no mesmo commit.
- O Firestore permanece fechado para acesso direto dos profissionais. As regras existentes não são abertas nem substituídas pelo filtro visual.

## Configuração de produção

1. Autorize a ferramenta oficial Wrangler na conta Cloudflare escolhida. Use uma versão fixa, como `wrangler@4.161.0`, com Node.js 22+.
2. Ajuste `name`, `FIREBASE_PROJECT_ID`, `INSTANCE_ID` e `ALLOWED_ORIGINS` de `wrangler.jsonc` para o cliente. `INSTANCE_ID` deve coincidir com `VITE_INSTANCE_ID` e os caminhos autorizados em `firestore.rules`. Use origens HTTPS exatas; não inclua origens de outros clientes. Prepare uma conta de serviço exclusiva no projeto `seu-projeto-firebase`, com somente `roles/datastore.user` e `roles/firebaseauth.admin`. Não use a credencial pessoal do Firebase CLI no Worker.
3. Configure `FIREBASE_SERVICE_ACCOUNT` como segredo do Worker contendo a credencial dessa conta de serviço. Nunca inclua o JSON no Git, em variável `VITE_`, em logs, em screenshots ou no chat. Configure `FIREBASE_WEB_API_KEY` como segredo separado.
4. `wrangler.jsonc` já fixa o projeto e os domínios de origem aprovados. As três bindings de rate limit são obrigatórias: 20 tentativas/minuto por IP, 5 por usuário e 120 requisições/minuto por IP. Os contadores da Cloudflare são locais a cada ponto de presença, não um contador global.
5. Execute `wrangler deploy --config access-backend/wrangler.jsonc`. Confirme o Worker em Workers Free. A coleta de logs de requisição está desabilitada; nunca registre corpo, cabeçalho Authorization, senha ou token.
6. Verifique `/health`, o bloqueio de origem desconhecida e as rotas protegidas. Nenhuma conta profissional deve ser ativada apenas porque o endpoint de saúde responde.
7. Preencha a URL HTTPS real do Worker em `.env.local` como `VITE_PROFESSIONAL_API_URL`, gere o build e publique o frontend. Essa URL é pública e não contém segredos.
8. Entre como administrador e configure um acesso de teste em um cadastro explicitamente destinado ao teste. Confira login, isolamento, senha incorreta, suspensão, logout e redefinição antes de liberar os demais usuários.
9. O seletor Profissional na tela de login aparece somente quando o serviço informa que existe algum acesso ativo para profissional habilitado. Sem serviço configurado, não aparece uma integração fictícia.

Comandos de publicação devem ser executados a partir da raiz do repositório. Exemplos, após instalar/autorizar a ferramenta oficial:

```bash
npm run test:backend
npm run check:backend
npm run build
wrangler deploy --dry-run --config access-backend/wrangler.jsonc
wrangler secret put FIREBASE_SERVICE_ACCOUNT --config access-backend/wrangler.jsonc
wrangler secret put FIREBASE_WEB_API_KEY --config access-backend/wrangler.jsonc
wrangler deploy --config access-backend/wrangler.jsonc
firebase deploy --only hosting --project seu-projeto-firebase
```

A entrada dos segredos deve ocorrer pelo prompt seguro/entrada padrão da ferramenta. Não passe valores como argumentos do shell. Uma nova chave criada para a instalação deve ser revogada se o upload seguro falhar. Rotacione a credencial exclusiva do serviço quando necessário.

## Documentos privados

`professionalAccess/{professionalId}` contém vínculo, conta técnica, versão e estado; `professionalLogins/{username}` associa usuário ao profissional; `professionalSessions/{hash}` contém sessão e expiração. Nenhum deles é legível ou gravável pelo SDK do aplicativo, inclusive pelo administrador: a configuração passa pelo endpoint autorizado.

Sessões expiradas não são reutilizadas. Ainda não há limpeza automática desses documentos; fazer manutenção administrativa controlada, sem ativar TTL pago por conta própria. Não gravar senhas ou tokens brutos nessa manutenção.

## Limites desta primeira área profissional

O diretório suporta até 10.000 clientes. A consulta carrega até 5.000 atendimentos próprios e exige atualização manual para refletir mudanças de outros aparelhos. Acima desse volume, o serviço recusa a consulta explicitamente; não retorna um consolidado incompleto silenciosamente. A gravação é online. A disponibilidade de horários é verificada no servidor, mas o agendamento administrativo já existente não usa um bloqueio global de calendário; operações simultâneas de horários diferentes ainda exigem conferência operacional. Não há auditoria completa, MFA profissional, gestão de sessão por dispositivo ou backup automático nesta etapa.

## Validação

Testes cobrem administrador sem permissão, tokens inválidos/expirados/revogados ou de outro projeto, credencial incorreta, usuário duplicado, suspensão, troca de senha, falha intermediária, sessão expirada, logout, isolamento de dados, manipulação de campos, revisões antigas, ausência de rota de recuperação profissional, origens inesperadas e limites de requisição. A integração REST com commit e precondições é verificada no emulador Firestore, sem credencial real.

Referências oficiais: [Firebase Auth REST](https://firebase.google.com/docs/reference/rest/auth), [Cloudflare Rate Limiting](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/) e [Workers Free](https://developers.cloudflare.com/workers/platform/pricing/).
