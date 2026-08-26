/*
 * Ajudante comum dos exemplos — Node 18+ (fetch nativo), sem dependências.
 *
 * A chave é a mesma do painel do Debit (menu → API) ou uma dbt_live_ criada em
 * POST /v1/keys. Ela SEMPRE viaja no cabeçalho Authorization: Bearer.
 *
 *   export DEBIT_API_KEY=sua-chave
 *   export DEBIT_API_BASE=https://mcp.debit.com.br   # opcional
 */

const BASE = (process.env.DEBIT_API_BASE || 'https://mcp.debit.com.br').replace(/\/+$/, '');
const KEY = process.env.DEBIT_API_KEY;

if (!KEY) {
    console.error('Defina DEBIT_API_KEY com a sua chave (https://app.debit.com.br/menu/api).');
    process.exit(2);
}

// Toda chamada leva o Bearer. O erro da API vem no envelope { error: { code, message } }.
async function chamar(metodo, caminho, corpo) {
    const resposta = await fetch(BASE + caminho, {
        method: metodo,
        headers: {
            authorization: `Bearer ${KEY}`,
            ...(corpo ? { 'content-type': 'application/json' } : {}),
        },
        body: corpo ? JSON.stringify(corpo) : undefined,
    });

    const texto = await resposta.text();
    let dados;
    try { dados = JSON.parse(texto); } catch { dados = texto; }

    if (!resposta.ok) {
        const erro = dados && dados.error ? dados.error : { code: resposta.status, message: texto };
        throw new Error(`${metodo} ${caminho} → ${resposta.status} ${erro.code}: ${erro.message}`);
    }
    return dados;
}

const reais = (n) => 'R$ ' + Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

module.exports = { BASE, KEY, chamar, reais };
