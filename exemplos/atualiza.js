var axios = require('axios');

const dataAtualizacao = '01/01/2023'
const indiceAtualizacao = 'igpm'
const lista = [
    {"dia":"01/01/2010","valor":10000}, 
    {"dia":"01/02/2010","valor":20000}
]

const params = {
    dataAtualizacao: dataAtualizacao,
    indiceAtualizacao: indiceAtualizacao,
    lista: lista,
    apikey: 'sua-api-key-aqui',
}

const url = 'https://client-api.debit.com.br/atualiza-v1/atualiza'

axios.post(url, params).
then(function (resposta) {
    console.log(resposta.data)
}).catch(function (error) {
    console.log(error)
})