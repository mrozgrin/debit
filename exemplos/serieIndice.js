/*
 * Série mês a mês de um índice — GET /v1/indices/{slug|id}/series
 *
 * ATENÇÃO ao campo `basis` da resposta: ele diz QUAL campo corrige. Num índice
 * `perc` quem corrige é o accumulatedPositive, NÃO o value (que é só a variação
 * do mês). Multiplicar o `value` dá resultado errado.
 *
 * `value: null` com `published: false` é mês ainda NÃO PUBLICADO, não deflação —
 * a linha continua na série porque o `accumulated` dela é legítimo.
 *
 * Parâmetros: from/to (AAAA-MM), format=csv, sampling=daily (dólar, euro, Ufesp
 * e Ufir têm série diária; o padrão devolve só o dia 1º, que é o que o cálculo usa).
 *
 * Uso: DEBIT_API_KEY=... node exemplos/serieIndice.js [slug] [de] [ate]
 *      node exemplos/serieIndice.js ipca_e 2024-01 2024-06
 */

const { chamar } = require('./_debit');

const slug = process.argv[2] || 'ipca_e';
const de = process.argv[3] || '2024-01';
const ate = process.argv[4] || '2024-06';

(async () => {
    const r = await chamar('GET', `/v1/indices/${encodeURIComponent(slug)}/series?from=${de}&to=${ate}`);

    console.log(`\n${r.index.name} (id ${r.index.id}, tipo ${r.index.type})`);
    console.log(`Fator de correção: ${r.basis.factorField}`);
    console.log(`Fórmula: ${r.basis.formula}`);
    console.log(`Amostragem: ${r.sampling} — ${r.count} linha(s)\n`);

    console.table(r.series.map((l) => ({
        mes: l.month,
        'variação %': l.value,
        acumulado: l.accumulated,
        'acum. positivo': l.accumulatedPositive,
        publicado: l.published,
    })));

    // Correção de 1 real do primeiro ao último mês, pela fórmula que o `basis` informa.
    const campo = r.basis.factorField;
    const primeiro = r.series[0];
    const ultimo = r.series[r.series.length - 1];
    if (primeiro && ultimo && primeiro[campo]) {
        const fator = ultimo[campo] / primeiro[campo];
        console.log(`\nFator de ${primeiro.month} a ${ultimo.month}: ${fator.toFixed(8)}\n`);
    }
})().catch((e) => { console.error(e.message); process.exit(1); });
