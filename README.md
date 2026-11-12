# Navalha & Co. — Gestão v0.1

Aplicativo demonstrativo de gestão para barbearias, desenvolvido em React, TypeScript e Vite. Implementado na branch `feature/versao-0.1`, sem modificar a `main` e sem publicação.

## Executar localmente

Requisitos: Node.js 20.19+ (ou 22.12+) e npm 10+.

```bash
npm install
npm run dev
```

Abra http://127.0.0.1:5173/. Se a porta estiver ocupada, use o endereço informado pelo Vite. O servidor é restrito ao computador local por padrão.

```bash
npm test
npm run build
```

O build gera `dist/`. Nenhuma credencial é necessária. Escolha **Administrador** ou **Rafael Moura** na tela de entrada. Não digite dados reais: a aplicação é uma demonstração.

## Módulos e fluxos

- **Login**: seleção explícita de perfil demonstrativo, sem senha ou autenticação simulada.
- **Dashboard**: agenda do dia, indicadores derivados dos atendimentos, filtros por profissional, resumo de valores e alertas de reativação.
- **Agenda**: lista por data e profissional, cadastro de atendimento, validação de habilitação e sobreposição de horários, confirmação explícita do atendimento, mudança de status e atualização da última visita ao concluir. Pagamento manual por dinheiro, Pix, cartão de crédito ou cartão de débito, com opção Não pago.
- **Clientes**: cadastro, busca por nome/telefone, última visita, registro de autorização para lembretes e fila de reativação.
- **Financeiro**: valores recebidos de serviços concluídos com pagamento registrado, repasses de todos os concluídos e saldo antes de despesas (recebido menos repasses dos serviços pagos). O saldo não é apresentado como lucro.
- **Profissionais**: equipe demonstrativa, procedimentos habilitados e edição de percentuais de repasse individuais.
- **Procedimentos**: cadastro de serviço com preço/duração, associação aos profissionais e percentual padrão. Valores e percentuais são fixados ao criar o atendimento; ajustes do cadastro afetam somente novos atendimentos.
- **Configurações**: edição e prévia da mensagem de retorno, explicação do prazo e da aprovação manual.

O administrador visualiza os módulos completos. O perfil Rafael visualiza somente seus atendimentos, seus indicadores, seus procedimentos e seus ganhos. **Esses filtros são apenas demonstração de interface: todos os dados estão no navegador e não existe autorização segura.**

## Reativação e WhatsApp

A data de referência demonstrativa é **11/11/2026**, identificada na interface. Clientes com autorização registrada e última visita há pelo menos 30 dias podem ter uma mensagem revisada e adicionada à fila. O administrador precisa aprovar manualmente cada item. O texto é guardado na fila como uma cópia da mensagem revisada.

**Não há envio pelo WhatsApp**, API, sincronização de contatos ou campanha automática. A aprovação registra somente o estado local “Aprovado · não enviado”. Cada cliente pode entrar na fila uma única vez nesta versão; itens pendentes e aprovados impedem novas inclusões mesmo após recarregar. Não há reenvio automático nem reinício de campanhas após nova visita. A proteção precisa ser implementada no servidor antes de qualquer integração real.

## Armazenamento e limitações

- Dados fictícios persistidos no `localStorage`, com chaves `navalha-v01-*`; perfil de entrada não persiste. Para reiniciar a demonstração, remova essas chaves nas ferramentas do navegador.
- Sem backend, banco de dados, autenticação, controle de acesso real, auditoria ou sincronização entre dispositivos. Não usar com dados reais.
- Equipe inicial fixa; o cadastro completo de profissionais, jornadas, bloqueios, despesas, pagamentos, relatórios e permissões configuráveis ficará para versões futuras.
- Agenda em lista, sem visão semanal/mensal, arrastar eventos, edição completa ou reagendamento.
- Repasses percentuais; valores fixos, descontos, pagamento e conciliação não implementados.
- Persistência requer armazenamento habilitado no navegador. Limpar os dados remove também o histórico de bloqueio de campanhas. Nenhuma garantia contra duplicação em múltiplas abas/dispositivos.
- Tipografia pode carregar do Google Fonts; fontes do sistema servem como alternativa. Nenhum dado de cliente é enviado a esse serviço.

## Referências e organização

Todas as sete telas HTML, `canvas.json` e `LEIA-ME.txt` do ZIP fornecido foram analisados como referência visual e de fluxo. A pasta `referencias` não existia no checkout inicial; o ZIP foi fornecido em Downloads durante o desenvolvimento. Consulte [docs/referencias.md](docs/referencias.md).

- `src/App.tsx`: navegação, componentes comuns, módulos e formulários.
- `src/domain.ts`: tipos, dados fictícios, regras de visibilidade, reativação, conflitos e repasses.
- `src/domain.test.ts`: testes das regras principais com Vitest.
- `src/styles.css`: estilos compartilhados e layouts para desktop, tablet e celular.
- `src/main.tsx`, `index.html`: entrada do aplicativo.
- `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`, `.gitignore`: scripts, dependências e configuração.

## Verificação manual sugerida

1. Entre como administrador, filtre o dashboard e abra a agenda.
2. Cadastre um horário livre; tente repetir o mesmo horário/profissional e veja o bloqueio.
3. Conclua um atendimento e confira o financeiro e a última visita do cliente.
4. Em Profissionais, altere um repasse; novos atendimentos usam o percentual e os anteriores mantêm o valor fixado.
5. Em Clientes, revise um lembrete e aprove na fila; recarregue e confira que não pode ser duplicado.
6. Saia e entre como Rafael: outros profissionais, configurações e campanhas deixam de aparecer.
7. Reduza a largura para 390px e 768px; navegue pelo menu e pelos formulários usando toque/teclado.

### Registro de pagamentos na agenda

Use **Confirmar atendimento** para confirmar um horário pendente. Na coluna **Pagamento**, selecione Dinheiro, Pix, Cartão de crédito ou Cartão de débito para registrar que o valor integral foi pago. A opção **Não pago** remove o registro. Confirmação, conclusão e pagamento são independentes: concluir um serviço não o marca como pago. Serviços antigos sem forma registrada aparecem como Não pago. O registro é manual e local, sem cobrança, geração de Pix, transação em cartão ou conciliação. Não há parcelamento, pagamento dividido ou parcial.
