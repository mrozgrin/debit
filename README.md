# Debit API

O [Debit](https://www.debit.com.br) disponibiliza uma API RESTful que permite o acesso aos módulos do sistema.

Dúvidas e solicitações relacionadas a integração e API, devem ser enviadas para o e-mail debit@debit.com.br .

Recursos disponíveis para acesso via API:
* [**Consultar tabela de correção**](#reference/recursos/empresa)
* [**Efetuar cálculo de correção monetária**](#reference/recursos/contatos)


## URLs de acesso
O Debit não possui sandbox (ambiente de homologação). Cada conta do Debit é isolada das outras (multi-tenant), sugerimos aos desenvolvedores que criem uma conta de testes, e depois utilizem a conta de produção com os dados dos clientes.

Para testar a API, crie uma conta gratuitamente, acesse o sistema e clique no menu configurações. Na aba API você gera a api_key (https://app.debit.com.br/menu/api).


## Métodos
Requisições para a API devem seguir os padrões:
| Método | Descrição |
|---|---|
| `GET` | Retorna informações de um ou mais registros. |
| `POST` | Utilizado para criar um novo registro. |
| `PUT` | Atualiza dados de um registro ou altera sua situação. |
| `DELETE` | Remove um registro do sistema. |


## Respostas

| Código | Descrição |
|---|---|
| `200` | Requisição executada com sucesso (success).|
| `400` | Erros de validação ou os campos informados não existem no sistema.|
| `401` | Dados de acesso inválidos.|
| `404` | Registro pesquisado não encontrado (Not found).|
| `405` | Método não implementado.|
| `410` | Registro pesquisado foi apagado do sistema e não esta mais disponível.|
| `422` | Dados informados estão fora do escopo definido para o campo.|
| `429` | Número máximo de requisições atingido. (*aguarde alguns segundos e tente novamente*)|


## Limites 
Existe o limite de `60` requisições por minuto por aplicação+usuário.

Por questões de segurança, todas as requisições serão feitas através do protocolo `HTTPS`.

# Comandos da API

## listaTabelas

+ Endpoint

    [GET] https://client-api.debit.com.br/atualiza-v1/listaTabelas


+ Response 200 (application/json)
  A listagem de quais tabelas pode ser visualizadas

    + Body

            [
                { tabela: 'btn', nome: 'ORTN / OTN / BTN / BTN-TR', permiteSelic: false },
                { tabela: 'igp', nome: 'IGP-DI (FGV)', permiteSelic: false } 
            ]



## lerTabela

+ Endpoint

    [POST] https://client-api.debit.com.br/atualiza-v1/lerTabela

+ Parametros

    tabela: para pegar a relação de tabelas disponíveis utilize o endereço: 
    [ https://client-api.debit.com.br/atualiza-v1/listaTabelas ]

+ Request (application/json)

    + Body

            {
              "apikey": "sua-api-key",   
              "tabela": "igpm",               // escolha a tabela. Veja a lista de tabelas disponíveis: https://client-api.debit.com.br//atualiza-v1/listaTabelas
              dataAtualizacao: "01/04/2025",  // Se o campo permiteSelic for true, informe a data de atualização da tabela
              dataInicioSelic: "01/06/2024"   // Se o campo permiteSelic for true, informe a data de inicial da Selic 
            }

+ Response 200 (application/json)
  Mostrará todo o histórico de uma tabela

    + Body

            [
            { data: '06/1989', valor: 19.68 },
            { data: '07/1989', valor: 35.91 },
            { data: '08/1989', valor: 36.92 },
            { data: '09/1989', valor: 39.92 },
            { data: '10/1989', valor: 40.64 },
            { data: '11/1989', valor: 40.48 },
            { data: '12/1989', valor: 47.13 },
            { data: '01/1990', valor: 61.46 }
            ]


