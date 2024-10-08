
var axios = require('axios');

const tabela = 3 
const dataAtualizacao = '01/09/2024'
const dataInicioSelic = '01/01/2024'
const valor = 1000
const dataValor = '01/2018'

var params = new URLSearchParams();
params.append('tabela',  tabela);
params.append('dataAtualizacao',  dataAtualizacao);
params.append('dataInicioSelic',  dataInicioSelic);

params.append('apikey', '12cfbf91-ef76-4615-ab87-da15cb65cb23' )

const url = 'https://client-api.debit.com.br/atualiza-v1/lerTabela'

axios.post(url, params).
then(function (resposta) {
    let tabela = resposta.data 

    let i = tabela.find( item => item.data == dataValor )
    let valorCorrigido = valor * i.indice * (1+(i.juros/100)) * (1+(i.selic/100))

    console.log(`Valor Original em ${dataValor}: ${valor}`)
    console.log('Valor Corrigido: ', valorCorrigido.toFixed(2))

}).catch(function (error) {
    console.log(error)
})