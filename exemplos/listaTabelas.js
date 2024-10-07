const axios = require('axios');

const apikey = 'sua-api-key'

let params = new URLSearchParams();
params.append('apikey', apikey)

const url = 'https://client-api.debit.com.br/atualiza-v1/listaTabelas'


axios.post(url, params).
then(function (resposta) {
    console.log(resposta.data)
}).catch(function (error) {
    console.log(error)
})