Essa é a API que é utilizada pelo Frontend. 

Esta ferramenta foi desenvolvida por Arthur Schuelter como Trabalho de Conclusão de Curso para o curso de Bacharelado em Ciência da Computação da UDESC. O objetivo dessa ferramenta é auxiliar a busca de artigos científicos para pesquisadores da área de Ciência da Computação. Os artigos foram coletados da base da DBLP e representam um subconjunto dos artigos disponíveis na DBLP. Foram selecionados periódicos e eventos das sub-áreas de IHC-Interação Humano Computador e BD-Banco de Dados.


`GET /journals/`

Retorna os metadados dos periódicos disponíveis na base.

`GET /conference/`

Retorna os metadados das conferências disponíveis na base.

`GET /query/`

Retorna os metadados dos artigos disponíveis na base.
Recebe parâmetros para encontrar os artigos na base: metadados, nome do autor, nome da conferência/periódico, intervalo de data.

## Scripts disponíveis

No diretório do projeto, é possível executar:

### `npm start`

Inicia a aplicação em modo de desenvolvimento. <br />
Acesse [http://localhost:4000](http://localhost:4000) para visualizar no browser.


## Dependências

Este diretório é o Backend da ferramenta, para ter acesso aos artigos é necessário obter: <br />
o conjunto de metadados dos artigos em uma base PostgreSQL.