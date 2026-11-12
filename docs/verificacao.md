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
