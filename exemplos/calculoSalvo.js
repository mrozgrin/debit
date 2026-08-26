/*
 * Fluxo completo de um cálculo salvo — criar → preencher → rodar → exportar.
 *
 *   POST   /v1/calc                      → { calcId, hash }
 *   PATCH  /v1/calc/{type}/{id}          → { "fields": { … } }
 *   POST   /v1/calc/{type}/{id}/run      → totais + memória
 *   GET    /v1/calc/{type}/{id}/export   → HTML / PDF / Excel
 *   DELETE /v1/calc/{type}/{id}          → lixeira (soft-delete, igual ao site)
 *
 * ⚠️ Os campos vão DENTRO de `fields`. Campo na raiz do corpo não grava nada e
 *    responde 400 NO_FIELDS. Mande todos num PATCH só: além de mais rápido, o
 *    PATCH consome 1 unidade do limite por CHAMADA, não por campo.
 *
 * O calcId é a única referência necessária: a credencial identifica a conta e a
 * posse do cálculo é conferida antes de qualquer operação (cálculo de outra
 * conta → 403). O `hash` é o token do link público, aceito mas nunca exigido.
 *
 * Uso: DEBIT_API_KEY=... node exemplos/calculoSalvo.js
 */

const fs = require('fs');
const { BASE, KEY, chamar, reais } = require('./_debit');

const TIPO = 'atualizacaoMonetaria';

(async () => {
    // 0) O schema de campos do tipo — a fonte dos nomes que vão em `fields`.
    //    Devolve { type, label, source, fields: [{campo, tipo, required, descricao}], exemplo }.
    const schema = await chamar('GET', `/v1/describe/${TIPO}`);
    const obrigatorios = schema.fields.filter((c) => c.required).map((c) => c.campo);
    console.log(`\nCampos obrigatórios de ${TIPO}: ${obrigatorios.join(', ')}`);

    // 1) criar
    const { calcId } = await chamar('POST', '/v1/calc', { type: TIPO, name: 'Exemplo — correção IPCA-E' });
    console.log(`Criado: calcId ${calcId}`);

    // 2) preencher — TUDO num PATCH só
    const patch = await chamar('PATCH', `/v1/calc/${TIPO}/${calcId}`, {
        fields: {
            indexador: 45,                      // 45 = IPCA-E (id de /v1/indices)
            dia_atualiza: '01/06/2026',
            lista: [
                { dia: '01/03/2019', valor: 10000, desc: 'Principal' },
                { dia: '01/02/2020', valor: 20000, desc: 'Parcela 2' },
            ],
            calc_jurosm: true,
            'juros_moratorios.percentual': '1',
            'juros_moratorios.a_partir': 'citacao',
        },
    });
    console.log('Campos gravados:', patch.updatedFields);

    // 3) rodar. A resposta é o resultado CRU do motor, e a forma muda conforme o
    //    tipo — em atualizacaoMonetaria o total fecha em info.soma_final.
    const resultado = await chamar('POST', `/v1/calc/${TIPO}/${calcId}/run`, {});
    console.log('Total:', reais(resultado.info.soma_final));

    // 4) exportar o demonstrativo (HTML existe nos 8 tipos; PDF/Excel só em
    //    pensaoAlimenticia — formato indisponível responde 400 EXPORT_UNAVAILABLE)
    const html = await fetch(`${BASE}/v1/calc/${TIPO}/${calcId}/export?format=html`, {
        headers: { authorization: `Bearer ${KEY}` },
    });
    fs.writeFileSync('demonstrativo.html', await html.text());
    console.log('Demonstrativo salvo em demonstrativo.html');

    // 5) a mesma lista do dashboard — é por aqui que se retoma um cálculo antigo
    const { calculations } = await chamar('GET', `/v1/calc?type=${TIPO}&limit=5`);
    console.table(calculations.map((c) => ({ calcId: c.calcId, nome: c.name, atualizado: c.updatedAt })));

    // 6) limpar (comente para manter o cálculo na conta)
    await chamar('DELETE', `/v1/calc/${TIPO}/${calcId}`);
    console.log(`calcId ${calcId} enviado para a lixeira.\n`);
})().catch((e) => { console.error(e.message); process.exit(1); });
