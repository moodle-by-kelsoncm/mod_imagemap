moodle-mod_imagemap
===================

**Transforme uma imagem num mapa do curso: cada área leva a uma atividade ou seção e mostra se ela já está aberta para o estudante.**

.. figure:: img/view.png
   :alt: Um mapa de imagem: áreas abertas aparecem normais, áreas restritas em cinza, com uma seta tracejada entre elas.
   :width: 100%

   Um mapa de imagem: áreas abertas aparecem normais, áreas restritas ficam em cinza e as setas mostram o caminho entre elas.

* **Desenhe sobre a sua imagem.** Retângulos, círculos e polígonos, movidos e redimensionados com o mouse.
* **Ligue a atividades e seções.** Cada área abre uma atividade ou seção do curso.
* **Segue as restrições de acesso.** Uma área cujo destino ainda não está disponível recebe o estilo "inativo" e, ao ser clicada, explica o motivo ao estudante.
* **Mostre o caminho.** Desenhe setas entre as áreas para sugerir uma ordem.
* **Estilize cada área.** CSS visual para os estados ativo e inativo, com exemplos prontos mantidos pelo administrador.

English version: `English <../en/index.html>`_.

.. toctree::
   :maxdepth: 2
   :caption: Conteúdo

   installation
   configuration
   usage
   backup_restore

Principais recursos
-------------------

* **Editor de áreas**: ferramentas de seleção, retângulo, círculo, polígono, linha e borracha num canvas sobre a imagem.
* **Destinos**: atividades e seções do curso, incluindo subseções.
* **Restrições e conclusão**: o estado de cada área vem da disponibilidade do destino para o usuário; professores sempre veem todas as áreas como ativas.
* **CSS seguro**: só propriedades visuais são mantidas; valores com ``url()``, ``expression()``, aspas, chaves ou comentários são descartados.
* **Backup, restauração e duplicação**: áreas e linhas são mantidas e seus destinos apontam para as atividades e seções do curso restaurado.
* **Moodle 4.5 LTS e 5.3 LTS**: testado numa matriz de CI com PostgreSQL e MariaDB.

Links
-----

* Código-fonte e issues: https://github.com/moodle-by-kelsoncm/mod_imagemap
* Moodle Marketplace: https://marketplace.moodle.com/plugins/mod_imagemap
