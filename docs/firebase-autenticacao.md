# Autenticação e recuperação: preparação para Firebase

## Estado da versão 0.1

O administrador cadastra e-mail e senha demonstrativa no primeiro acesso deste navegador. A senha é comparada localmente com derivação PBKDF2 e sal aleatório; não é gravada em texto puro. O acesso continua demonstrativo: dados e controle de perfil estão no navegador e não constituem autorização no servidor. Use somente senha fictícia.

A credencial persiste ao sair do perfil ou fechar o navegador. Outra origem (localhost versus 127.0.0.1), outro navegador, aparelho ou limpeza do armazenamento não compartilha esse cadastro. Não existe senha inicial embutida no código. A recuperação da senha local não está implementada e o botão não afirma que enviou e-mail.

## Integração prevista

Usar **Firebase Authentication** para identidade, senha e recuperação por e-mail. Firestore pode armazenar estabelecimento, vínculo do usuário e dados do sistema; não deve armazenar senhas nem links/tokens de recuperação.

O contrato `AdminAuthService` em `src/adminAccess.ts` delimita login, recuperação e saída. Ele ainda não tem implementação Firebase. Não há SDK conectado, credenciais de projeto ou chamada de rede nesta etapa.

Para conectar de verdade:

1. Definir o projeto Firebase e habilitar o provedor e-mail/senha, os domínios autorizados e o modelo de e-mail de recuperação.
2. Provisionar o administrador de maneira controlada; impedir cadastro público que conceda esse papel. O servidor deve associar a conta ao estabelecimento e validar sua função.
3. Implementar o serviço de autenticação e validar a sessão e o papel no servidor/regras dos dados. O controle local de telas não é proteção suficiente.
4. Implementar recuperação exclusiva de administrador com validação no backend, limitação de tentativas e resposta que não revele se um e-mail existe. Ocultar o link de recuperação do profissional na interface, por si só, não restringe a API do provedor.
5. Os profissionais não terão recuperação autônoma pelo aplicativo. A redefinição será feita pelo administrador, com autorização verificada no backend. A exclusividade da recuperação deve ser testada também contra chamadas diretas à API.
6. Testar com Firebase Emulator Suite antes de ativar um ambiente real, incluindo senha inválida, conta sem papel administrativo, recuperação, sessão expirada e isolamento entre estabelecimentos.

Nenhuma publicação ou criação de conta externa foi realizada. Variáveis de ambiente e chaves privadas não devem ser incluídas no repositório. SDK/Admin SDK e contas de serviço só serão configurados ao conectar o projeto.

Referências oficiais:
- https://firebase.google.com/docs/auth/web/password-auth
- https://firebase.google.com/docs/auth/web/manage-users#send_a_password_reset_email
