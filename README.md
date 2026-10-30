# moodle-mod_imagemap

[English](#english) · [Português (Brasil)](#português-brasil)

Documentation / Documentação: <https://moodle-by-kelsoncm.github.io/mod_imagemap/>

## English

Activity module that turns an image into a map of the course: teachers draw rectangles, circles and polygons over the image, link each area to a course activity or section and connect areas with arrows. Each area follows the availability of its target, so restricted areas are shown with their "inactive" style and explain the restriction when clicked. Supports Moodle 4.5 LTS and 5.3 LTS.

Install: copy this repository to `mod/imagemap` (`public/mod/imagemap` on Moodle 5.1+) and visit *Site administration > Notifications*.

## Português (Brasil)

Módulo de atividade que transforma uma imagem num mapa do curso: o professor desenha retângulos, círculos e polígonos sobre a imagem, liga cada área a uma atividade ou seção do curso e conecta as áreas com setas. Cada área segue a disponibilidade do seu destino, então áreas restritas aparecem com o estilo "inativo" e explicam a restrição ao serem clicadas. Suporta Moodle 4.5 LTS e 5.3 LTS.

Instalação: copie este repositório para `mod/imagemap` (`public/mod/imagemap` no Moodle 5.1+) e acesse *Administração do site > Notificações*.

## Development / Desenvolvimento

- JavaScript sources are in `amd/src`; rebuild `amd/build` with `npx grunt amd --root=public/mod/imagemap` in a Moodle checkout.
- CI (`.github/workflows/ci.yml`) runs `moodle-plugin-ci` on Moodle 4.5 and 5.3 with PostgreSQL and MariaDB; run it locally with [`act`](https://github.com/nektos/act) before pushing.
- Releases: the *Prepare release* workflow builds the ZIP and a draft release; publishing the draft creates the tag, and *Verify published release* checks it. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Support and privacy / Suporte e privacidade

- Issue tracker / Rastreador de issues: <https://github.com/moodle-by-kelsoncm/mod_imagemap/issues>
- Privacy / Privacidade: the plugin stores no personal data (Privacy API null provider) / o plugin não guarda dados pessoais.
- Translations / Traduções: only English is shipped; other languages go through AMOS / o pacote traz só inglês; outros idiomas via AMOS.

## License / Licença

GNU GPL v3 or later. See [LICENSE.md](LICENSE.md).
