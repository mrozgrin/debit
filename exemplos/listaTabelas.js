const axios = require('axios');

const url = 'https://client-api.debit.com.br/atualiza-v1/listaTabelas'

axios.get(url)
.then(function (resposta) {
    console.table(resposta.data)
})
.catch(function (error) {
    console.log(error)
})
