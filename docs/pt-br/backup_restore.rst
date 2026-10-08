Backup e Restauração
====================

Compatibilidade com Moodle Backup/Restore
-----------------------------------------

O plugin `mod_imagemap` implementa a API de backup e restauração do Moodle:

- Os metadados de imagem e coordenadas das áreas mapeadas são serializados no arquivo de backup (`.mbz`).
- Durante a restauração em um novo curso ou novo ambiente, os links internos para atividades do mesmo curso são mapeados automaticamente para os novos IDs de módulo.
