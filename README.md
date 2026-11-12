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

O build gera `dist/`. O administrador demonstrativo entra sem credencial. Selecione um profissional ativo para explorar seu perfil; quando o administrador configurar uma senha de demonstração, ela é verificada localmente. Não digite dados reais: a aplicação é uma demonstração.

## Módulos e fluxos

- **Login**: seleção explícita de perfil demonstrativo e verificação local de senha fictícia, quando configurada pelo administrador. Não representa autenticação segura.
- **Dashboard**: períodos Hoje, Mês e Ano, taxa de ocupação realizada, valores e repasses, filtros por profissional e alertas de reativação.
- **Métricas** (administrador): gráficos de atendimentos, financeiro, clientes, faltas, pagamentos e ocupação, com Dia/Semana/Mês/Ano e filtro por profissional.
- **Agenda**: Lista ou Pilha, períodos Hoje/Mês/Ano, cadastro com múltiplos procedimentos, horários filtrados por jornada e ausências, validação de habilitação e sobreposição de horários, confirmação explícita do atendimento, mudança de status e atualização da última visita ao concluir. Pagamento manual por dinheiro, Pix, cartão de crédito ou cartão de débito, com opção Não pago.
- **Clientes**: cadastro, edição, exclusão/restauração, busca, última visita, autorização e abertura manual do WhatsApp com mensagem revisada.
- **Financeiro**: valores recebidos de serviços concluídos com pagamento registrado, repasses de todos os concluídos e saldo antes de despesas (recebido menos repasses dos serviços pagos). O saldo não é apresentado como lucro.
- **Profissionais**: cadastro, habilitação/desabilitação, exclusão/restauração e janela individual com Acesso, Jornada e Procedimentos e repasses.
- **Procedimentos**: cadastro e edição somente de nome, duração e valor. Habilitação de serviços e repasses são configurados exclusivamente na janela do profissional pelo administrador. Novos atendimentos fixam os dados do serviço e do repasse.
- **Configurações**: administrador edita e pré-visualiza a mensagem de retorno; profissional configura sua própria jornada e ausências.

O administrador visualiza os módulos completos. Cada profissional ativo visualiza somente seus atendimentos, seus indicadores, seus procedimentos, seus ganhos e sua jornada. **Esses filtros são apenas demonstração de interface: todos os dados estão no navegador e não existe autorização segura.**

## Contato manual pelo WhatsApp

A referência de atendimento da demonstração é **11/11/2026**. Os clientes há 30 dias ou mais sem atendimento são identificados para retorno, mas não há disparo automático.

Em **Clientes → WhatsApp**, revise ou edite o texto e toque em **Abrir no WhatsApp**. O link `wa.me` inclui telefone e mensagem, abre a conversa em outra aba/aplicativo e deixa a confirmação final de envio para você no WhatsApp. O botão exige autorização registrada, cliente ativo, número válido com DDD e mensagem preenchida. Para números brasileiros sem DDI, acrescenta 55; para outros países, informe + e o código do país.

A aplicação registra somente **solicitação de abertura**, nunca “enviado”. Não há API, envio automático, importação de contatos, retorno de entrega/leitura ou garantia de que uma nova aba foi aberta pelo navegador. Os registros antigos de fila/aprovação são mantidos no armazenamento por compatibilidade, mas não provocam envio nem entram como abertura de WhatsApp.

Para evitar cliques repetidos, o mesmo texto para o mesmo cliente só pode ter nova abertura após **7 dias**, contados pelo relógio do navegador. Outra mensagem, revisada manualmente, pode ser preparada. A proteção é local e não impede repetição diretamente no WhatsApp ou em outro dispositivo; limpar os dados remove o histórico.

## Armazenamento e limitações

- Dados fictícios persistidos no `localStorage`, com chaves `navalha-v01-*`; perfil de entrada não persiste. Para reiniciar a demonstração, remova essas chaves nas ferramentas do navegador.
- Sem backend, banco de dados, autenticação, controle de acesso real, auditoria ou sincronização entre dispositivos. Não usar com dados reais.
- Cadastro de profissionais é local e demonstrativo. Autenticação/autorização no servidor, despesas, transações financeiras e relatórios exportáveis ficam para versões futuras.
- Agenda em Lista/Pilha, com calendário mensal e resumo anual. Sem visão semanal, troca de profissional pelo arraste ou edição completa do atendimento.
- Repasses percentuais; valores fixos, descontos, pagamento e conciliação não implementados.
- Persistência requer armazenamento habilitado no navegador. Limpar os dados remove também o histórico de bloqueio de campanhas. Nenhuma garantia contra duplicação em múltiplas abas/dispositivos.
- Tipografia pode carregar do Google Fonts; fontes do sistema servem como alternativa. Nenhum dado de cliente é enviado a esse serviço.

## Referências e organização

Todas as sete telas HTML, `canvas.json` e `LEIA-ME.txt` do ZIP fornecido foram analisados como referência visual e de fluxo. A pasta `referencias` não existia no checkout inicial; o ZIP foi fornecido em Downloads durante o desenvolvimento. Consulte [docs/referencias.md](docs/referencias.md).

- `src/App.tsx`: navegação, componentes comuns, módulos e formulários.
- `src/domain.ts`: tipos, dados fictícios e regras de períodos, disponibilidade, múltiplos serviços, visibilidade, reativação, conflitos e repasses.
- `src/AppointmentFields.tsx`: seleção múltipla e horários disponíveis; reagendamento com disponibilidade.
- `src/WorkScheduleEditor.tsx`: jornada semanal e restrições pontuais.
- `src/ProfessionalsPanel.tsx`: cadastro, situação, exclusão/restauração e configuração do profissional.
- `src/ClientsPanel.tsx`, `src/contacts.test.ts`: edição/exclusão/restauração, abertura manual de WhatsApp e testes.
- `src/demoAccess.ts`, `src/demoAccess.test.ts`: derivação/verificação local de senhas fictícias e testes.
- `src/AgendaStack.tsx`: escala temporal proporcional, colunas por profissional e arraste.
- `src/PeriodControls.tsx`, `src/AgendaPeriod.tsx`: períodos e navegação de calendário.
- `src/MetricsPage.tsx`, `src/MetricCharts.tsx`: painéis e gráficos responsivos, com tabelas acessíveis para consultar os valores.
- `src/metrics.ts`, `src/metrics.test.ts`: cálculo de ocupação, períodos, recebimentos, rankings e testes.
- `src/domain.test.ts`: testes das regras principais com Vitest.
- `src/styles.css`: estilos compartilhados e layouts para desktop, tablet e celular.
- `src/main.tsx`, `index.html`: entrada do aplicativo.
- `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`, `.gitignore`: scripts, dependências e configuração.

## Verificação manual sugerida

1. Entre como administrador, filtre o dashboard e abra a agenda.
2. Cadastre um horário livre; tente repetir o mesmo horário/profissional e veja o bloqueio.
3. Conclua um atendimento e confira o financeiro e a última visita do cliente.
4. Em Profissionais, clique no nome e abra Procedimentos e repasses para alterar um percentual; novos atendimentos usam o percentual e os anteriores mantêm o valor fixado.
5. Em Clientes, edite um cadastro e confira os dados na agenda. Revise o texto no botão WhatsApp; o envio é feito por você no WhatsApp, sem fila automática.
6. Saia e entre como Rafael: outros profissionais e campanhas deixam de aparecer; Configurações exibe apenas a própria jornada.
7. Reduza a largura para 390px e 768px; navegue pelo menu e pelos formulários usando toque/teclado.

### Registro de pagamentos na agenda

Os estados da agenda são **Agendado**, **Confirmado**, **Cancelado** e **Não compareceu**. Novos horários entram como Agendado. Use o botão amarelo **Confirmar** para confirmar; não há etapa de iniciar atendimento nem seletor de status. Cada cartão mostra **Confirmar presença**, **Atendimento Concluído** e **Cancelar** ao final. Após a confirmação, **Confirmar presença** dá lugar a **Não compareceu**. A conclusão também está disponível para horários Agendados. Registros antigos em andamento são convertidos para Confirmado e pendentes para Agendado, preservando pagamentos. Para finalizar o serviço, clique em **Atendimento Concluído**: a janela apresenta cinco botões — Dinheiro, Pix, Cartão de crédito, Cartão de débito e Não pago. A seleção conclui o atendimento e registra o pagamento integral (ou mantém a pendência ao escolher Não pago). Fechar ou cancelar a janela preserva os dados. Em serviços concluídos, **Alterar pagamento** reabre a janela para correção. Serviços antigos sem forma registrada aparecem como Não pago. O registro é manual e local, sem cobrança, geração de Pix, transação em cartão ou conciliação. Não há parcelamento, pagamento dividido ou parcial.

As opções de pagamento têm ícones e cores: Dinheiro verde, Pix turquesa, Crédito azul, Débito roxo e Não pago laranja. A escolha salva e fecha a janela em um toque. O botão verde Atendimento Concluído aparece nos agendados e confirmados; ao finalizar, aparece o indicador de conclusão com pagamento separado e ação discreta de correção.

### Agenda em pilha

Na Agenda, alterne entre **Lista** e **Pilha**. A preferência fica salva no navegador. A Pilha mostra uma escala vertical de tempo (2px/minuto) e uma coluna por profissional. A caixa começa no horário agendado e termina após a duração total dos serviços, com início, fim, cliente, procedimentos e valor. A largura é dividida quando há registros antigos sobrepostos. No celular, a rolagem horizontal fica dentro da grade; filtrar por profissional facilita a leitura.

Cores: Agendado amarelo, Confirmado azul, Concluído verde, Cancelado vermelho e Não compareceu cinza, sempre com texto do status e legenda. Toque na caixa para expandir as ações existentes, incluindo conclusão e pagamento. Os filtros de data e profissional e os limites demonstrativos de cada perfil são preservados. Horas vazias indicam apenas ausência de agendamentos, sem garantir disponibilidade de jornada. Há arraste pela alça com encaixe a cada 15 minutos e posição/altura proporcionais ao horário e à duração. Áreas fora da jornada e ausências aparecem como indisponíveis.

### Arraste e reagendamento

Na **Pilha**, arraste a caixa pela alça ⋮⋮ até um dos destinos disponíveis destacados, a cada 15 minutos, dentro da jornada cadastrada. No celular, pressione a alça por aproximadamente 300ms antes de mover. A rolagem continua disponível fora da alça; perto das bordas superior e inferior há rolagem automática durante o arraste. Escape, cancelamento do ponteiro ou soltar fora de um destino descartam a operação. Um simples toque na alça não altera o horário.

**Reagendar** abre um formulário para escolher data e hora por toque ou teclado, tanto na Lista quanto na Pilha. Somente Agendados e Confirmados podem ser movidos. A validação usa toda a agenda do profissional, exclui o próprio registro, respeita a duração total dos procedimentos, os dias e horas de trabalho e as restrições pontuais. Conflitos mantêm o horário original. Cliente, profissional, procedimento, preço, percentual de repasse, status e pagamento permanecem iguais. O perfil profissional só pode reagendar seus registros demonstrativos.

Alterações persistem somente no navegador. Não há notificações, confirmação pelo cliente, sincronização multiusuário ou histórico de auditoria. Gestos de toque precisam de validação adicional em aparelhos físicos antes de uso real.

### Procedimentos, jornada e ausências

Ao criar um atendimento, escolha o profissional e marque um ou mais procedimentos habilitados. A duração e o valor são somados; o preço, duração e repasse de cada serviço são fixados no atendimento. A lista de horários mostra somente intervalos em que todos os procedimentos cabem antes do fim da jornada, sem sobreposição com atendimentos ou ausências. Cancelados e ausências de clientes não ocupam horários futuros; registros concluídos mantêm o histórico de ocupação.

Em **Profissionais → clique no nome → Jornada**, o administrador marca os dias ativos e define início/fim. A jornada demonstrativa inicial é segunda a sexta, 09h–18h; sábado, 09h–13h; domingo desmarcado. Alterações exigem **Salvar jornada semanal**. Desmarcar um dia bloqueia esse dia semanalmente. Para uma ocorrência isolada, use **Ausências e restrições**, com data e intervalo ou dia inteiro; adicione restrições também para pausas/almoço. É possível remover restrições pontuais.

O profissional configura apenas a própria disponibilidade em **Configurações**. Restrições novas não cancelam atendimentos existentes: a interface lista os afetados e marca-os para revisão. Novos agendamentos e reagendamentos/arraste já respeitam os bloqueios. A duração dos registros antigos sem cópia dos serviços usa o cadastro atual como compatibilidade; novos registros preservam a duração mesmo se o cadastro mudar.

### Hoje, Mês e Ano

No **Início**, os três períodos atualizam os atendimentos, valores, repasses e ocupação; a capacidade considera jornadas e ausências cadastradas. O seletor de referência permite escolher dia, mês ou ano. **Hoje** retorna à data demonstrativa 11/11/2026.

Na **Agenda**, a Lista mostra todos os registros do período escolhido. Na Pilha, **Ano** exibe os 12 meses; selecionar um mês abre seu calendário; selecionar um dia abre a grade de horários proporcional. Os filtros de profissional continuam aplicados em todos os períodos. Meses sem dados ficam vazios; não são criados totais fictícios para preencher o calendário.

### Catálogo, profissionais e acesso demonstrativo

**Procedimentos** guarda somente nome, duração e valor, com botão Editar. Cadastrar um procedimento não o habilita automaticamente para nenhum profissional. Editar o catálogo não altera os serviços, preços, duração e repasses já fixados nos atendimentos existentes; registros antigos sem cópia dos serviços são preservados antes da primeira edição.

Em **Profissionais**, use **Novo profissional**, **Habilitar** ou **Desabilitar**. Clique no nome para abrir:

- **Acesso:** somente o administrador define/altera uma senha fictícia de demonstração, com confirmação. Ela passa a ser solicitada ao explorar aquele perfil.
- **Jornada:** dias e horários de trabalho, pausas e ausências. O profissional continua podendo ajustar sua própria jornada em Configurações.
- **Procedimentos e repasses:** somente o administrador marca os serviços habilitados e o percentual de cada um para aquele profissional. Alterações afetam novos atendimentos.

Desabilitar remove o profissional dos novos agendamentos e da seleção de acesso, preservando vínculos e histórico. Profissionais novos começam ativos, com jornada demonstrativa padrão e sem serviços atribuídos. Configure os serviços antes de agendar.

Os vínculos e percentuais antigos são migrados para `navalha-v01-professional-records`; o catálogo persistido fica somente com ID, nome, duração e preço. A vinculação usada no agendamento é derivada dos profissionais ativos.

**Senhas são apenas demonstração local:** a aplicação guarda no navegador uma derivação PBKDF2/SHA-256 com sal aleatório, nunca a senha em texto puro. Não há servidor, sessão segura, recuperação de senha, limite de tentativas ou proteção real dos dados. Não use senhas reais. Um backend com autorização no servidor será necessário para produção. Senhas e derivações geradas durante o uso não são incluídas no repositório.

### Taxa de ocupação e gráficos de métricas

A taxa de ocupação do Início e de Métricas é **horas de serviços concluídos dentro da disponibilidade ÷ horas disponíveis da equipe × 100**. Por exemplo, 2 horas atendidas em 8 horas disponíveis equivalem a 25%. São descontadas restrições e folgas; atendimentos sobrepostos do mesmo profissional não duplicam tempo. Profissionais diferentes somam sua capacidade. Agendados e Confirmados não contam como tempo já atendido. Sem jornada disponível, a taxa aparece como “—”; com jornada e nenhum serviço concluído, aparece 0%.

Esta versão estima o tempo atendido pela duração fixada nos procedimentos, sem cronômetro de início/término efetivo. Usa a jornada atual dos profissionais habilitados para todo o período consultado, inclusive dias futuros. Alterações de jornada/desativação alteram a base histórica, pois ainda não há histórico de vigência de jornadas. Logo, não é uma medição de tempo real nem uma comparação automática com metas de desempenho.

A aba **Métricas** é exclusiva do administrador e oferece:

- Dia, semana (segunda a domingo), mês e ano, com data de referência e profissional.
- Concluídos e faltas por hora/dia/mês, conforme o período.
- Recebido e saldo após repasses dos serviços pagos, antes de despesas.
- Top 10 clientes por atendimentos concluídos, com valor total dos serviços.
- Até 10 clientes com mais faltas. A taxa individual e geral considera somente Concluídos e Não compareceu; não inclui confirmações futuras nem cancelamentos.
- Gráfico circular por valor recebido em Cartão (crédito + débito), Dinheiro e Pix.
- Ocupação por profissional, ticket médio, valores a receber, distribuição de status e resumo dos serviços concluídos.

Recebimentos são somente os serviços concluídos com forma de pagamento registrada. Os gráficos financeiros agrupam pela data do atendimento: não existe data de compensação/pagamento efetivo. Custos, taxas, tributos, estornos e despesas não estão cadastrados; o saldo não representa lucro. Os rankings usam o nome nos registros locais e ainda não distinguem clientes homônimos.

Gráficos vazios não recebem dados artificiais. No celular, os gráficos de evolução têm rolagem própria para manter a leitura; os valores também podem ser consultados em **Ver dados do gráfico**.

### Editar e excluir cadastros

O administrador pode **editar nome, telefone, última visita e autorização do cliente**. Ao corrigir o nome, os atendimentos vinculados são atualizados por ID (ou nome legado), preservando serviços, datas, status, valores e pagamentos. Novos registros não aceitam nomes duplicados; restaure um excluído em vez de criar outro cadastro com o mesmo nome.

Em **Clientes** e **Profissionais**, **Excluir** pede confirmação e remove o cadastro da lista ativa. A seção **Excluídos** permite restaurar. Esta é uma exclusão reversível: dados e histórico são preservados, sem exclusão permanente. Atendimentos em aberto não são cancelados automaticamente; a confirmação informa a necessidade de revisão. Clientes excluídos não aparecem no novo agendamento nem podem abrir mensagens. Profissionais excluídos perdem acesso demonstrativo e disponibilidade; ao restaurar, voltam desabilitados até o administrador habilitá-los.

### Testar em celular

No computador, abra o aplicativo no Chrome e use as ferramentas do desenvolvedor (macOS: ⌘⌥I; alternância de dispositivo: ⌘⇧M), escolhendo 390 × 844 px ou um modelo de celular.

Para abrir em um celular real, com Node.js/npm instalados, conecte os dois dispositivos ao mesmo Wi-Fi e execute no repositório:

```bash
npm run dev -- --host 0.0.0.0
```

Use no celular o endereço **Network** exibido pelo Vite, como `http://192.168.1.10:5173`. Não use `127.0.0.1` no celular para acessar o computador. O servidor precisa continuar rodando; o firewall/rede deve permitir o acesso local.

Os dados são locais por dispositivo e endereço: abrir pelo IP da rede não compartilha automaticamente os dados de 127.0.0.1. A configuração de senha demonstrativa usa Web Crypto, disponível em localhost ou HTTPS; via IP com HTTP pode não estar disponível. Não houve teste em aparelhos físicos.

Quando há somente um profissional ativo, a Agenda seleciona esse profissional automaticamente, esconde o filtro e mostra uma única coluna na Pilha. Isso vale também para Lista, Mês e Ano. Cadastros excluídos não criam colunas vazias; o histórico continua preservado nos registros e métricas. Se não houver ativos, a agenda permite consultar os cadastros não excluídos.

O administrador pode alterar o nome do estabelecimento em Configurações. A marca usa as iniciais do nome, e a alteração é salva apenas neste navegador. Nos lembretes, `{estabelecimento}` insere o nome atual; textos personalizados existentes são mantidos.

O catálogo de procedimentos usa linhas compactas. Em Editar procedimento, Excluir procedimento pede confirmação e remove o item do catálogo e das associações profissionais, preservando os dados dos atendimentos já cadastrados.

Para repetir atendimentos, marque **Atendimento recorrente** no novo agendamento, escolha os dias da semana, a data inicial e **Repetir até** (máximo de um ano). O horário é escolhido pela disponibilidade da primeira ocorrência; ao salvar, todas as datas são validadas contra a jornada, ausências e conflitos. Se qualquer ocorrência estiver indisponível, nenhuma é salva e o aviso identifica as datas a revisar. Cada atendimento nasce como Agendado, com os mesmos procedimentos, valores e profissional, e pode ser reagendado, confirmado ou cancelado individualmente. Não há geração automática após a data final nem edição em lote da série nesta versão.

O controle no topo alterna **Aberto/Fechado** para o estabelecimento e **Presente/Ausente** para um profissional. O administrador escolhe o alvo no seletor; o perfil profissional registra apenas a própria presença. Fechar o estabelecimento pausa a disponibilidade de todos; uma saída individual pausa apenas aquele profissional. Reabrir ou registrar chegada retoma a contagem sem preencher o intervalo fechado. Os registros são locais, persistem ao recarregar e usam o horário real de São Paulo, não a data demonstrativa consultada. O ícone “i” mostra os últimos registros do alvo.

Na ocupação, os intervalos de presença são cruzados com jornada e restrições, tanto para horas disponíveis quanto para serviços concluídos. No dia em controle, só se considera o tempo decorrido; após o início do controle, dias futuros não têm presença presumida. O estado atravessa a meia-noite: fechado/ausente permanece assim até reabrir/registrar chegada. Antes do primeiro fechamento presume-se presença desde o início da jornada daquele dia; dias anteriores ao início do controle continuam usando jornada prevista, com aviso na métrica. Para registrar a chegada desde o início, deixe o estado fechado/ausente ao encerrar o dia anterior. Não há detecção automática de presença, relógio de ponto, sincronização entre dispositivos ou autenticação real. Os botões não cancelam agendamentos nem alteram receitas.

Com **apenas um profissional ativo**, o seletor do topo desaparece: um único botão Presente/Ausente registra presença e abertura do estabelecimento juntos, evitando um fechamento oculto bloquear a contagem. Com mais profissionais, os controles permanecem separados. Em dia da semana desmarcado na jornada, o profissional começa Ausente; uma chegada explícita gera tempo excepcional apenas daquele horário até a saída (ou até agora). Não presume presença na folga por ter ficado Presente no dia anterior. Restrições manuais continuam bloqueando esse tempo e devem ser revistas se a ausência foi cancelada. O registro de presença afeta a ocupação, não libera automaticamente horários para agendamento fora da jornada: ajuste a disponibilidade para agendar nesse dia. Logout e fechamento do navegador não registram saída; os dados e o último estado persistem no mesmo navegador/origem.
