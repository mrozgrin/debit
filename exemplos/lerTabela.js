const axios = require('axios');

const tabela = 'igpm'
const apikey = 'sua-api-key'

let params = new URLSearchParams();
params.append('tabela', tabela);
params.append('apikey', apikey)

const url = 'https://client-api.debit.com.br/atualiza-v1/lerTabela'


axios.post(url, params).
then(function (resposta) {
    console.log(resposta.data)
}).catch(function (error) {
    console.log(error)
})