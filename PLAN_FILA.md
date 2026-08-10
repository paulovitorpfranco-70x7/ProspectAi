# PLAN_FILA.md — Fila operacional de prospecção

## Contexto

O sistema de cadência já gera a mensagem certa por estágio e setor, com variação A/B
determinística. O que falta é a camada operacional: saber **quem contatar agora**.

Esta fila não substitui a tela de leads. A tela de leads mostra *leads*; a `/fila`
mostra *tarefas*.

## Princípios de design (não violar)

1. **O eixo é ação pendente, não setor.** Setor é filtro.
2. **`lead_outreach_events` é o event store** — append-only, não alterar a semântica.
   `lead_pipeline` é projeção derivada. Se divergirem, a projeção está errada.
3. **Resposta interrompe a cadência.** Lead que respondeu sai da automação e vira
   conversa humana. Nunca receber follow-up automático depois de responder.
4. **Nada de sub-estados de negociação nesta fase.** Taxa de resposta desconhecida.
   Construir UI para negociação agora é projetar para workflow imaginado.

## Regras de execução para o Codex

- Implementar **exatamente um item por vez**.
- Ao terminar o item: rodar os testes, commitar com a mensagem indicada e **PARAR**.
- Não iniciar o item seguinte. Não refatorar código fora do escopo do item.
- Se o item não puder ser concluído como escrito, **PARAR e relatar** — não improvisar.

## Cadeia de deploy (lembrete)

Commit local não atualiza produção. Sequência obrigatória:
`git push origin main` → `supabase functions deploy <função>` (se Edge Function mudou)
→ aguardar status "Ready" na Vercel antes de testar.

---

## Item 0 — Inventário (somente leitura, sem código)

**Objetivo:** mapear o que já existe antes de escrever qualquer linha, evitando
duplicar estrutura.

**Ações:**
Localizar e documentar, com caminho de arquivo e trecho relevante:

1. O enum/tipo dos estágios da cadência (`m1a` … `f3_d12`) e onde está definido.
2. Os intervalos em dias entre estágios — **se existirem**. Se não existirem em
   lugar nenhum, registrar isso explicitamente.
3. Nome e assinatura da RPC atômica que grava em `lead_outreach_events`.
4. Colunas reais de `lead_outreach_events`.
5. Onde vive a lista dos 22 setores.
6. Como as rotas Angular são registradas (arquivo de rotas, lazy loading, guards).
7. Um exemplo representativo de store com signals já existente no projeto — para
   seguir o mesmo padrão nos itens seguintes.
8. Onde ficam os tokens de tema (cores, Bebas Neue, DM Sans).

**Saída:** arquivo `INVENTARIO_FILA.md` na raiz do projeto.

**Critério de aceite:** todos os 8 pontos respondidos com caminho de arquivo. Nenhum
arquivo de código alterado.

**Commit:** `docs: inventario de dominio para a fila de prospeccao`

**PARAR.**

---

## Item 1 — Função pura de cálculo da próxima ação

**Objetivo:** isolar toda a regra de agendamento numa função pura e testável, sem
banco e sem Angular.

**Arquivos:** novo módulo de domínio, seguindo a estrutura DDD já usada no projeto.
Caminho a definir a partir do Item 0.

**Assinatura:**

```
calcularProximaAcao(entrada: {
  estagioAtual: EstagioCadencia | null
  ultimoEnvioEm: Date | null
  respondeuEm: Date | null
  agora: Date
}): {
  estado: 'novo' | 'em_cadencia' | 'vencido' | 'respondeu' | 'perdido'
  proximoEstagio: EstagioCadencia | null
  proximaAcaoEm: Date | null
}
```

**Regras:**

- `respondeuEm` preenchido → estado `respondeu`, `proximoEstagio` null,
  `proximaAcaoEm` null. Essa checagem vem **antes de todas as outras**.
- `estagioAtual` null → estado `novo`, próximo estágio é o primeiro da cadência,
  `proximaAcaoEm` = agora.
- Estágio atual é o último da cadência e a janela expirou → estado `perdido`.
- Janela ainda não expirou → estado `em_cadencia`.
- Janela expirou → estado `vencido`, próximo estágio é o seguinte na sequência.

**Sobre os intervalos:** usar a fonte encontrada no Item 0. Se o Item 0 apurou que
não existe definição de intervalos, criar `CADENCE_SCHEDULE` como fonte única
(mapa estágio → dias desde o envio anterior) e **PARAR para confirmação do Paulo
antes de escolher os valores**. Não inventar intervalos.

**Testes obrigatórios:**

- lead novo
- lead dentro da janela
- lead com janela vencida em cada estágio da cadência
- lead que respondeu no meio da cadência (deve sair, não avançar)
- lead que esgotou o último estágio
- fuso: comparação de datas em horário de Brasília, não UTC

**Critério de aceite:** todos os testes passam. Nenhuma importação de Supabase,
Angular ou HTTP no módulo.

**Commit:** `feat: funcao pura de calculo da proxima acao da cadencia`

**PARAR.**

---

## Item 2 — Tabela de projeção `lead_pipeline` + backfill

**Objetivo:** criar a projeção que a fila vai ler.

**Arquivos:** nova migration Supabase.

**Schema:**

```sql
create table lead_pipeline (
  lead_id uuid primary key references leads(id) on delete cascade,
  setor text not null,
  estado text not null,
  estagio_atual text,
  proxima_acao_em timestamptz,
  ultimo_envio_em timestamptz,
  respondeu_em timestamptz,
  tentativas int not null default 0,
  atualizado_em timestamptz not null default now()
);

create index on lead_pipeline (estado, proxima_acao_em);
create index on lead_pipeline (setor, estado);
```

**Backfill:** popular a partir de `lead_outreach_events` — para cada lead com
eventos, derivar estágio atual e último envio. Leads sem nenhum evento entram
com `estado = 'novo'`, `proxima_acao_em = now()`.

**Critério de aceite:** contagem de linhas em `lead_pipeline` igual à contagem de
leads. Nenhum `estado` nulo. Query `select estado, count(*) from lead_pipeline
group by estado` executada e o resultado colado no relatório.

**Commit:** `feat: tabela de projecao lead_pipeline com backfill`

**PARAR.**

---

## Item 3 — Escrita atômica e RPC de leitura

**Objetivo:** manter a projeção sempre coerente com o event store e expor a
consulta da fila.

**Arquivos:** migration com alteração da RPC existente + nova RPC de leitura.

**Escrita:** a RPC que já grava em `lead_outreach_events` passa a fazer, **na mesma
transação**, um upsert em `lead_pipeline` aplicando a mesma regra do Item 1.
Se o evento falhar, a projeção não muda. Não usar trigger — deixar explícito na RPC.

Adicionar também uma RPC `registrar_resposta(lead_id, respondeu_em)` que grava o
evento de resposta e marca a projeção como `respondeu`.

**Leitura:** `fila_do_dia(p_setor text default null, p_limite int default 50)`
retornando duas coisas:

- contagens por estado (`agir_hoje`, `aguardando`, `responderam`)
- lista dos leads em estado `vencido` ou `novo`, ordenada por `proxima_acao_em`
  ascendente, com `lead_id`, nome, telefone, setor, `estagio_atual`,
  `proximo_estagio`, `ultimo_envio_em`

**Critério de aceite:** chamar a RPC de escrita para um lead de teste e verificar
que `lead_pipeline` avançou de estágio. Chamar `registrar_resposta` e verificar que
o estado virou `respondeu` e `proxima_acao_em` ficou nula. `fila_do_dia` retorna
resultado coerente com filtro de setor.

**Commit:** `feat: escrita atomica na projecao e rpc fila_do_dia`

**PARAR.**

---

## Item 4 — Store Angular com signals

**Objetivo:** camada de estado da fila, sem UI.

**Arquivos:** serviço + store, seguindo o padrão identificado no Item 0.

**Estado exposto:**

- `contagens` — signal com os três contadores
- `itens` — signal com a lista da fila
- `setorSelecionado` — signal, null = todos
- `itensFiltrados` — computed
- `carregando`, `erro` — signals

**Ações:**

- `carregar()` — chama `fila_do_dia`
- `marcarEnviado(leadId)` — chama a RPC de escrita, remove o item da lista local
  otimisticamente, recarrega em caso de erro
- `marcarRespondeu(leadId)` — chama `registrar_resposta`, mesmo tratamento
- `selecionarSetor(setor)`

**Critério de aceite:** compila sem erro. Nenhum componente criado neste item.
Nenhuma chamada HTTP direta fora do serviço.

**Commit:** `feat: store de fila com signals`

**PARAR.**

---

## Item 5 — Página `/fila`

**Objetivo:** a tela.

**Arquivos:** componente standalone + registro de rota + item de menu.

**Layout, de cima para baixo:**

1. Três contadores: agir hoje, aguardando, responderam.
2. Filtro de setor em chips, com a contagem de cada setor. Chip ativo destacado.
3. Lista de "agir hoje". Cada linha: nome do negócio, telefone, e uma linha
   secundária com `estágio · descrição curta · há N dias`. Dois botões:
   **copiar** (copia a mensagem já gerada pelo motor de cadência para o estágio
   e setor daquele lead, com a variação A/B determinística) e **enviei**.
4. Rodapé com a contagem de aguardando e a data da próxima janela a vencer.

**Ação secundária:** cada linha precisa de um jeito de marcar "respondeu" — pode ser
um terceiro botão discreto ou um menu. Escolher o mais simples.

**Estado vazio:** quando não há nada para hoje, mostrar quantos leads estão
aguardando e quando vence o próximo. Não mostrar tela em branco.

**Tema PF Dev, obrigatório:**

- superfícies escuras, sem cards brancos
- Bebas Neue nos títulos, DM Sans no corpo
- **sem cantos arredondados**
- **sem biblioteca de ícones** — se precisar de ícone, SVG inline

**Critério de aceite:** build passa. Rota acessível. Copiar coloca o texto correto
na área de transferência. "Enviei" remove o lead da lista e ele reaparece no
contador de aguardando após recarregar.

**Commit:** `feat: pagina de fila operacional de prospeccao`

**PARAR.**

---

## Fora de escopo (não construir agora)

- Sub-estados de negociação, proposta, valores
- Histórico visual da conversa por lead
- Notas ou tags livres por lead
- Gráficos, taxas de conversão, qualquer métrica agregada — isso é `PLAN_PAINEL.md`
- Integração com API do WhatsApp
- Envio automático de qualquer natureza

Revisitar esta lista **depois** dos primeiros 30 contatos reais, com dados sobre
como a fila se comporta na prática.
