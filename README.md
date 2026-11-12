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
- Agenda diária em Lista ou Pilha, sem visão semanal/mensal, troca de profissional pelo arraste ou edição completa do atendimento.
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

Os estados da agenda são **Agendado**, **Confirmado**, **Cancelado** e **Não compareceu**. Novos horários entram como Agendado. Use o botão amarelo **Confirmar** para confirmar; não há etapa de iniciar atendimento nem seletor de status. Cada cartão mostra **Confirmar presença**, **Atendimento Concluído** e **Cancelar** ao final. Após a confirmação, **Confirmar presença** dá lugar a **Não compareceu**. A conclusão também está disponível para horários Agendados. Registros antigos em andamento são convertidos para Confirmado e pendentes para Agendado, preservando pagamentos. Para finalizar o serviço, clique em **Atendimento Concluído**: a janela apresenta cinco botões — Dinheiro, Pix, Cartão de crédito, Cartão de débito e Não pago. A seleção conclui o atendimento e registra o pagamento integral (ou mantém a pendência ao escolher Não pago). Fechar ou cancelar a janela preserva os dados. Em serviços concluídos, **Alterar pagamento** reabre a janela para correção. Serviços antigos sem forma registrada aparecem como Não pago. O registro é manual e local, sem cobrança, geração de Pix, transação em cartão ou conciliação. Não há parcelamento, pagamento dividido ou parcial.

As opções de pagamento têm ícones e cores: Dinheiro verde, Pix turquesa, Crédito azul, Débito roxo e Não pago laranja. A escolha salva e fecha a janela em um toque. O botão verde Atendimento Concluído aparece nos agendados e confirmados; ao finalizar, aparece o indicador de conclusão com pagamento separado e ação discreta de correção.

### Agenda em pilha

Na Agenda, alterne entre **Lista** e **Pilha**. A preferência fica salva no navegador. A Pilha organiza os horários de 08h a 20h (ampliando quando há registro fora desse intervalo), com caixas ordenadas por horário e agrupadas na mesma faixa de hora. Cada caixa mostra hora exata, cliente, procedimento, valor, status e profissional (na visão administrativa).

Cores: Agendado amarelo, Confirmado azul, Concluído verde, Cancelado vermelho e Não compareceu cinza, sempre com texto do status e legenda. Toque na caixa para expandir as ações existentes, incluindo conclusão e pagamento. Os filtros de data e profissional e os limites demonstrativos de cada perfil são preservados. Horas vazias indicam apenas ausência de agendamentos, sem garantir disponibilidade de jornada. Há arraste pela alça com encaixe a cada 15 minutos; não há posicionamento proporcional à duração.

### Arraste e reagendamento

Na **Pilha**, arraste a caixa pela alça ⋮⋮ até um dos destinos destacados (08:00–20:00, a cada 15 minutos). No celular, pressione a alça por aproximadamente 300ms antes de mover. A rolagem continua disponível fora da alça; perto das bordas superior e inferior há rolagem automática durante o arraste. Escape, cancelamento do ponteiro ou soltar fora de um destino descartam a operação. Um simples toque na alça não altera o horário.

**Reagendar** abre um formulário para escolher data e hora por toque ou teclado, tanto na Lista quanto na Pilha. Somente Agendados e Confirmados podem ser movidos. A validação usa toda a agenda do profissional, exclui o próprio registro e respeita a duração do serviço. Conflitos mantêm o horário original. Cliente, profissional, procedimento, preço, percentual de repasse, status e pagamento permanecem iguais. O perfil profissional só pode reagendar seus registros demonstrativos.

Alterações persistem somente no navegador. Não há notificações, confirmação pelo cliente, sincronização multiusuário ou histórico de auditoria. Gestos de toque precisam de validação adicional em aparelhos físicos antes de uso real.
