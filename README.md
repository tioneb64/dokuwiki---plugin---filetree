# Filetree : explorateur de fichiers

Plugin DokuWiki (`filetree`).

**Panneau latéral rétractable**, comme l'explorateur d'Obsidian : arborescence des espaces de noms ; on déplie un dossier pour voir les pages qu'il contient. Le panneau se replie en une bande étroite (il ne se ferme jamais) et se rouvre d'un clic.

## Fonctions

- Contenu chargé à la demande (AJAX), lu sur le disque à chaque dépliage : pas de cache à rafraîchir.
- Respecte les droits de lecture.
- Liste aussi les fichiers `.md`, `.mmd` et `.mermaid` déposés dans les pages (ouverts par `mdfile` / `mmdfile`), repérés par une étiquette.

## Configuration

| Réglage | Défaut | Rôle |
| --- | --- | --- |
| `open` | 1 | panneau déplié au chargement |
| `width` | 17 | largeur du panneau (em) |

## Dépendances

Aucune. Les fichiers `.md` / `.mmd` demandent `mdfile` / `mmdfile`.

## Installation

Copier le contenu de ce dépôt dans `lib/plugins/filetree/` (le fichier `plugin.info.txt` doit se trouver à la racine de ce dossier), puis vider le cache en rendant la date de `conf/local.php` plus récente (`touch conf/local.php`).

Avec le gestionnaire d'extensions de DokuWiki : *Administration → Gestionnaire d'extensions → Installer*, en indiquant l'adresse du dépôt (archive ZIP).

## Licence

Aucune licence n'a encore été choisie : à ajouter (fichier `LICENSE`) avant de publier le dépôt. DokuWiki est sous GPL-2.0.
