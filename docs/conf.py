import moodle_docs_theme

project = "moodle-mod_imagemap"
copyright = "2026, Kelson C. M."
author = "Kelson C. M."
release = "1.2.08"

extensions = [
    "sphinx.ext.githubpages",
    "moodle_docs_theme",
]

templates_path = []
exclude_patterns = ["_build", "Thumbs.db", ".DS_Store"]

language = "pt_BR"

html_theme = "moodle_docs_theme"
html_theme_path = [moodle_docs_theme.get_html_theme_path()]

html_theme_options = {
    "project_name": "moodle-mod_imagemap",
    "tagline": "Módulo de mapa de imagem condicional e interativo para Moodle",
    "github_url": "https://github.com/moodle-by-kelsoncm/mod_imagemap",
    "github_repo": "moodle-by-kelsoncm/mod_imagemap",
    "github_version": "main",
    "doc_path": "docs/",
    "show_edit_on_github": True,
    "enable_dark_mode": True,
    "navigation_links": "Início|index, Instalação|installation, Configuração|configuration, Uso|usage, Guia Admin|admin_guide, Backup/Restore|backup_restore",
}

html_static_path = []
