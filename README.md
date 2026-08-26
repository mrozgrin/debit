# Debit API

> ### ⚠️ A API antiga de atualização monetária foi descontinuada
>
> Ela saiu da documentação em 26/08/2026 e **não recebe mais manual, exemplos nem
> especificação**. As integrações que já existem continuam funcionando, mas nenhuma nova
> deve ser escrita contra ela.
>
> **A substituta é a Debit API, documentada aqui: `https://mcp.debit.com.br`.** Ela faz a
> mesma correção monetária — e vai muito além dela. Para migrar, escreva para
> debit@debit.com.br.

O [Debit](https://www.debit.com.br) disponibiliza uma API RESTful que permite o acesso aos
módulos do sistema — e um servidor **MCP**, para agentes de IA usarem as mesmas calculadoras.

Dúvidas e solicitações relacionadas a integração e API devem ser enviadas para o e-mail
debit@debit.com.br .

Recursos disponíveis para acesso via API:

* [**Índices econômicos e suas séries**](#índices)
* [**Tabelas judiciais (CJF, TJ/SP…)**](#tabelas-judiciais)
* [**Correção monetária em uma chamada**](#correção-monetária)
* [**Cálculos salvos na conta**](#cálculos-salvos) — judicial, pensão alimentícia, cartão de
  ponto, financiamento, previdenciário
* [**Exportação em HTML / PDF / Excel**](#exportação)
* [**Extração de documentos por IA**](#extração-de-documentos)
* [**Servidor MCP**](#mcp-agentes-de-ia)


## URLs de acesso

| | |
|---|---|
| Base REST | `https://mcp.debit.com.br/v1` |
| Servidor MCP | `https://mcp.debit.com.br/mcp` |
| Manual | https://mcp.debit.com.br/v1/guia |
| Referência interativa | https://mcp.debit.com.br/v1/docs |
| OpenAPI (JSON) | https://mcp.debit.com.br/v1/openapi.json |
| Resumo para agentes de IA | https://mcp.debit.com.br/llms.txt |

O Debit não possui sandbox (ambiente de homologação). Cada conta do Debit é isolada das outras
(multi-tenant), sugerimos aos desenvolvedores que criem uma conta de testes, e depois utilizem a
conta de produção com os dados dos clientes.

`POST /v1/keys` aceita `"env":"test"` e devolve uma chave `dbt_test_…`, mas isso é **só um
rótulo** para você separar credenciais: ela fala com a mesma base de produção e os cálculos que
criar são reais. Para experimentar sem sujar a conta, use `POST /v1/correct` sem `save` (não
persiste nada) ou apague depois com `DELETE /v1/calc/{type}/{id}`.

Para testar a API, crie uma conta gratuitamente, acesse o sistema e clique no menu
configurações. Na aba API você gera a api_key (https://app.debit.com.br/menu/api).

O acesso está em liberação gradual por conta. Credencial válida numa conta ainda não liberada
responde `401 NOT_ALLOWED` — peça a liberação por debit@debit.com.br.


## Autenticação

A chave viaja no **cabeçalho**, como Bearer token:

```bash
curl -s "https://mcp.debit.com.br/v1/indices" \
  -H "Authorization: Bearer SUA_API_KEY"
```

Toda rota exige credencial, exceto `/health` e `/v1/auth/*`. Há quatro tipos:

| Tipo | Formato | Como obter | Quando usar |
|---|---|---|---|
| **Chave do site** | UUID (`b62d5a5f-…`) | Painel do Debit → menu **API** | O jeito mais simples: pega no site e usa |
| **Chave de API** | `dbt_live_…` / `dbt_test_…` | `POST /v1/keys` (exige JWT) | Servidor↔servidor, automações, agentes; permite escopos |
| **JWT** | `eyJ…` (~15 min) | `POST /v1/auth/login` | Sessão humana; **obrigatório** para gerenciar chaves |
| **OAuth 2.1** | Bearer via "Login com Debit" | `/authorize` (PKCE + DCR) | Conectores MCP (Claude, ChatGPT) |

Apagar a chave em https://app.debit.com.br/menu/api revoga o acesso imediatamente.

### Escopos

`index:read` · `calc:read` · `calc:write` · `calc:export` · `extract:run` · `account:read`

A chave criada no site recebe todos (a tela não tem seletor). A `dbt_live_` pode ser restringida
na criação. Sem o escopo necessário → `403 FORBIDDEN_SCOPE`; sem credencial válida → `401`.


## Métodos

Requisições para a API devem seguir os padrões:

| Método | Descrição |
|---|---|
| `GET` | Retorna informações de um ou mais registros. |
| `POST` | Utilizado para criar um novo registro, ou executar uma operação. |
| `PATCH` | Preenche/atualiza campos de um cálculo. |
| `DELETE` | Manda o registro para a lixeira (soft-delete, igual ao site). |


## Respostas

Todo erro vem no mesmo envelope:

```json
{ "error": { "code": "FORBIDDEN_SCOPE", "message": "Escopo necessário: calc:write", "hint": "…", "docUrl": "…" } }
```

| Código | Descrição |
|---|---|
| `200` | Requisição executada com sucesso (success).|
| `400` | Erros de validação, campo fora do schema ou tipo de cálculo inexistente.|
| `401` | Chave inválida/revogada (`INVALID_API_KEY`), ou conta fora da liberação (`NOT_ALLOWED`).|
| `403` | Escopo insuficiente, ou o cálculo é de outra conta.|
| `404` | Registro pesquisado não encontrado (Not found).|
| `409` | O motor recusou o valor do campo (`FIELD_REJECTED`).|
| `413` | Arquivo acima de 25 MB em `/v1/extract`.|
| `429` | Número máximo de requisições atingido (*respeite o `retryAfter` da resposta*).|
| `500` | Erro não previsto — o `requestId` da resposta identifica a chamada no suporte.|
| `502` | O motor de cálculo recusou ou falhou (`ENGINE_ERROR`, `ENGINE_NO_RESULT`, `EXTRACT_FAILED`).|

A tabela completa de códigos (`INDEX_NOT_TABLE`, `NO_FIELDS`, `CONFLICTING_FIELDS`,
`EXPORT_UNAVAILABLE`…) está no manual: https://mcp.debit.com.br/v1/guia .

**A entrada é validada antes de gravar.** Se um campo estiver errado, nada é gravado e a
resposta diz qual — inclusive dentro de arrays (`lista[1].dia`). Isso existe porque o motor não
recusa entrada malformada: ele calcularia e devolveria **R$ 0,00** com `HTTP 200`, e um laudo
zerado com cara de laudo pronto é pior que um erro.


## Limites

Não há cota por plano nem por endpoint. Existe um teto por usuário na ponte que executa o
cálculo: **60 operações por minuto** e **300 por hora**.

Consomem uma unidade cada: `POST /v1/calc`, `PATCH`, `run`, `GET /v1/calc/{type}/{id}` e
`export`. O `PATCH` conta **1 por chamada**, não por campo — preencher um cálculo inteiro num
`PATCH` só custa o mesmo que preencher um campo. Catálogo (`/v1/indices`, `/v1/tables`),
séries e `/v1/describe` **não** consomem.

Por questões de segurança, todas as requisições serão feitas através do protocolo `HTTPS`.


# Comandos da API

Nos exemplos abaixo, `$BASE` é `https://mcp.debit.com.br` e `$KEY` é a sua chave.

## Índices

Um **índice** é uma série só: IPCA-E, INPC, Selic, dólar, UFESP.

+ Endpoints

    [GET] `$BASE/v1/indices` — catálogo
    [GET] `$BASE/v1/indices/{slug|id}` — detalhe
    [GET] `$BASE/v1/indices/{slug|id}/series` — série mês a mês

+ Response 200 (application/json)

    ```json
    { "indices": [
        { "slug": "ipca_e", "id": 45, "name": "IPCA-E", "type": "perc",
          "coverageStart": "1991-12-01", "latestAvailable": "2026-06-01", "mergeable": true }
    ] }
    ```

`type`: `perc` = variação percentual; `moeda` = valores monetários. Todo índice tem `id`, e a
maioria tem `slug` — os dois resolvem na rota. Nunca há dois índices com o mesmo `slug`.

### Série de um índice

```bash
curl -s "$BASE/v1/indices/ipca_e/series?from=2024-01&to=2024-03" -H "Authorization: Bearer $KEY"
```

```json
{
  "index": { "id": 45, "slug": "ipca_e", "name": "IPCA-E (IBGE)", "kind": "index", "type": "perc" },
  "basis": { "valueMeaning": "monthly_percent", "factorField": "accumulatedPositive",
             "formula": "corrigido = valor * accumulatedPositive[ate] / accumulatedPositive[de]" },
  "sampling": "first_day_of_month",
  "from": "2024-01", "to": "2024-03", "count": 3, "truncated": false,
  "series": [ { "month": "2024-01", "date": "2024-01-01", "value": 0.31,
                "accumulated": 5.79, "accumulatedPositive": 5.98, "published": true } ]
}
```

| param | o que faz |
|---|---|
| `from` / `to` | recorta o período (`AAAA-MM`) |
| `format=csv` | devolve `text/csv` como anexo, em vez de JSON |
| `sampling=daily` | dólar, euro, Ufesp e Ufir têm série DIÁRIA; o padrão devolve só a linha do dia 1º, que é a que o cálculo usa |

**Leia o `basis` antes de usar os números.** Ele diz qual campo é o fator: num índice `perc`
quem corrige é o `accumulatedPositive`, não o `value` (que é a variação do mês). E
`value: null` com `published: false` é mês **ainda não publicado**, não deflação.


## Tabelas judiciais

**Índice e tabela não são a mesma coisa.** Uma tabela judicial diz qual índice corrige **cada
mês** e quais juros incidem (CJF, TJ/SP, TJ/MG). São rotas e espaços de id separados.

+ Endpoints

    [GET] `$BASE/v1/tables` — catálogo
    [GET] `$BASE/v1/tables/{id|slug}` — detalhe
    [GET] `$BASE/v1/tables/{id|slug}/series` — coeficientes mês a mês

+ Response 200 (application/json)

    ```json
    { "tables": [
        { "id": 23176, "slug": "cjf-condenatoria-geral", "name": "CJF: Ação condenatória geral",
          "legacyCatalogId": 24176, "kind": "table" }
    ] }
    ```

O `id` daqui é o **`calcId` real** da tabela — o mesmo espaço de id das tabelas que você mesmo
cria com `type: "tabelasJudiciais"` — e é ele que vai em `indexador` de um `calculosJudiciais`.

Onde cada família entra:

| Tipo de cálculo | Índice | Tabela judicial |
|---|---|---|
| `atualizacaoMonetaria` | `indexador` | `tabelaJudicial` (campos **separados**; mandar os dois é `400`) |
| `calculosJudiciais`, `prevDifNRecebidas` | — | `indexador` (`-1` = série inline em `tabelaPersonalizada`) |

A série de uma tabela judicial **não é guardada, é calculada**: `asOf` recalcula o coeficiente,
não recorta. E `factor` e `selicAccrued` andam juntos — nos meses de SELIC o `factor` vale 1 e a
correção inteira está no `selicAccrued`, que é **aditivo**:
`corrigido = valor * factor * (1 + selicAccrued/100)`. Usar só o `factor` erra o cálculo.

A série não traz juros: correção e juros são contas separadas.


## Correção monetária

Atalho que cria, preenche e roda um `atualizacaoMonetaria` de uma vez.

+ Endpoint

    [POST] `$BASE/v1/correct`

+ Parâmetros

    `index`: slug ou id de um ÍNDICE — veja `$BASE/v1/indices`
    `table`: id de uma TABELA judicial — veja `$BASE/v1/tables`
    Informe `index` **ou** `table`, nunca os dois (`400 CONFLICTING_FIELDS`).

+ Request (application/json)

    ```json
    {
      "index": "ipca_e",
      "updateTo": "01/06/2026",
      "items": [ { "date": "01/03/2019", "amount": 10000, "description": "Principal" } ],
      "juros": { "percentual": "1", "from": "citacao" },
      "save": false
    }
    ```

    | campo | descrição |
    |---|---|
    | `updateTo` | data-alvo, `DD/MM/AAAA` (obrigatório) |
    | `items[]` | `date` (`DD/MM/AAAA`), `amount`, `description?`, `custas?` (obrigatório) |
    | `juros` | `percentual` (a.m.) e `from`: `vencimento` \| `citacao` |
    | `multa` | `percentual` |
    | `honorarios` | `valor` e `modo`: `p` (percentual) \| `v` (valor fixo) |
    | `selic` | SELIC da EC 113 no lugar de correção+juros |
    | `selicUntil` | data final da SELIC da EC 113 (só com `selic: true`) |
    | `selicBase` | `a` \| `am` \| `aj` \| `ajm` — base de incidência |
    | `save` | `true` grava o cálculo na conta e devolve `calcId` e `hash` |

+ Response 200 (application/json) — valores ilustrativos

    ```json
    {
      "total": 14231.55,
      "correcaoMonetaria": 3021.44,
      "juros": 1210.11,
      "items": [ { "date": "01/03/2019", "amount": 10000, "corrected": 13021.44,
                   "total": 14231.55, "memoria": "…" } ],
      "saved": false
    }
    ```

**SELIC entra por dois caminhos e eles nunca somam.** Ou `"selic": true` (a da EC 113, no lugar
de correção + juros), ou o período de SELIC que a tabela judicial escolhida já declara (as do
CJF, por exemplo, de 12/2021 a 08/2025) — aplicado sozinho, sem pedir nada. Ligar
`"selic": true` por cima **substitui** a da tabela.

`selicUntil` fecha o período da SELIC **da EC 113** (só vale com `"selic": true`): depois dele o
índice volta a corrigir e os juros voltam a correr. Ele **não** recorta a SELIC de uma tabela
judicial — lá o período é o que a tabela declara.


## Cálculos salvos

Criar ou rodar um cálculo grava na **conta real** do usuário: ele aparece no dashboard do site.

```
POST   $BASE/v1/calc                      → cria         → { calcId, hash }
PATCH  $BASE/v1/calc/{type}/{id}          → preenche     { "fields": { … } }
POST   $BASE/v1/calc/{type}/{id}/run      → roda         → totais + memória
GET    $BASE/v1/calc/{type}/{id}/export   → HTML / PDF / Excel
GET    $BASE/v1/calc                      → lista os cálculos da conta
DELETE $BASE/v1/calc/{type}/{id}          → manda para a lixeira
```

> **Os campos vão dentro de `fields`.** `{"dia_atualiza": "25/08/2026"}` na raiz do corpo não
> grava nada e responde `400 NO_FIELDS`. O correto é
> `{"fields": {"dia_atualiza": "25/08/2026"}}`. Mande **todos** os campos num `PATCH` só.

O **`calcId` é a única referência necessária**: a credencial identifica a conta e a posse do
cálculo é conferida antes de qualquer operação (cálculo de outra conta → `403`). O `hash` é o
token do **link público** do cálculo (`?id=…&hash=…`, abre sem login) — aceito, nunca exigido.

`GET /v1/calc` devolve a mesma lista do dashboard, **inclusive os cálculos feitos no site**: é
por aqui que se retoma um cálculo antigo, sem ter guardado nada de uma sessão anterior. Filtre
com `?type=`, pagine com `?limit=` e `?offset=`.

```bash
# 1) criar
CREATE=$(curl -s -X POST "$BASE/v1/calc" -H "Authorization: Bearer $KEY" \
  -H 'Content-Type: application/json' -d '{"type":"atualizacaoMonetaria","name":"Correção IPCA-E"}')
ID=$(echo "$CREATE" | jq -r .calcId)

# 2) preencher (campos em GET /v1/describe/atualizacaoMonetaria)
curl -s -X PATCH "$BASE/v1/calc/atualizacaoMonetaria/$ID" -H "Authorization: Bearer $KEY" \
  -H 'Content-Type: application/json' -d '{
    "fields":{
      "indexador":45,
      "dia_atualiza":"01/06/2026",
      "lista":[{"dia":"01/03/2019","valor":10000,"desc":"Principal"}],
      "calc_jurosm":true, "juros_moratorios.percentual":"1"
    }}'

# 3) rodar
curl -s -X POST "$BASE/v1/calc/atualizacaoMonetaria/$ID/run" -H "Authorization: Bearer $KEY" \
  -H 'Content-Type: application/json' -d '{}'
```

### Tipos de cálculo

| type | Descrição | Campos obrigatórios típicos |
|---|---|---|
| `atualizacaoMonetaria` | Correção monetária (Lei 14.905/2024) | `indexador`, `dia_atualiza`, `lista` |
| `calculosJudiciais` | Liquidação de sentença | `indexador`, `dataAtual`, `valorList` |
| `cartaoPonto` | Horas extras a partir do ponto | `jornada`, `horario` |
| `pensaoAlimenticia` | Débito de pensão + atualização | `fixacao.tipo`, `dia_atualiza`, `lista` |
| `saldoDevedor` | Revisão de financiamento | `valor`, `juros`, `juros_periodo`, `parcelas`, `dia` |
| `tabelasFinanciamento` | PRICE / SAC / SACRE | `valor`, `juros`, `parcelas`, `sistema`, `carencia` |
| `tabelasJudiciais` | **Monta** a tabela de correção que os cálculos consomem (não atualiza valores) | `vl` |
| `prevDifNRecebidas` | Diferenças previdenciárias | `especieBeneficio`, `dataInicioBeneficio`, `indexador`, `valorList` |

O schema completo de cada tipo — campo a campo, com enums e obrigatoriedade — está em
`GET $BASE/v1/describe/{type}`. **Consulte-o**: é a fonte dos nomes que vão em `fields`.

### Exportação

`GET $BASE/v1/calc/{type}/{id}/export?format=html|pdf|excel`

HTML existe nos 8 tipos; PDF e Excel, hoje, só em `pensaoAlimenticia`. Pedir um formato
indisponível devolve `400 EXPORT_UNAVAILABLE` com a lista do que existe para aquele tipo.


## Extração de documentos

+ Endpoint

    [POST] `$BASE/v1/extract` (escopo `extract:run`)

```bash
curl -s -X POST "$BASE/v1/extract" -H "Authorization: Bearer $KEY" \
  -F 'docType=cnis' -F 'file=@cnis.pdf'
```

`docType`: `cnis` | `sentenca` | `cartaoPonto` | `trabalhista`. Também aceita JSON com
`fileBase64` e `filename`. Teto de **25 MB por arquivo** — em base64 o corpo cresce ~33%, então
prefira multipart. Acima disso, `413 FILE_TOO_LARGE`; documento ilegível, `502 EXTRACT_FAILED`
com o motivo.


## MCP (agentes de IA)

Endpoint `POST https://mcp.debit.com.br/mcp` (Streamable HTTP, JSON-RPC 2.0), com a mesma
autenticação do REST. Conectores remotos (Claude, ChatGPT) também podem usar o
**"Login com Debit"** (OAuth 2.1, Authorization Code + PKCE + Dynamic Client Registration),
descoberto em `/.well-known/oauth-authorization-server`.

As tools espelham o REST: `debit_list_indices`, `debit_list_judicial_tables`,
`debit_get_index_series`, `debit_describe_calculation_type`, `debit_correct_value`,
`debit_create_calculation`, `debit_set_calculation_fields`, `debit_run_calculation`,
`debit_get_calculation`, `debit_list_my_calculations`, `debit_delete_calculation`,
`debit_export_calculation`, `debit_extract_document`.

Os cálculos criados pelo agente ficam **salvos na conta do usuário** e aparecem no site.


## Exemplos

Na pasta [`exemplos/`](exemplos), em Node.js puro (18+, sem dependências):

| Arquivo | O que mostra |
|---|---|
| [`indices.js`](exemplos/indices.js) | catálogo de índices e de tabelas judiciais |
| [`serieIndice.js`](exemplos/serieIndice.js) | série mês a mês de um índice, lendo o `basis` |
| [`corrigir.js`](exemplos/corrigir.js) | correção monetária em uma chamada (`/v1/correct`) |
| [`calculoSalvo.js`](exemplos/calculoSalvo.js) | fluxo completo: criar → preencher → rodar → exportar |
| [`_debit.js`](exemplos/_debit.js) | ajudante comum: monta o `Authorization: Bearer` e trata o envelope de erro |

```bash
export DEBIT_API_KEY=sua-chave
node exemplos/indices.js
```

O arquivo [`openapi.yaml`](openapi.yaml) deste repositório é um retrato da especificação. A
versão **canônica e sempre atual** é servida pela própria API, em
https://mcp.debit.com.br/v1/openapi.json .
