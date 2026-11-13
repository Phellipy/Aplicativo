# Uma implantação por estabelecimento

Compartilhe o código, não os dados ou as credenciais. Cada cliente usa projeto Firebase, domínio e Worker próprios. Esta base inicia em demonstração local e não aponta para nenhum projeto de produção.

## Preparar a cópia

1. Crie um repositório a partir da base e faça um checkout separado.
2. Execute `npm install`.
3. Execute o gerador local, substituindo os exemplos:

```bash
npm run instance:init -- --id empresa-a --name "Empresa A" --domain agenda.empresa-a.com.br --project projeto-empresa-a
```

O comando cria somente `.env.local` e `.firebaserc`, ignorados pelo Git, e recusa sobrescrever arquivos existentes. Não cria recursos externos. Reinicie o Vite após alterar o ambiente.

## Configurar Firebase

1. No projeto do cliente, registre um aplicativo Web e preencha os campos públicos `VITE_FIREBASE_*` em `.env.local`.
2. Ative Authentication por e-mail/senha e crie o administrador fora da interface. Configure `VITE_ADMIN_EMAIL` e o documento de autorização descrito em [autenticação](firebase-autenticacao.md).
3. Crie o Firestore. Em `firestore.rules`, substitua os dois caminhos fixos `/instances/demo/` e `/publicBranding/demo` pelo identificador escolhido em `VITE_INSTANCE_ID`. As regras ficam limitadas àquela instância; não use um curinga para autorizar todos os estabelecimentos.
4. Teste as regras em ambiente separado. Os testes incluídos usam a instância fictícia `demo`; preserve uma cópia das regras de teste se personalizar os caminhos para produção.
5. Depois de provisionar e validar a integração, altere `VITE_DATA_MODE=firebase`. O modo Firebase não importa automaticamente os dados de demonstração.
6. Configure o Worker conforme [backend profissional](../access-backend/README.md). `INSTANCE_ID` do Worker deve ser igual a `VITE_INSTANCE_ID`. Sem o Worker configurado, não há acesso profissional real.
7. Faça build e teste autenticação, autorização, persistência, cadastro, agenda e revogação antes de publicar no Hosting do cliente. Configure domínio e DNS separadamente.

Não coloque senhas, chave privada de conta de serviço ou tokens em `VITE_*`: esses valores entram no JavaScript público. Use os segredos do Worker. Configuração Web pública não equivale a credencial administrativa.

## Atualizações

A base não atualiza as cópias automaticamente. Traga as alterações do código para cada instalação, preserve a configuração local e valide antes de publicar. Não copie `.env.local`, `.firebaserc`, caches ou segredos entre estabelecimentos. O isolamento de produção adotado é por projeto Firebase e Worker, não uma plataforma multitenant em um projeto compartilhado.
