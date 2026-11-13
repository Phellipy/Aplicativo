# Autenticação e autorização

No modo `firebase`, o administrador entra com e-mail/senha pelo Firebase Authentication. Provisione sua conta fora da interface e crie `/administrators/{uid}` com `role: "admin"`, `active: true` e `email` igual ao e-mail da conta em minúsculas. O aplicativo não permite criar ou elevar esse vínculo. A recuperação por e-mail está disponível somente para o administrador.

Os documentos operacionais ficam em `/instances/{identificador}/data/{colecao}/items/{id}`. A marca pública em `/publicBranding/{identificador}` permite leitura individual apenas de nome, logo e aparência. Antes do deploy, personalize os caminhos fixos `demo` de `firestore.rules` para o identificador da instalação. As coleções privadas de credenciais e sessões do profissional continuam negadas ao SDK, inclusive ao administrador.

Profissionais entram por usuário/senha através do Worker exclusivo da instalação, sem e-mail ou recuperação na interface. A senha é verificada pelo Firebase Authentication do lado do servidor; nunca é armazenada em texto no Firestore. O Worker valida sessão, profissional ativo, revisão e propriedade do atendimento em cada operação. Somente o administrador cria/redefine/suspende acessos.

O profissional pode consultar contatos básicos ativos do estabelecimento para agendar, cadastrar nome/telefone sem alterar consentimento, documentos ou histórico, e criar atendimentos exclusivamente para si. A própria agenda, jornada e resultados são os únicos retornados. Edição/exclusão de clientes, catálogo, jornada, repasses e credenciais permanecem administrativos.

Os testes de regras/persistência e backend verificam autorização, revogação, adulteração, restrição de agenda e campos, revisões e gravação emulada. A demonstração local não fornece essas garantias.
