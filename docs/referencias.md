# Referências analisadas

Arquivo fornecido: `telas-sistema-gestao.zip`. Nove arquivos internos, sem outros anexos no checkout original. Os documentos foram usados como referência; suas afirmações sobre segurança e integrações não foram tratadas como funcionalidades existentes.

| Arquivo                           | Aplicação na versão 0.1                                                                                                                                                                          |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Admin-Inicio.dc.html`            | Marca Navalha & Co., navegação lateral, fundo cinza claro, realce azul, indicadores, agenda e alertas. Valores calculados a partir dos dados demo em vez de indicadores estáticos desconectados. |
| `Agenda.dc.html`                  | Data, filtro de equipe, status e novo atendimento. Adotada lista responsiva em lugar da grade horária nesta etapa.                                                                               |
| `Clientes-Mobile.dc.html`         | Linhas compactas, última visita, prazo de 30 dias e ação de lembrete. O envio ilustrado foi substituído por fila com aprovação explícita e sem integração.                                       |
| `Configuracoes-Lembretes.dc.html` | Mensagem personalizável, prévia, prazo e proteção contra repetição. Importação e envio pela API não são apresentados como disponíveis.                                                           |
| `Main.dc.html`                    | Entrada simples, marca e escolha de perfil. Removidas afirmações de criptografia, expiração de sessão e autenticação inexistentes.                                                               |
| `Profissional-Cadastro.dc.html`   | Associação de serviços, preço, duração, percentuais individuais e limites do perfil. Cadastro de identidade, permissões persistidas no servidor e auditoria ficam fora da demo.                  |
| `Profissional-Inicio.dc.html`     | Visão própria de agenda, serviços e ganhos, adaptável a celular.                                                                                                                                 |
| `canvas.json`                     | Inventário, títulos e dimensões das sete telas de desktop e celular.                                                                                                                             |
| `LEIA-ME.txt`                     | Confirmação de que os `.dc.html` são fontes de design e servem como referência de layout, textos, cores e fluxos.                                                                                |

A implementação mantém a linguagem visual clara das referências, com componentes padronizados, alvos de toque, foco visível, menu adaptável e modais nativos. Não inclui os scripts de canvas nem executa código do ZIP.
