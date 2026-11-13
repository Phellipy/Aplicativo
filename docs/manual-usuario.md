# Manual do usuário — Gestão

Guia da versão 0.1 · Acesso administrativo e profissional · Atualizado em 13/11/2026

## 1. Acesso e primeiros passos

Abra o endereço do aplicativo e entre com o e-mail e a senha do administrador. No primeiro acesso ou se esquecer a senha, informe seu e-mail e use **Primeiro acesso ou esqueci minha senha**. Abra o link recebido por e-mail e defina sua senha; confira também a pasta de spam.

O administrador entra por e-mail e senha. Profissionais entram por usuário e senha, depois que o administrador configurar o acesso em Profissionais → nome → Acesso. Cadastrar o profissional, por si só, não cria uma senha. A opção Profissional só aparece na tela de entrada quando existe algum acesso profissional ativo e habilitado.

Para começar, configure nesta ordem:

1. Em **Configurações → Estabelecimento**, ajuste o nome, a logo e a aparência.
2. Em **Procedimentos**, cadastre os serviços, suas durações e valores. A duração pode ser informada em minutos ou horas e minutos: de 1 minuto até 9 horas (540 minutos), com qualquer minuto inteiro. Por exemplo, 75 minutos equivale a 1 hora e 15 minutos. A mesma opção está disponível ao editar.
3. Em **Profissionais**, cadastre quem atende e configure a jornada de trabalho.
4. Com mais de um profissional ativo, habilite os serviços de cada um e confira os repasses.
5. Cadastre os clientes manualmente ou importe seus contatos.
6. Abra **Agenda → Novo atendimento** e faça o primeiro agendamento.

Com apenas um profissional ativo e não excluído, todos os procedimentos ficam habilitados automaticamente para ele. O repasse padrão dos novos vínculos é 100%; percentuais já configurados e valores de atendimentos antigos são preservados.

## 2. Como usar no celular

Abra o mesmo endereço pelo navegador do celular e entre na sua conta administrativa. Use o menu para alternar entre os módulos. Os dados são compartilhados entre os aparelhos pela internet.

No agendamento, data e horário aparecem lado a lado. Se alguma atualização visual ainda não apareceu, recarregue a página. Para acompanhar o atendimento no celular, a visualização **Lista** oferece os mesmos controles de status e pagamento da visualização **Pilha**.

## 3. Clientes: cadastro, edição e exclusão

Em **Clientes → Novo cliente**, preencha nome e telefone com DDD. CPF ou CNPJ é opcional e pode aparecer no relatório financeiro. Preencha a data de último atendimento de acordo com o histórico real. Registre a autorização para lembretes somente quando o cliente tiver autorizado.

Use a ação de editar para corrigir o cadastro. Excluir retira o cliente da lista ativa, preservando o histórico; consulte a lista de excluídos para restaurá-lo. Se houver horários futuros, revise-os: excluir um cadastro não substitui o cancelamento dos atendimentos.

Contatos importados começam com **Sem atendimento registrado**. A importação não inventa uma visita. Ao concluir o primeiro atendimento, o histórico de visita é atualizado. Para editar um contato que ainda não tem atendimento, mantenha esse campo vazio; não informe uma data fictícia.

## 4. Importar a agenda de contatos do celular

Aqui, “agenda do celular” significa **contatos com nome e telefone**. A importação não traz compromissos do Google Agenda ou do calendário do iPhone, conversas do WhatsApp, fotos, notas, aniversários nem e-mails. Não há sincronização automática contínua com o telefone.

### Exportar no Android

1. Abra o aplicativo **Contatos** do Google.
2. Procure **Corrigir e gerenciar → Exportar para o arquivo**. Os nomes dos menus podem variar conforme a versão e a marca do celular.
3. Escolha a conta que contém os contatos desejados.
4. Use **Exportar como .vcf** e salve o arquivo em uma pasta fácil de encontrar, como Downloads ou Documentos.

Se o aplicativo de contatos do fabricante for diferente, procure a opção de exportar contatos em **vCard (.vcf)**. Não escolha CSV para importar neste aplicativo.

Fonte e instruções atualizadas: [Ajuda oficial do Google — exportar contatos](https://support.google.com/contacts/answer/7199294?hl=pt-BR&co=GENIE.Platform%3DAndroid).

### Exportar contatos do iPhone pelo iCloud

1. Em um computador ou tablet, abra [Contatos do iCloud](https://www.icloud.com/contacts/) e entre na sua Conta Apple.
2. Selecione os contatos que deseja exportar.
3. No menu de ações, escolha **Exportar vCard** e salve o arquivo `.vcf`.
4. Disponibilize esse arquivo no aparelho em que você usará o aplicativo. É possível fazer toda a importação pelo computador, sem transferir o arquivo para o celular.

Este caminho exporta os contatos que estão no iCloud. Se seus contatos estão em uma Conta Google, exporte-os por essa conta. O arquivo pode conter dados pessoais de terceiros; guarde-o em local de sua confiança.

Fonte: [Suporte oficial da Apple — importar e exportar vCards](https://support.apple.com/pt-br/guide/icloud/mmfba748b2/icloud).

### Importar no aplicativo

1. Abra **Clientes → Importar contatos (.vcf)**.
2. Escolha o arquivo exportado. A prévia é lida no próprio aparelho.
3. Confira os nomes, telefones e avisos. Nenhum contato é salvo apenas por escolher o arquivo.
4. Marque os contatos desejados ou use **Selecionar todos os válidos**.
5. Clique em **Importar selecionados**. Para desistir, use **Cancelar**.
6. Aguarde **Dados sincronizados com o Firebase** antes de fechar ou trocar de aparelho.
7. Confira os cadastros na lista de Clientes.

O arquivo pode ter até **20 MB e 10.000 contatos**. Cada confirmação permite selecionar todos os contatos válidos. A gravação ocorre automaticamente em lotes de **200 contatos**, com progresso na tela. Mantenha a janela aberta e aguarde a conclusão. Se ocorrer uma falha, os lotes já confirmados são mantidos; reabra o mesmo arquivo para continuar sem duplicar os já cadastrados. Para arquivos maiores que o limite, exporte grupos menores.

O sistema salva somente o nome e um celular por contato. Números fixos e contatos sem celular válido são ignorados. Se houver vários celulares, usa o primeiro válido, priorizando os identificados como celular no arquivo. Para brasileiros sem tipo declarado, reconhece DDD e nove dígitos começando com 9; para internacionais, exige o código do país e o tipo celular no arquivo. Importar não autoriza lembretes e não abre nem envia mensagens no WhatsApp. Revise a autorização depois no cadastro do cliente, quando houver consentimento real.

### Se eu importar o mesmo arquivo novamente, duplica?

**Os contatos já cadastrados são bloqueados na prévia e não devem ser selecionados novamente.** O sistema compara o telefone sem espaços, parênteses ou traços e considera equivalentes números brasileiros com DDD, com ou sem o código +55. Também bloqueia nomes iguais sem diferenciar maiúsculas e minúsculas e considera os cadastros excluídos.

Há proteção contra repetidos dentro do próprio arquivo e contra duplo clique na confirmação. Importações simultâneas do mesmo telefone usam um único registro: uma operação conflitante pode apresentar erro e pedir recarga, em vez de criar uma cópia. Aguarde a sincronização e recarregue a lista antes de tentar novamente após um erro.

A reimportação não atualiza nem sobrescreve o cadastro existente. Se quiser alterar um número ou nome, use **Editar cliente**. Pessoas diferentes com o mesmo nome ou telefone compartilhado precisam de revisão manual. Se nome e telefone forem ambos alterados, o aplicativo não consegue identificar automaticamente que se trata da mesma pessoa.

## 5. Procedimentos e profissionais

Em **Procedimentos**, cadastre nome, tempo em minutos e valor. Use editar para corrigir os dados; a exclusão fica dentro da edição. Cadastros novos e alterações de preço são usados nos novos atendimentos; os atendimentos já registrados mantêm os valores combinados.

Em **Profissionais**, clique no nome para configurar a **Jornada** e os **Procedimentos e repasses**. Marque os dias de trabalho e ajuste os horários de entrada e saída. Para uma ausência pontual, registre uma restrição na data e intervalo necessários, ou bloqueie o dia todo.

Desabilitar ou excluir retira o profissional das opções de novos agendamentos e preserva seu histórico. A lista de excluídos permite restauração. Quando sobra apenas um profissional ativo, os seletores do Início e das Métricas ficam ocultos; o histórico continua no consolidado.

## 6. Agendar, confirmar e concluir atendimentos

1. Em **Agenda**, escolha a data e clique em **Novo atendimento**.
2. Selecione o cliente e, quando aplicável, o profissional.
3. Marque um ou mais procedimentos. A duração e o valor são somados.
4. Escolha a data e um dos horários disponíveis. O cálculo respeita jornada, ausências, duração total e conflitos da agenda.
5. Confirme o cadastro. O atendimento começa como **Agendado**.

Para repetição, marque **Atendimento recorrente**, escolha os dias da semana e a data final. O horário se repete nas datas escolhidas. A recorrência pode abranger até um ano. Se qualquer ocorrência conflitar com outro atendimento ou ausência, o sistema não salva a série; revise o aviso e ajuste os dados.

Use **Confirmar presença** para mudar para Confirmado. Depois da confirmação, fica disponível **Não compareceu**. Use **Cancelar** para cancelar o horário. O cancelado desaparece da Lista, da Pilha e dos calendários da agenda, e o horário fica disponível para um novo agendamento. O registro é preservado no banco e nas métricas históricas. Esses estados não registram recebimento financeiro.

Para finalizar, toque em **Atendimento Concluído** e escolha **Dinheiro**, **Pix**, **Cartão de crédito**, **Cartão de débito** ou **Não pago**. Fechar a janela sem escolher mantém o atendimento como estava. Se o cliente pagar depois ou houver engano, use **Alterar pagamento** no atendimento concluído.

Esses botões registram o pagamento manualmente. O aplicativo não cobra cartão, gera Pix ou confirma dinheiro recebido no banco. Ao concluir, a visita do cliente é atualizada e o contador de convites de retorno do ciclo atual volta a zero; corrigir apenas o pagamento não reinicia esse ciclo.

## 7. Agenda em Lista ou Pilha

Alterne entre **Lista** e **Pilha**. Na pilha diária, cada caixa ocupa a altura correspondente à duração total e mostra cliente, procedimentos, valor e status. A cor acompanha a situação do atendimento.

Para reagendar um atendimento Agendado ou Confirmado, use o controle de reagendamento ou arraste a caixa para outro horário quando o navegador permitir. O sistema valida o destino: não é permitido criar conflito, ultrapassar a jornada ou ignorar uma ausência. Se o arraste não for confortável no celular, use a ação de reagendamento.

Use os controles Hoje, Semana, Mês e Ano para consultar os períodos. Em períodos maiores, a apresentação pode mudar para calendário ou resumo. Com um único profissional ativo, a agenda usa automaticamente esse profissional.

## 8. Início, presença e ocupação

No **Início**, escolha Hoje, Semana, Mês ou Ano. Consulte recebimentos, atendimentos, ocupação e a agenda do período. Repasses previstos ficam ocultos quando existe apenas um profissional ativo.

Use o controle **Aberto/Fechado** do estabelecimento e o controle de presença/saída do profissional para registrar o tempo de disponibilidade. Fechar ou registrar saída interrompe a contagem de disponibilidade a partir daquele horário; reabrir ou registrar chegada retoma a contagem. Os registros ficam salvos no banco, inclusive ao sair e entrar novamente no aplicativo. O indicador inicia automaticamente conforme a jornada em São Paulo: Presente dentro do horário e Ausente antes do início, a partir do término, nos dias sem expediente e nas restrições. Uma saída manual vale para o dia atual até nova chegada; no próximo dia a jornada volta a ser a referência. Uma chegada durante o expediente termina com a jornada. Para trabalhar fora dela ou em dia de folga, marque Presente manualmente: a exceção vale somente naquele dia. O aplicativo atualiza o indicador ao abrir, voltar à janela e a cada 30 segundos, sem criar registros fictícios de entrada/saída.

A ocupação compara minutos dos serviços concluídos com o tempo disponível da equipe. É uma estimativa baseada nas durações cadastradas, não um cronômetro. Nos dias sem registro de presença, a jornada prevista é usada como referência. Por isso, registre entradas, saídas e ausências corretamente para obter indicadores úteis.

## 9. Financeiro e Métricas

Em **Financeiro**, selecione Dia, Semana, Mês ou Ano e a referência desejada. A tabela considera atendimentos concluídos e distingue recebidos e não pagos. O documento do cliente aparece quando cadastrado. Use a exportação para gerar a tabela em **Excel** com o período selecionado.

Em **Métricas**, consulte atendimentos, faltas, rankings, financeiro, formas de pagamento e ocupação. Com mais de um profissional ativo, use o filtro para consultar um deles. Quando sobra apenas um ativo, o seletor desaparece e o consolidado preserva os dados históricos.

Use **Exportar PDF** nas Métricas. Na janela de impressão do navegador, escolha **Salvar como PDF**. Recebimentos são agrupados pela data do atendimento; não representam a data de compensação bancária. O saldo antes de despesas não é lucro, pois custos, taxas e tributos não estão cadastrados.

## 10. WhatsApp, lembretes e retorno

Em **Configurações**, há abas separadas para **Estabelecimento**, **Lembrete de Agendamento** e **Lembrete de Retorno**. Configure o texto e confira a prévia. Use **Dicas de campos** para consultar os marcadores disponíveis.

No lembrete de agendamento, os campos são `{nome}`, `{estabelecimento}`, `{data}`, `{horario}`, `{profissional}` e `{procedimentos}`. No convite de retorno, os campos substituídos são `{nome}` e `{estabelecimento}`; os outros dependem de um agendamento e não são preenchidos nesse convite.

Na agenda, use o ícone do WhatsApp para abrir a conversa com a mensagem do atendimento. O indicador apagado registra uma abertura anterior; continua disponível para abrir de novo. Você precisa conferir e enviar a mensagem no próprio WhatsApp.

Em **Lembrete de Retorno**, defina o número de dias sem atendimento, inicialmente 30. Em Clientes, use os filtros para localizar quem está sem retorno ou pode receber convite. Os contadores mostram aberturas do link e a última data de abertura, não confirmação de envio, entrega ou leitura. A partir do terceiro lembrete aberto no ciclo, a contagem ganha destaque.

A proteção de frequência bloqueia a repetição da mesma mensagem para o mesmo cliente durante sete dias; o filtro de convite também considera o ciclo e as aberturas recentes. Não há disparo automático. Contatos recém-importados sem visita registrada não têm um histórico real de afastamento para calcular dias de retorno.

## 11. Personalizar o estabelecimento

Em **Configurações → Estabelecimento**, altere o nome, adicione ou remova a logo, selecione modo claro ou escuro e escolha a cor dos botões. O nome gera as iniciais da marca, e a logo aparece na tela de entrada. Aguarde a sincronização após salvar.

A alteração de cor dos botões não muda o significado das cores dos status e das formas de pagamento. Use os rótulos para distinguir as ações.

## 12. Dados, mensagens de erro e ajuda

Clientes, agendas, procedimentos, profissionais, presença e configurações ficam no **Cloud Firestore** do projeto Firebase configurado para o estabelecimento. A senha é gerida pelo **Firebase Authentication**. O administrador acessa os dados do estabelecimento; cada profissional recebe apenas a própria agenda, jornada e resultados autorizados pelo serviço.

Aguarde a indicação **Dados sincronizados com o Firebase** após alterações. Se aparecer erro, não considere a operação concluída. Confira a conexão. Em conflito entre aparelhos, use **Recarregar dados**, consulte o que foi salvo e refaça somente o necessário.

Se o horário estiver bloqueado, confira o procedimento selecionado, a jornada, a data e as ausências. Com vários profissionais, confirme que o serviço está habilitado para o profissional escolhido. Se a importação recusar um contato, leia o motivo: telefone inválido, nome repetido ou telefone já cadastrado. Consulte também os clientes excluídos antes de recriar um cadastro.

Para relatar um problema, informe o módulo, os passos e a mensagem exibida. Não compartilhe senhas nem arquivos completos de contatos. Este manual pode ser impresso ou salvo em PDF pelo botão no início da página.

## 13. Criar e utilizar acesso profissional

Como administrador, abra **Profissionais**, clique no nome e escolha **Acesso**. O profissional deve estar habilitado. Defina um usuário único, com 3 a 32 letras minúsculas, números, ponto, hífen ou sublinhado, e uma senha de 12 a 128 caracteres. Confirme a senha e use **Criar acesso**. A mensagem de sucesso confirma a gravação; não há senha padrão. Compartilhe o acesso diretamente com o profissional por um meio de sua confiança.

Para alterar a senha, volte ao mesmo local e use **Redefinir senha**. A senha anterior deixa de funcionar e as sessões antigas são invalidadas. **Suspender acesso**, desabilitar ou excluir o profissional bloqueia o uso da área. Se uma redefinição falhar, o acesso fica suspenso por segurança; aguarde dois minutos antes de tentar novamente.

O profissional abre a tela inicial, escolhe **Profissional**, informa seu usuário e sua senha e entra. Essa opção não pede e-mail nem mostra recuperação de senha. Se esquecer, precisa procurar o administrador. A senha não expira automaticamente; a sessão dura até oito horas, quando será necessário entrar novamente com a mesma senha vigente.

A área oferece **Minha agenda**, **Meus resultados** e **Minha jornada**. O profissional pode confirmar presença, registrar falta, cancelar, concluir com pagamento, corrigir o pagamento e reagendar seus próprios atendimentos. Use **Novo atendimento** para agendar clientes na sua própria agenda, com um ou mais procedimentos habilitados e opção de recorrência. Use **Cadastrar cliente** para informar nome e celular; **Clientes** permite buscar os contatos do estabelecimento. Não há edição ou exclusão de clientes nesta área. Jornada, ausências, procedimentos, repasses e credenciais continuam sob gestão do administrador. Os valores e repasses são calculados pelo servidor; o profissional não pode escolher outra agenda. Na visualização diária é possível alternar Lista e Pilha.

Use **Atualizar agenda** para consultar alterações feitas em outro aparelho. Essa área não atualiza os dados em tempo real. Os resultados exibem somente os próprios repasses estimados, sem comprovação de que o estabelecimento efetuou o repasse. Se o acesso for suspenso ou a senha redefinida, a próxima operação pedirá novo login. Para sair, use **Sair**.
