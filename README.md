# Aplicativo de Gestão — versão 0.1

Base reutilizável em React, TypeScript e Vite para um estabelecimento por implantação, com domínio, projeto Firebase e backend próprios. Contém as melhorias revisadas no aplicativo Dalisson, sem ligar esta base ao banco, domínio ou credenciais daquele cliente.

## Executar localmente

Requer Node.js 20.19+ e npm 10+.

```bash
npm install
npm run dev
npm test
npm run build
```

O endereço padrão é http://127.0.0.1:5173. Sem `.env.local`, inicia em **demonstração local**, identificada na interface: dados e credenciais demonstrativas são armazenados no navegador, sem segurança ou integração real. Para testar pelo celular na mesma rede, use `npm run dev -- --host 0.0.0.0` e abra o IP local do computador na porta 5173.

## Funcionalidades

- Login administrativo, Dashboard, Agenda, Clientes, Financeiro, Métricas, Profissionais, Procedimentos e Configurações.
- Agenda em lista e pilha proporcional à duração, reagendamento por arraste quando suportado, múltiplos procedimentos, horários disponíveis e recorrência semanal. Cancelados liberam o horário e saem da agenda ativa.
- Confirmação de presença, falta, cancelamento e conclusão com dinheiro, Pix, crédito, débito ou não pago; o pagamento pode ser corrigido depois.
- Clientes editáveis e excluíveis, CPF/CNPJ opcional; importação vCard de até 10.000 contatos, apenas celulares, deduplicação e gravação em lotes.
- Financeiro por dia/semana/mês/ano, exportação Excel e documento do cliente; métricas, gráficos, ocupação por disponibilidade e exportação PDF pela impressão.
- Profissionais habilitáveis, desabilitáveis e excluíveis, jornada e restrições; procedimentos e repasses definidos pelo administrador. Seletores são ocultados quando resta um profissional ativo.
- Duração dos procedimentos em minutos ou horas e minutos: qualquer minuto inteiro de 1 a 540 (9 horas).
- Presença automática conforme a jornada de São Paulo e marcações manuais diárias. O estado do dia anterior não bloqueia o novo expediente.
- Nome, iniciais, logo de acesso, tema claro/escuro, cores e mensagens configuráveis.
- Lembretes de agendamento e retorno abrem o WhatsApp manualmente. Contadores indicam aberturas, não envio confirmado; não há disparo automático.

## Integração real por cliente

O modo `firebase` usa Firebase Authentication, Firestore e regras de autorização. O administrador é provisionado fora da interface; somente ele possui recuperação por e-mail. O acesso profissional usa Worker Cloudflare separado, usuário/senha e sessão opaca: somente o administrador redefine a senha. O profissional pode cadastrar clientes e agendar exclusivamente na própria agenda, consultar seus resultados e atualizar seus atendimentos.

A configuração pública do SDK não provisiona serviços nem concede autorização. Cada nova implantação requer configuração, regras, administrador e testes próprios. Não reutilize o projeto, Worker ou segredos de outro estabelecimento.

Consulte [instalação por cliente](docs/instancias.md), [autenticação](docs/firebase-autenticacao.md) e [backend profissional](access-backend/README.md).

## Verificações

`npm test` executa os testes unitários; `npm run build` gera o manual, valida TypeScript do frontend/backend e compila a aplicação. Para regras e persistência, instale Firebase CLI e Java compatível, depois execute:

```bash
firebase emulators:exec --only firestore --project demo-gestao-rules "npm run test:rules"
```

Validação desta atualização: **277 testes unitários e 18 testes de regras/persistência passaram**, além do build.

Os testes do emulador usam dados fictícios e não acessam produção. O build pode avisar sobre tamanho dos pacotes Firebase e ExcelJS; ExcelJS é carregado sob demanda.

## Manual e limites

O [manual do usuário](docs/manual-usuario.md) é convertido para `/manual.html` no build e pode ser impresso como PDF. O backend profissional exige atualização manual para refletir mudanças de outros aparelhos. As restrições e verificações de horário não substituem um bloqueio global entre todas as operações administrativas simultâneas. Não há cobrança, Pix bancário, envio automático de WhatsApp, auditoria completa ou backup automático implementados.

Branch de atualização: `feature/versao-0.1`. Esta atualização do repositório não publica nenhum site nem altera instalações existentes.
