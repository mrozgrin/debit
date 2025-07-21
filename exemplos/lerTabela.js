require('dotenv').config();
const axios = require('axios');

let params = {
    tabela: 'igpm',     // escolha a tabela. Veja a lista de tabelas disponíveis: https://client-api.debit.com.br//atualiza-v1/listaTabelas
    dataAtualizacao: '01/04/2025', // Se o campo permiteSelic for true, informe a data de atualização da tabela
    dataInicioSelic: '01/01/2024', // Se o campo permiteSelic for true, informe a data de inicial da Selic 
    apikey: process.env.API_KEY,
}

const url = 'https://client-api.debit.com.br/atualiza-v1/lerTabela'


axios.post(url, params)
    .then(function (resposta) {
        console.log(resposta.data)
    })
    .catch(function (error) {
        console.log(error)
    })