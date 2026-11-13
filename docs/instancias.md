# Base reutilizável: uma implantação por cliente

## Modelo adotado

Mantenha este repositório como base comum. Para cada estabelecimento, crie uma cópia de trabalho e uma configuração de instância, com domínio e projeto Firebase independentes. O projeto deve ser do cliente, que concede acesso à equipe responsável pela manutenção; não se usa a senha pessoal dele para conectar o aplicativo.

Exemplo:

| Instância | Domínio | Projeto Firebase |
| --- | --- | --- |
| Empresa A | agenda.empresa-a.com.br | projeto-empresa-a |
| Empresa B | agenda.empresa-b.com.br | projeto-empresa-b |

Compartilha-se o código, não os dados dos clientes. A configuração Firebase de um aplicativo Web é pública; credenciais de conta de serviço e tokens de administração ficam somente no servidor/ambiente de implantação.

## O que já funciona

- Nome inicial por instalação, com edição posterior em Configurações.
- Identificador exclusivo e separação do armazenamento demonstrativo por instalação na mesma origem. Isso organiza dados locais; não constitui isolamento de segurança em produção.
- Gerador local de `.env.local` e `.firebaserc`, sem sobrescrever configurações existentes.
- `firebase.json` para servir o build Vite como aplicação de página única no Firebase Hosting.
- Repositório preparado para uso como modelo no GitHub.

## O que ainda precisa ser integrado para atender usuários reais

A v0.1 usa dados demonstrativos e credenciais verificadas no navegador. **Preencher as variáveis Firebase não conecta o banco nem torna o acesso seguro.** `src/instance.ts` apenas lê as configurações para a futura implementação. Ainda não há SDK Firebase ativo.

Antes de uma implantação com dados reais, implementar e testar:

1. Firebase Authentication substituindo o acesso demonstrativo.
2. Armazenamento remoto das entidades do aplicativo e sincronização entre dispositivos.
3. Regras/validação de autorização por estabelecimento e profissional no backend.
4. Provisionamento do administrador e recuperação exclusiva do administrador (ver `firebase-autenticacao.md`).
5. Logo em armazenamento remoto e preferências do estabelecimento compartilhadas, em vez de somente localStorage.
6. Emuladores e testes de autorização, continuidade dos registros e recuperação.

Não publicar a demonstração como sistema de produção pronto para dados reais.

## Criar uma instalação a partir da base

1. No GitHub, use **Use this template → Create a new repository**. A cópia fica independente; atualizações da base não são aplicadas automaticamente às cópias. Para recebê-las, traga os commits da base e execute os testes antes de atualizar o cliente.
2. Abra um checkout separado da cópia. Não reutilize a pasta configurada de outro cliente.
3. Instale as dependências com `npm install`.
4. Execute, substituindo os valores de exemplo:

```bash
npm run instance:init -- --id empresa-a --name "Empresa A" --domain agenda.empresa-a.com.br --project projeto-empresa-a
```

O comando cria apenas `.env.local` e `.firebaserc`, ignorados pelo Git. Não cria projeto, não conecta domínio, não provisiona contas e não publica nada. Se algum desses arquivos já existir, o comando para sem sobrescrevê-lo. Use `npm run instance:init -- --help` para consultar a sintaxe.

5. Ao implementar a integração, preencha os campos públicos do aplicativo Web do projeto Firebase em `.env.local`, conforme `.env.example`. Nunca coloque senhas ou chaves privadas em variáveis `VITE_`: elas entram no JavaScript entregue ao navegador.
6. Reinicie o servidor Vite após alterar o ambiente. Teste com `npm run dev`, `npm test` e `npm run build`.
7. Confirme domínio, projeto, nome e versão em um ambiente de homologação. Use projeto separado para testes.

O nome definido no ambiente é o valor inicial; uma edição de nome já salva no navegador tem precedência. `VITE_INSTANCE_ID=demo` preserva os dados anteriores da demonstração. Alterar o identificador cria outro espaço local e não migra os dados existentes.

## Publicação futura

Após concluir a integração real e validar o ambiente, autentique o Firebase CLI com uma conta autorizada no projeto do cliente. O `firebase.json` publica somente Hosting; não há regra de banco permissiva criada neste modelo.

A implantação deve explicitar o projeto:

```bash
npm run build
firebase deploy --only hosting --project ID_DO_PROJETO_DO_CLIENTE
```

**Não execute o deploy para dados reais enquanto a integração acima estiver pendente.** Esses comandos são instruções para a etapa de publicação; não foram executados nesta preparação.

No Firebase Console, abra Hosting, adicione o domínio e siga os registros DNS fornecidos para aquele domínio. Autorize o domínio também na configuração do Authentication. Configuração DNS depende de acesso ao provedor onde o domínio é administrado. A variável `VITE_INSTANCE_DOMAIN` serve como referência de configuração e não altera DNS ou o endereço do site.

Uma instalação deve usar o mesmo projeto no `.env.local`, em `.firebaserc` e no parâmetro `--project`. O build contém as variáveis públicas daquela instalação: não reutilize `dist/` de um cliente para outro sem reconstruí-lo.

## Referências

- Firebase Hosting e domínio: https://firebase.google.com/docs/hosting/custom-domain
- Projetos e ambientes: https://firebase.google.com/docs/projects/dev-workflows/general-best-practices
- Variáveis do Vite: https://vite.dev/guide/env-and-mode
