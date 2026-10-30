# 🗺️ Image Map Module (mod_imagemap)

Interactive image maps with clickable areas for course navigation and conditional display based on module completion.

**Version**: 1.2.0 • **Moodle**: 4.1+ • **Status**: Alpha ✅

---

## ✨ Features

- 🎨 **Interactive Canvas Editor** - Draw shapes directly on images
- 🔗 **Flexible Linking** - Link to modules, sections, or external URLs
- 📦 **Multiple Shape Types** - Rectangles, circles, polygons
- 🎯 **Conditional Display** - Show/hide areas based on completion
- 🎭 **Full CSS Support** - Complete styling for active/inactive states
- 💾 **Backup/Restore** - Full support for Moodle backup system
- 🌍 **Multilingual** - English & Portuguese (Brazil)
- ♿ **GDPR Compliant** - Privacy API implementation

---

## 📋 Requirements

- **Moodle**: 4.1 or later
- **PHP**: 7.2 or later (7.4+ recommended)
- **Database**: PostgreSQL, MySQL, MariaDB
- **Browsers**: Chrome, Firefox, Safari, Edge

---

## ⚙️ Installation

### Method 1: Git Clone

```bash
cd /path/to/moodle/mod
git clone https://github.com/your-repo/mod_imagemap.git imagemap
```

### Method 2: ZIP Upload

1. Site Admin → Plugins → Install plugins
2. Upload ZIP file
3. Follow on-screen prompts

### Post-Installation

1. Site Admin → Notifications → Upgrade database
2. Create a test Image Map activity to verify installation
3. Done! 🎉

---

## 🚀 Quick Start

### For Teachers

1. **Create Activity**: Turn Editing On → Add Activity → Image Map
2. **Upload Image**: Select image file
3. **Draw Areas**: Click "Edit areas" → Select shape → Draw on image
4. **Configure**: Set links and styles for each area
5. **Save**: Click "Save changes"

### For Students

Simply click on areas in the image map to navigate!

---

## 📚 Documentation

**All documentation is in `/docs/`**

### Quick Links

| Role | Document | Purpose |
|------|----------|---------|
| **Teachers** | [USER_GUIDE.md](USER_GUIDE.md) | How to create and use image maps |
| **Developers** | [IMPLEMENTATION.md](IMPLEMENTATION.md) | Technical architecture |
| **Admins** | [ADMIN_GUIDE.md](ADMIN_GUIDE.md) | Server setup & config |
| **Backup/Restore** | [BACKUP_RESTORE.md](BACKUP_RESTORE.md) | Complete B/R documentation |
| **All Docs** | [docs/INDEX.md](docs/INDEX.md) | **Central documentation index** |

---

## 🔑 Key Capabilities

| Capability | Default Role | Purpose |
|-----------|--------------|---------|
| `mod/imagemap:addinstance` | Teacher | Create new activities |
| `mod/imagemap:edit` | Teacher | Edit areas and settings |
| `mod/imagemap:view` | Student | View the activity |

---

## 💾 Database

The module uses 4 tables:

- **`imagemap`** - Activity instances
- **`imagemap_area`** - Clickable areas (shapes)
- **`imagemap_line`** - Connection lines between areas
- **`imagemap_css_examples`** - CSS style examples

---

## 🎯 Supported Features

- ✅ Intro/description text
- ✅ Completion tracking
- ✅ Course backups
- ✅ Activity deletion with cascades
- ✅ Privacy/GDPR compliance
- ✅ Event logging
- ✅ File storage (images)

---

## 🐛 Known Issues

| Issue | Workaround |
|-------|-----------|
| Very large images (>5MB) load slowly | Compress images before upload |
| Polygon resize can be imprecise | Use rectangles/circles instead |
| AMD loading errors on some themes | Not plugin issue; update Moodle |

See [TESTING.md](TESTING.md) for more troubleshooting.

---

## 📊 Browser Support

| Browser | Status | Notes |
|---------|--------|-------|
| Chrome/Edge | ✅ | Recommended |
| Firefox | ✅ | Full support |
| Safari | ✅ | iOS 12+, macOS 12+ |
| IE 11 | ❌ | Not supported |

---

## 🏗️ Project Structure

```
mod_imagemap/
├── backup/moodle2/          # Backup and restore implementation
├── classes/
│   ├── event/              # Activity logging
│   ├── form/               # Form classes
│   └── privacy/            # GDPR compliance
├── db/
│   ├── install.xml         # Schema
│   ├── upgrade.php         # Migrations
│   └── access.php          # Capabilities
├── lang/
│   ├── en/                 # English strings
│   └── pt_br/              # Portuguese (Brazil)
├── docs/                   # 📚 All documentation
├── amd/                    # JavaScript modules
├── templates/              # Mustache templates
└── [main PHP files]
```

---

## ✉️ Support & Issues

For help:

1. 📖 Check [docs/INDEX.md](docs/INDEX.md) - Complete documentation index
2. 🐛 Report bugs with reproduction steps
3. 💬 Ask questions in GitHub issues
4. 📧 Contact maintainer for urgent issues

---

## 📝 License

Released under [GNU General Public License v3](LICENSE)

**You are free to:**
- Use commercially
- Modify the code
- Distribute copies

**You must:**
- Include license
- Document changes

---

## 👨‍💻 Credits

**Maintainer**: Kelson C. M.  
**Based on**: Moodle Plugin Architecture 4.x  
**Contributors**: See CHANGELOG.md

---

---

## 🤝 Contributing

We welcome contributions! Whether you want to:
- 🐛 Report bugs
- ✨ Suggest features
- 🔧 Submit code improvements
- 📖 Improve documentation

See [**CONTRIBUTING.md**](CONTRIBUTING.md) for:
- How to set up your development environment
- Code standards and pre-commit hooks using `moodle-plugin-ci`
- Testing requirements
- Pull request process

**Quick Start**: 
```bash
composer install
bash setup-hooks.sh
```

**Note**: As of March 2026, pre-commit hooks use the official `moodle-plugin-ci` tool. See [MIGRATION_HOOKS_v2.md](MIGRATION_HOOKS_v2.md) for details.

---

## 📄 Changelog

### 1.2.0 (2026-03-02)
- ✨ **Backup/Restore system fully implemented**
- 📚 Complete documentation added to `/docs/`
- 🔧 Database schema improvements
- 🐛 Bug fixes and optimizations

### 1.0.0 (2026-01-29)
- 🎉 Initial release with core features

Check [CHANGELOG.md](CHANGELOG.md) for full version history.

---

## 🔗 Related Files

- [QUICK_START.md](QUICK_START.md) - Fast startup guide
- [BACKUP_RESTORE.md](BACKUP_RESTORE.md) - Backup/restore details
- [TESTING.md](TESTING.md) - Test procedures and checklist
- [CHANGELOG.md](CHANGELOG.md) - Version history

---

**Last Updated**: March 2, 2026  
**Status**: Active Development  
**Support**: Community Driven
