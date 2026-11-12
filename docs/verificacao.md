# Verificação da versão 0.1

- `npm install`: concluído com lockfile npm em árvore limpa.
- `npm run build`: TypeScript e Vite aprovados.
- `npm test`: 12 testes aprovados, cobrindo visibilidade por perfil, prazo de 30 dias, autorização para lembretes, bloqueio de duplicados pendentes/aprovados, moeda, repasse fixado e individual, conflitos de agenda, horários contíguos e cancelamentos.
- Interface local verificada no navegador: login, dashboard administrativo, menu por toque, lista de clientes, revisão e aprovação de campanha sem envio, perfil profissional, bloqueio de horário sobreposto e cadastro em horário livre.
- Layouts inspecionados em celular de 390 × 844, tablet de 768 × 1024 e desktop. Tablet sem transbordamento da página; tabelas extensas têm rolagem própria.
- A validação de conflito foi corrigida para aparecer dentro do modal e ser anunciada como alerta. O status na agenda do profissional foi preservado também na tela de celular.

Limites: testes automatizados concentram-se nas regras de domínio; não há suíte automatizada de ponta a ponta, teste em aparelhos físicos ou backend. Os resultados não comprovam segurança ou integração externa.
