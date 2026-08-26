/*
 * Catálogo: índices econômicos e tabelas judiciais.
 *
 *   GET /v1/indices  — um índice é UMA série (IPCA-E, INPC, Selic, dólar).
 *   GET /v1/tables   — uma tabela judicial diz qual índice corrige CADA MÊS
 *                      e quais juros incidem (CJF, TJ/SP, TJ/MG).
 *
 * São coisas diferentes, em rotas e espaços de id separados. O `id` de /v1/tables
 * é o que vai em `indexador` de um calculosJudiciais; um id de /v1/indices ali é
 * recusado com 400, porque sem tabela o cálculo sairia com o valor NOMINAL.
 *
 * Uso: DEBIT_API_KEY=... node exemplos/indices.js
 */

const { chamar } = require('./_debit');

(async () => {
    const { indices } = await chamar('GET', '/v1/indices');
    console.log(`\nÍNDICES (${indices.length})`);
    console.table(indices.slice(0, 15).map((i) => ({
        slug: i.slug || '—',
        id: i.id,
        nome: i.name,
        tipo: i.type,               // perc = variação %; moeda = valores monetários
        cobertura: `${i.coverageStart || '?'} → ${i.latestAvailable || '?'}`,
    })));

    const { tables } = await chamar('GET', '/v1/tables');
    console.log(`\nTABELAS JUDICIAIS (${tables.length})`);
    console.table(tables.slice(0, 15).map((t) => ({
        id: t.id,                   // este é o calcId real — use em `indexador`
        slug: t.slug || '—',
        nome: t.name,
    })));

    console.log('\nDetalhe de um índice: GET /v1/indices/{slug|id}');
    console.log('Detalhe de uma tabela: GET /v1/tables/{id|slug}\n');
})().catch((e) => { console.error(e.message); process.exit(1); });
