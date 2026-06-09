# Recife Obras — Plano de Implementação

Plataforma de transparência e monitoramento de obras públicas do Recife, com backend real (Lovable Cloud), autenticação por perfil, dashboards interativos, checklist fiscal e relatórios. Pela dimensão, será construída em fases — cada fase entrega algo utilizável.

## Decisões confirmadas
- **Backend:** Lovable Cloud (banco, autenticação, storage de fotos/documentos).
- **Conteúdo:** sistema vem pré-carregado com obras de exemplo do Recife (fotos, progresso, finanças, cronograma).
- **Perfil no login:** o usuário seleciona "Quem você é?", mas o perfil é **validado contra o banco**. Se o perfil selecionado não corresponder ao cadastrado, o login é recusado com a mensagem de erro padrão.
- **Relatórios:** primeira versão com visualização e filtros na tela (exportação PDF/Excel fica para etapa posterior).

## Identidade visual
Tokens no design system (`src/styles.css`), nunca cores soltas nos componentes:

```text
Navy Gov     #0F172A  -> sidebar, textos fortes
Azul Tech    #0284C7  -> primário, links, botões ativos
Branco Gelo  #F8FAFC  -> fundo geral
Cinza Claro  #E2E8F0  -> bordas, superfícies
Verde Status #10B981  -> concluída / conforme / SPI-CPI bom
Amarelo      #F59E0B  -> atrasada / alerta
Vermelho     #EF4444  -> crítica / não conforme / erro
```
Status de obra com cor própria: Planejamento (cinza/azul), Em andamento (azul), Atrasada (amarelo), Paralisada (vermelho), Concluída (verde). Layout 100% responsivo (mobile, tablet, desktop), transições suaves e discretas.

---

## Fase 1 — Backend e modelo de dados (Lovable Cloud)

Ativar Cloud e criar o schema. Papéis em tabela separada (`user_roles` + enum) por segurança — nunca no perfil.

Tabelas:
- `profiles` (id → auth.users, nome, email, criado_em)
- `user_roles` (user_id, role: `fiscal` | `gestor` | `agente`) + função `has_role()` security definer
- `obras` (nome, endereço, bairro, empreiteira, órgão_responsável, data_inicio, data_prevista, status, percentual_concluido, valor_previsto, valor_executado)
- `obra_fotos` (obra_id, url, tipo: `real` | `ilustrativa`, data_upload)
- `comunicados` (obra_id, usuario_id, mensagem, data_publicacao)
- `comentarios` (obra_id, usuario_id, comentario, data_comentario)
- `checklist_fiscal` (obra_id, fiscal_id, data_inspecao, resultado JSONB com itens conforme/não conforme/observação, fotos, documentos)
- `obra_progresso` (séries físicas: data, % planejado, % executado) — para gráficos
- `obra_financeiro` (mês, valor_previsto, valor_realizado) — para gráficos
- `obra_orcamento` (categoria: terraplenagem/fundação/estrutura/acabamento/instalações/urbanização, valor) — pizza
- `obra_etapas` (etapa, data_prevista_inicio/fim, data_real_inicio/fim) — Gantt
- `auditoria` (usuario_id, ação, entidade, data_hora)

Cada `CREATE TABLE` com GRANTs e RLS:
- Leitura de obras/fotos/comunicados/comentários/dashboards: pública (catálogo de transparência).
- Inserir comentário: autenticado.
- Editar obra / progresso / financeiro / cronograma / comunicados: apenas `gestor` (e `agente` para comunicados).
- Checklist: criar/ver os próprios → `fiscal`; ver todos → `gestor`/`agente`.
- Storage: bucket público `obra-fotos`; bucket privado `fiscalizacao` (fotos/documentos de checklist).
- Trigger de auditoria nas alterações relevantes.

Seed com 6–8 obras de exemplo (fotos geradas, séries de progresso/financeiro/orçamento/etapas) e 3 usuários demo (um por perfil) com credenciais exibidas na tela de login para teste.

## Fase 2 — Autenticação e permissões
- Página `/auth` (login): pergunta "Quem você é?" (seleção única dos 3 perfis), email, senha com botão exibir/ocultar, botão "Confirmar" desabilitado (cinza) até todos os campos preenchidos e azul quando habilitado.
- Login valida credenciais + confere se o perfil selecionado bate com `user_roles`. Erro → mensagem vermelha "Senha ou usuário inválido(s), por favor tente novamente."
- Sessão registrada; topo direito exibe "Perfil: …".
- Rota protegida via layout `_authenticated` gerenciado. Contexto de auth com helpers de papel para liberar/bloquear ações na UI.

## Fase 3 — Shell, sidebar e tela inicial
- Layout com cabeçalho limpo (logo Recife Obras, campo de pesquisa, botão três linhas) sobre fundo Branco Gelo.
- Sidebar recolhível: fundo Navy Gov, título "Menu" em Azul Tech. Itens: Login, Dashboard, Relatórios, Checklist Fiscal. Sem autenticação só Login habilitado; demais com opacidade reduzida/desabilitados. Após login, todos liberados. Transições suaves.
- Tela inicial `/`: catálogo de obras como galeria de cards (foto principal, nome, endereço, status, % concluído, botão "Visualizar Obra"). Pesquisa filtra por nome em tempo real.

## Fase 4 — Detalhamento da obra (`/obras/$id`)
Botão de retorno no canto superior esquerdo. Seções:
- Galeria/carrossel (fotos reais + imagens ilustrativas da previsão final).
- Informações gerais (nome, endereço, bairro, empreiteira, órgão, datas).
- Andamento (% executado, barra de progresso animada, status colorido).
- Financeiro (previsto, executado, saldo, % consumido + indicadores visuais).
- Cronograma (data planejada, atualizada, dias de atraso/adiantamento).
- Comunicados (criar apenas gestor/agente; data, autor, texto).
- Comentários da comunidade (autenticados; nome, perfil, data, conteúdo).

## Fase 5 — Dashboard da obra (`/dashboard`)
Seleção de obra, depois painel analítico (Recharts):
- KPIs: % concluído, dias em execução, dias restantes, valor previsto, executado, desvio financeiro, nº de fiscalizações.
- Evolução física (linha: planejado vs executado no tempo).
- Evolução financeira (barras: previsto vs realizado por mês).
- Cronograma estilo Gantt (etapas, datas previstas vs realizadas).
- Distribuição orçamentária (pizza por categoria).
- Indicadores de desempenho: SPI, CPI, % atraso, % execução com semáforos verde/amarelo/vermelho.
- Histórico de atualizações (tabela: data, usuário, alteração).
- Botão "Editar Dashboard" visível só para `gestor`: modo edição para atualizar indicadores; alterações gravadas em auditoria e refletidas automaticamente.

## Fase 6 — Checklist fiscal (`/checklist`)
Exclusivo de autenticados (criação focada em `fiscal`). Registro de inspeção com data, obra, fiscal, e itens (Segurança do canteiro, EPIs, Sinalização, Limpeza, Conformidade do cronograma, Qualidade da execução, Conformidade documental), cada um com Conforme / Não Conforme / Observação. Upload de fotos e documentos para o bucket privado.

## Fase 7 — Relatórios (`/relatorios`)
Filtros por obra, bairro, empreiteira, status e data. Visualizações na tela: andamento físico, andamento financeiro, cronograma, fiscalizações, obras atrasadas, obras concluídas. (Exportação PDF/Excel planejada para etapa seguinte.)

---

## Notas técnicas
- Stack TanStack Start + Lovable Cloud. Leituras de dados via `createServerFn` + TanStack Query (loader prima cache, componente usa `useSuspenseQuery`). Mutações via `useServerFn` + `useMutation` com invalidação de cache → dashboards atualizam após qualquer alteração.
- Funções protegidas com `requireSupabaseAuth`; reads públicos do catálogo via server fn elevada (sem políticas amplas `anon`).
- Auditoria registrada por triggers + chamadas explícitas nas edições.
- Gráficos com Recharts (já no template).
- Fotos de exemplo geradas como assets; uploads reais usam Storage.

## Fora do escopo desta primeira entrega
- Exportação real de PDF/Excel (relatórios começam só com visualização na tela).
- Notificações em tempo real via websocket (atualização ocorre via refetch/invalidação após cada ação).

Posso ajustar qualquer fase antes de começar. Ao aprovar, inicio pela Fase 1 (backend e dados de exemplo).