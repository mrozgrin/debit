/*
 * Correção monetária em UMA chamada — POST /v1/correct
 *
 * O atalho faz criar → preencher → rodar de um atualizacaoMonetaria. Com
 * "save": false nada é persistido; com true o cálculo é gravado na conta e
 * aparece no dashboard do site (a resposta traz calcId e hash).
 *
 * Informe `index` (slug ou id de um ÍNDICE) OU `table` (id de uma TABELA
 * judicial), nunca os dois — mandar ambos é 400 CONFLICTING_FIELDS. Ao usar
 * `table`, os juros e os períodos de SELIC da tabela entram sozinhos.
 *
 * Uso: DEBIT_API_KEY=... node exemplos/corrigir.js
 */

const { chamar, reais } = require('./_debit');

(async () => {
    const pedido = {
        index: 'ipca_e',                 // ou: table: 23176  (veja exemplos/indices.js)
        updateTo: '01/06/2026',          // data-alvo, DD/MM/AAAA
        items: [
            { date: '01/03/2019', amount: 10000, description: 'Principal' },
            { date: '01/02/2020', amount: 20000, description: 'Parcela 2' },
        ],
        juros: { percentual: '1', from: 'citacao' },   // 1% a.m.; ou from: 'vencimento'
        save: false,                     // true grava na conta e devolve calcId + hash
    };

    const r = await chamar('POST', '/v1/correct', pedido);

    console.log('\nParcelas');
    console.table(r.items.map((i) => ({
        data: i.date,
        original: reais(i.amount),
        corrigido: reais(i.corrected),
        total: reais(i.total),
    })));

    console.log('\nResumo');
    console.log('  correção monetária:', reais(r.correcaoMonetaria));
    if (r.juros) console.log('  juros:             ', reais(r.juros));
    if (r.multa) console.log('  multa:             ', reais(r.multa));
    if (r.honorarios) console.log('  honorários:        ', reais(r.honorarios));
    if (r.selic) console.log('  selic:             ', reais(r.selic));
    console.log('  TOTAL:             ', reais(r.total));
    if (r.saved) console.log(`\nSalvo na conta: calcId ${r.calcId}`);
    console.log();
})().catch((e) => { console.error(e.message); process.exit(1); });
