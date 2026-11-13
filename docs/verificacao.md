# Verificação da versão 0.1

- `npm install`: concluído com lockfile npm em árvore limpa.
- `npm run build`: TypeScript e Vite aprovados.
- `npm test`: 12 testes aprovados, cobrindo visibilidade por perfil, prazo de 30 dias, autorização para lembretes, bloqueio de duplicados pendentes/aprovados, moeda, repasse fixado e individual, conflitos de agenda, horários contíguos e cancelamentos.
- Interface local verificada no navegador: login, dashboard administrativo, menu por toque, lista de clientes, revisão e aprovação de campanha sem envio, perfil profissional, bloqueio de horário sobreposto e cadastro em horário livre.
- Layouts inspecionados em celular de 390 × 844, tablet de 768 × 1024 e desktop. Tablet sem transbordamento da página; tabelas extensas têm rolagem própria.
- A validação de conflito foi corrigida para aparecer dentro do modal e ser anunciada como alerta. O status na agenda do profissional foi preservado também na tela de celular.

Limites: testes automatizados concentram-se nas regras de domínio; não há suíte automatizada de ponta a ponta, teste em aparelhos físicos ou backend. Os resultados não comprovam segurança ou integração externa.

## Confirmação e pagamento na agenda

- Build e 19 testes aprovados após a inclusão de formas de pagamento.
- Testes cobrem as quatro formas, correção/remoção, rejeição de forma inválida e recebimento separado da confirmação/conclusão.
- Navegador: seleção de Pix refletida no status manual de pagamento e no valor recebido do Financeiro.

## Janela de conclusão

- 27 testes aprovados, incluindo conclusão pelas cinco opções, preservação do registro original e bloqueio de conclusão de cancelados/ausentes.
- Janela inspecionada no navegador com cinco botões: Dinheiro, Pix, Cartão de crédito, Cartão de débito e Não pago.
- O seletor de status foi removido; a conclusão é realizada exclusivamente pelo botão e pela janela.

## Agenda simplificada

- Sem seletor ou etapa Em atendimento: Agendado → Confirmado → finalização pelo botão Atendimento Concluído. Cancelado e Não compareceu disponíveis no menu ⋯.
- Uma ação principal por etapa, indicadores de conclusão e pagamento separados, botões de pagamento com cores e ícones.
- Compatibilidade com dados locais anteriores preservando formas de pagamento.

Build e 29 testes aprovados após a simplificação. Menu ⋯ e janela colorida inspecionados no navegador sem alterar os registros de atendimento.

## Cartões compactos e ações diretas

- Agenda em cartões compactos com horário, cliente, profissional, status e pagamento organizados.
- Agendado: Confirmar presença, Atendimento Concluído e Cancelar. Confirmado: Não compareceu substitui Confirmar presença.
- Os três botões ficam na mesma linha também no celular, com alvos mínimos de 44px.
- Todos os registros iniciais da demonstração começam em Agendado; dados existentes do navegador são preservados. Build e 30 testes aprovados antes do ajuste final de espaçamento.

## Visualização Pilha

- Build e 33 testes aprovados. Novos testes cobrem horários vazios, registros simultâneos, ordenação dos minutos sem alteração dos dados e registros fora do intervalo padrão.
- Alternância Lista/Pilha, caixas por status e expansão das ações verificadas no navegador.
- Inspeção em 390px sem transbordamento da página; caixas mostram cliente, procedimento, valor e texto de status, com legenda das cores.

## Arraste e reagendamento

- Build e 50 testes aprovados. Casos de reagendamento cobrem intervalos de 15 minutos, datas e horários inválidos, conflitos/horários contíguos, exclusão do próprio registro, profissionais diferentes, preservação dos campos e limites do perfil demonstrativo.
- Navegador em origem local isolada: arraste real do atendimento de Marcos das 09:00 para 10:15 aprovado, preservando dados. Formulário com tentativa às 14:00 detectou conflito com outro atendimento e manteve 10:15.
- Alternativa por formulário disponível para teclado/toque. Toque prolongado implementado com Pointer Events e alça dedicada; não houve teste em celular físico.

## Procedimentos múltiplos, disponibilidade, grade proporcional e períodos

- 68 testes de domínio aprovados. Novos cenários cobrem duração/preço/repasses somados e fixados, habilitação, jornada reduzida, dia desmarcado, pausa parcial, ausência integral, espaço até o fim do expediente, cancelamentos/ausências, bloqueios no reagendamento, layout proporcional e sobreposições, limites de meses/anos e ano bissexto.
- Navegador em localhost, separado dos dados em 127.0.0.1: cadastro de dois procedimentos totalizando 90 minutos e R$245; grade mostrou 11:15–12:45 com 180px de altura, contra 120px para 60 minutos e 60px para 30 minutos.
- Desmarcação de quarta-feira avisou sobre três atendimentos afetados. Após restaurar o dia, restrição 12h–13h avisou sobre um atendimento afetado, preservando os registros.
- Arraste real na grade proporcional moveu 10:15 para 09:00, preservando o atendimento e respeitando a disponibilidade.
- Navegação Início anual e Agenda Ano → Novembro → 11/11 verificada no navegador. Grade de 712px em área própria de 326px no celular de 390px, sem transbordamento da página.
- Toque prolongado permanece implementado por Pointer Events; aparelhos físicos e uso simultâneo por múltiplos usuários não foram testados.

## Separação de catálogo e configuração profissional

- Build e 78 testes aprovados: migração de atribuições antigas, catálogo limpo, serviços inicialmente desabilitados em novos cadastros, cadastro/ativação/desativação, restrição administrativa de acesso/serviços/repasses, validação de percentuais, agenda e visibilidade de profissional novo.
- Três testes de senha demonstrativa executados somente em memória: derivação com sal, verificação correta/incorreta, sais diferentes e rejeição de entrada curta. Nenhuma senha real, derivação ou sal de uso foi salvo no código.
- Navegador em localhost isolado dos dados em 127.0.0.1: editado valor do catálogo; cadastrado profissional fictício, atribuídos serviço e repasse individual; janela de jornada inspecionada. Desabilitar removeu o nome da seleção de acesso; habilitar restaurou. Perfil novo mostrou apenas seu serviço, sem controles de edição ou repasse.
- Janela de Acesso inspecionada. Não foi alterada nenhuma credencial real pelo agente; o formulário de senha é demonstrativo e deve usar exclusivamente dados fictícios.

## Ocupação realizada e Métricas

- 97 testes aprovados, incluindo 19 novos casos de ocupação, capacidade simultânea, interseção com restrições, sobreposições, duração fixada, recebimentos/repasses, agrupamento de crédito/débito, rankings, semana entre anos, estados vazios e percentuais positivos pequenos.
- Build TypeScript/Vite aprovado. Sem novas dependências para gráficos.
- Navegador em localhost, isolado dos dados em 127.0.0.1: dois serviços concluídos totalizaram 2h de 35h disponíveis (5,7%), R$340 recebidos e R$196 de saldo antes de despesas. Cartão R$160 e Pix R$180 apareceram no gráfico circular; a falta registrada entrou no ranking e na taxa de faltas.
- Filtros Dia/Semana/Ano e profissional verificados. Ocupação anual pequena aparece como 0,04%, sem ser arredondada a zero.
- Desktop e viewport de 390px inspecionados. Página manteve 390px; gráficos de evolução usam área de rolagem própria de 480px dentro de 352px.
- Limites explícitos: tempo estimado pela duração, jornada atual aplicada ao histórico, disponibilidade do período inteiro e recebimentos agrupados pela data do atendimento. Não há cronômetro, conciliação financeira ou metas automáticas.

## Edição/exclusão e WhatsApp manual

- Build e 110 testes aprovados, incluindo 13 cenários novos: editar cliente mantendo histórico, evitar duplicação de nomes, restringir operações ao administrador, exclusão/restauração de clientes e profissionais, remoção da disponibilidade, URL com DDI/texto, autorização, número inválido e repetição por sete dias.
- Navegador em localhost isolado: nome do cliente editado; prévia do WhatsApp exibiu `wa.me` com telefone e texto codificado. O link foi inspecionado sem abrir conversa externa ou enviar mensagem.
- Cliente excluído apareceu em Excluídos e foi restaurado. Profissional excluído foi restaurado desabilitado, mantendo serviço e repasse.
- Lista de clientes inspecionada em 390px, sem transbordamento horizontal, com três ações legíveis. Viewport temporário restaurado.
- Mensagens nunca são marcadas como enviadas. A proteção local registra somente a solicitação de abertura; não existe retorno de entrega ou confirmação de envio.

Recorrência semanal: build aprovado e 121 testes passando. Os 11 novos casos cobrem múltiplos dias, limites de período, virada de ano, IDs únicos, soma dos serviços e bloqueio integral em conflitos/ausências. Todas as ocorrências são materializadas no armazenamento local; não existe tarefa automática em segundo plano.

Controle de presença: testes com relógio fixo de São Paulo cobrem fechamento, saída/retorno, interseção entre estabelecimento e profissional, virada de dia, limite até o momento atual, fallback histórico explícito, jornadas/ausências e preservação dos indicadores financeiros. Controles são demonstrativos e locais.

Profissional único: botão unificado sincroniza presença e abertura, sem seletor. Presença em folga exige chegada explícita na data, conta intervalos de saída/retorno, não herda presença do dia anterior e mantém restrições manuais. Serialização dos eventos preserva o estado. Build aprovado e 139 testes passando.

Exportações e períodos: 146 testes aprovados. Novos testes verificam CPF/CNPJ opcional, preservação dos zeros, associação por ID, filtros de período, semana entre anos, valores recebidos/pendentes e leitura do `.xlsx` exportado com fórmulas/totais. Build aprovado. Auditoria npm após atualização do Vitest e override compatível de uuid no ExcelJS: zero vulnerabilidades. O bundle do ExcelJS é carregado sob demanda e gera aviso informativo de tamanho no Vite. PDF é produzido via Salvar como PDF na impressão do navegador, com CSS próprio.

Configurações em abas e lembrete de agendamento: 151 testes aprovados. Verificação no navegador confirmou as três abas, pré-visualização com variáveis e links de WhatsApp na pilha sem abrir conversas externas nem enviar mensagens. Testes cobrem mudança da assinatura ao reagendar/editar, repetição permitida, associação por ID e bloqueios por autorização/telefone/exclusão. “Lembrete aberto” não é confirmação de envio.

Aparência: modo escuro com rosa conferido no navegador em Configurações e Início. Testes verificam contraste de todas as cores dos botões e normalização de preferências. Logo: validação de formato/tamanho; pagamento posterior: teste garante atualização do mesmo atendimento, sem duplicar receitas. Espaçamento entre valor e forma de pagamento no Início aumentado para 14 px.

Verificação final no navegador: o controle de pagamento do Início abriu o modal; atendimento concluído foi marcado Não pago e retornou a Pix no mesmo registro demonstrativo. Espaçamento calculado de 14 px confirmado. Upload de PNG descartável foi redimensionado/armazenado e apareceu na tela de acesso ao abrir uma nova aba; logo de teste removida pela interface. Build aprovado e 165 testes passando.

Convites de retorno configuráveis: testes cobrem limite de dias, elegibilidade, consentimento/telefone, intervalo de sete dias, alerta a partir da terceira abertura, reset por nova conclusão sem apagar histórico, alteração de pagamento sem reset, preservação ao editar cliente e recarga do armazenamento. 179 testes aprovados.

Conferência visual: prazo alterado temporariamente para 20 dias, refletido no filtro e nos sinalizadores de Clientes. “Pode convidar agora” exibiu apenas os dois clientes demonstrativos elegíveis. Prazo restaurado para 30 dias pela interface. Nenhuma conversa externa foi aberta ou mensagem enviada.

Administrador com senha demonstrativa: 182 testes aprovados e build aprovado. Novos testes verificam e-mail normalizado, senha correta/incorreta, confirmação, ausência de senha em texto puro e persistência da credencial derivada. Recuperação aparece somente no administrador, explicitamente sem conexão e sem envio de e-mail. Nenhum projeto Firebase foi provisionado nem foi feita autenticação externa.
