# Plano de correção: auditoria de segurança Juntoo

Nada foi alterado no código. Abaixo está o resultado da auditoria das regras do banco de dados e das funções do servidor, comparado ao relatório (35 itens).

## Resultado da auditoria

**Confirmados no banco ou no código atual (23):**

| ID | O que comprovei |
|---|---|
| F01 | `apply_penalty` pode ser chamada por qualquer usuário logado e não confere se quem chama é moderador |
| F02 / F15 | Ao editar o próprio perfil, o usuário consegue alterar qualquer campo, inclusive `verified`, `verification_level`, `business_verified` e `suspended_reason`. Nenhuma trava protege esses campos |
| F03 | A entrada em evento só confere se a pessoa está inscrevendo a si mesma. Não verifica se o evento é privado nem o código de convite |
| F04 | Qualquer usuário consegue se incluir em qualquer conversa cujo identificador conheça |
| F05 | Na edição de mensagem direta, só se confere se a pessoa participa da conversa. O texto e o remetente podem ser trocados |
| F08 | `get_available_users` devolve latitude e longitude exatas de outros usuários |
| F09 | Quem recebe o pedido de amizade pode alterar o campo `user_id`, que indica quem enviou |
| F10 | O membro pode entrar ou se editar com `role = admin` e escolher o próprio `status` |
| F11 | O próprio usuário pode inserir conquistas, e elas alimentam a pontuação de confiança |
| F12 | Ao editar uma avaliação, é possível trocar o evento e a pessoa avaliada |
| F13 | Ao criar uma denúncia, o denunciante pode definir `status` e `is_urgent`. Isso aciona os limites automáticos de moderação |
| F14 | Ao pedir verificação, o usuário pode definir `status`, `reviewed_by` e `reviewer_notes` |
| F17 | `send-push-notification` aceita qualquer usuário logado e envia notificação para qualquer `user_id` informado |
| F18 | O servidor faz uma chamada `fetch` para o endereço gravado pelo próprio usuário, sem validar o destino |
| F20 | Na edição do próprio evento, o criador pode alterar `is_featured` (o patrocínio já tem trava) |
| F21 | Ao criar um pedido, o comprador pode definir `status`, `paid_at`, `gateway_charge_id` e `organizer_id` |
| F22 | A exclusão de conta registra `completed` antes de apagar o usuário. Também não remove arquivos do armazenamento, mensagens nem participações |
| F28 | O passo de auditoria de dependências termina com `\|\| true` e por isso nunca falha |
| H02 | O servidor de desenvolvimento escuta a rede (`host: "::"`) com Vite 5.4 |

**Parcial ou a confirmar (12):** F06, F07, F16, F19, F23, F24, F25, F26, F27, H01, H03 e P01 a P04. Para estes, encontrei indícios, mas preciso ler o código das funções e das telas para comprovar. Por isso, cada um entra no plano com um passo de verificação antes da correção.

## Plano de ações (em ordem de prioridade)

**Fase 1: travas de privilégio (F01, F02, F13, F14, F15, F20, F21, F24)**
- `apply_penalty`, `revoke_penalty` e as funções de aprovação passam a exigir papel de moderador ou admin, e o moderador registrado passa a ser sempre quem fez a chamada.
- Uma trava no banco impede o usuário comum de alterar campos protegidos: verificação, suspensão, `is_featured`, status de denúncia ou verificação e campos financeiros dos pedidos.
- Contas suspensas ou banidas ficam bloqueadas também no banco de dados, não só nas telas: não criam eventos, não enviam mensagens e não entram em eventos.

**Fase 2: privacidade e acesso (F03, F04, F05, F06, F07, F08, F25, H01, P04)**
- A entrada em evento privado passa a acontecer só por uma função que confere o código de convite.
- A inclusão em conversas passa a acontecer só por `find_or_create_conversation`, que vai respeitar bloqueios e a opção `allow_direct_messages`.
- Na mensagem direta, só será possível alterar o campo `read`. Na mensagem de evento, a edição passa a conferir de novo se a pessoa participa.
- A localização volta arredondada (cerca de 1 km) e o perfil público mostra só os campos necessários.
- As imagens de eventos privados passam para um armazenamento privado, acessado por links temporários.

**Fase 3: confiança e reputação (F09, F10, F11, F12, H03)**
- Conquistas passam a ser concedidas só pelo servidor.
- Os campos que identificam uma avaliação ou uma amizade ficam fixos depois de criados.
- O papel de admin de comunidade só pode ser dado por outro admin.
- O limite de vagas do evento passa a usar um bloqueio no banco, para evitar inscrições acima da capacidade quando várias pessoas entram ao mesmo tempo.

**Fase 4: funções do servidor e notificações (F16, F17, F18, F19, P02, P03)**
- O envio de notificação push passa a ser só interno (chave de serviço). Os endereços de push são validados contra os provedores conhecidos (FCM, Apple, Mozilla).
- Lembretes e reengajamento passam a exigir um segredo de agendamento.
- A geração de imagem ganha uma cota diária por usuário.
- Os links das notificações push ficam restritos ao próprio app.

**Fase 5: LGPD e registros (F22, F23, F26)**
- A exclusão de conta fica completa: remove arquivos, mensagens e participações. Só depois de tudo apagado o pedido é marcado como concluído.
- A exportação de dados passa a incluir todas as tabelas do usuário.
- Os registros de atividade passam a ser gravados pelo servidor, com autor e resultado da ação.

**Fase 6: código e infraestrutura (F27, F28, H02, P01)**
- Os limites de criação de conteúdo serão revisados em todos os caminhos de envio.
- A auditoria de dependências volta a reprovar o build quando encontrar problemas.
- O servidor de desenvolvimento passa a escutar só a própria máquina e o Vite será atualizado.
- O cache do app é limpo ao sair da conta.

## Detalhes técnicos
- Cada fase vira uma alteração no banco, com as permissões de acesso necessárias, e em seguida um scan de segurança.
- As travas de campos protegidos rodam antes de salvar e liberam a alteração quando quem age é admin, moderador ou o próprio sistema.
- Telas do app afetadas: entrar por link privado, mensagens diretas, painel administrativo e configurações de privacidade.
- Os achados de severidade alta (fases 1 e 2) devem estar resolvidos antes do lançamento nas lojas.
