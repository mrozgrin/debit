const axios = require('axios');

const url = 'https://client-api.debit.com.br/atualiza-v1/listaTabelas'

axios.post(url, params)
.then(function (resposta) {
    console.table(resposta.data)
})
.catch(function (error) {
    console.log(error)
})
