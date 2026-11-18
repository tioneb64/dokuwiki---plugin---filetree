/**
 * Filetree : panneau latéral rétractable avec l'arborescence des espaces de noms et des pages,
 * comme l'explorateur de fichiers d'Obsidian. Replié, il reste une bande sur le côté. Les dossiers se chargent au premier dépliage.
 */
jQuery(function () {
    'use strict';

    var conf = (window.JSINFO && JSINFO.filetree) || {};
    var lang = (window.LANG && LANG.plugins && LANG.plugins.filetree) || {};
    var width = conf.width || 17;
    var current = (window.JSINFO && JSINFO.id) || '';
    var KEY_OPEN = 'filetree.open';
    var KEY_DIRS = 'filetree.dirs';

    function store(key, value) {
        try {
            if (value === undefined) return window.localStorage.getItem(key);
            window.localStorage.setItem(key, value);
        } catch (e) { /* stockage indisponible : on s'en passe */ }
        return null;
    }

    var openDirs = {};
    try { (JSON.parse(store(KEY_DIRS)) || []).forEach(function (n) { openDirs[n] = true; }); } catch (e) { /* ignoré */ }
    function saveDirs() { store(KEY_DIRS, JSON.stringify(Object.keys(openDirs))); }

    function pretty(name) { return name.replace(/_/g, ' '); }

    // ---- structure du panneau ------------------------------------------------------------------
    var RAIL = 2.4;   // largeur (em) de la bande repliée
    var $panel = jQuery('<aside id="plugin_filetree" aria-label="' + (lang.title || 'Explorateur') + '"></aside>');
    var $toggle = jQuery('<button type="button" class="ft-toggle"></button>');
    var $title = jQuery('<span class="ft-title"></span>').text(lang.title || 'Explorateur');
    var $collapse = jQuery('<button type="button" class="ft-btn ft-foldall"></button>')
        .attr('title', lang.collapse || 'Tout replier').text('⇧');
    var $head = jQuery('<div class="ft-head"></div>').append($toggle, $title, $collapse);
    var $label = jQuery('<div class="ft-vlabel"></div>').text(lang.title || 'Explorateur');
    var $tree = jQuery('<ul class="ft-tree ft-root"></ul>');
    $panel.append($head, $label, jQuery('<div class="ft-scroll"></div>').append($tree));
    jQuery('body').addClass('ft-on').append($panel);

    /** Déplie ou replie le panneau : replié, il reste une bande sur le côté */
    function setOpen(open, remember) {
        jQuery('body').toggleClass('ft-open', open);
        $panel.toggleClass('ft-expanded', open);
        $toggle.text(open ? '‹' : '›')
            .attr('title', open ? (lang.close || 'Replier le panneau') : (lang.open || 'Déplier l\'explorateur'));
        if (remember !== false) store(KEY_OPEN, open ? '1' : '0');
        if (open && !$tree.children().length) loadInto('', $tree, function () { restore(); });
    }
    jQuery('<style></style>')
        .text('#plugin_filetree{width:' + RAIL + 'em}' +
            '#plugin_filetree.ft-expanded{width:' + width + 'em}' +
            'body.ft-on #dokuwiki__site{margin-left:' + RAIL + 'em}' +
            'body.ft-open #dokuwiki__site{margin-left:' + width + 'em}' +
            // écran étroit : le panneau déplié recouvre le contenu au lieu de le décaler
            '@media (max-width:900px){body.ft-open #dokuwiki__site{margin-left:' + RAIL + 'em}}')
        .appendTo('head');

    // ---- chargement d'un dossier ----------------------------------------------------------------
    function load(ns, done) {
        jQuery.getJSON(DOKU_BASE + 'lib/exe/ajax.php', {call: 'plugin_filetree', ns: ns}).done(done);
    }

    function loadInto(ns, $ul, done) {
        load(ns, function (data) {
            $ul.empty();
            data.folders.forEach(function (f) { $ul.append(folderItem(f)); });
            data.pages.forEach(function (p) { $ul.append(pageItem(p)); });
            if (!data.folders.length && !data.pages.length) {
                $ul.append(jQuery('<li class="ft-empty"></li>').text(lang.empty || '(vide)'));
            }
            $ul.data('loaded', true);
            if (done) done();
        });
    }

    function pageItem(p) {
        var $a = jQuery('<a class="ft-page"></a>').attr('href', p.url)
            .attr('title', p.id).text(p.title || pretty(p.name));
        if (p.file) {
            $a.addClass('ft-file');
            var m = /[?&]media=([^&]+)/.exec(location.search);
            if (m && decodeURIComponent(m[1]) === p.id) $a.addClass('ft-current');
        } else if (p.id === current) $a.addClass('ft-current');
        return jQuery('<li class="ft-item"></li>').append($a);
    }

    function folderItem(f) {
        var $row = jQuery('<div class="ft-row"></div>');
        $row.append(jQuery('<span class="ft-caret" aria-hidden="true"></span>'));
        $row.append(jQuery('<span class="ft-name"></span>').text(pretty(f.name)));
        if (f.start) {
            $row.append(jQuery('<a class="ft-home"></a>').attr({href: f.start, title: lang.openns || ''}).text('↗'));
        }
        var $ul = jQuery('<ul class="ft-tree"></ul>').hide();
        var $li = jQuery('<li class="ft-item ft-folder"></li>').attr('data-ns', f.ns).append($row, $ul);
        $row.on('click', function (e) {
            if (jQuery(e.target).closest('.ft-home').length) return;
            toggle($li, !$li.hasClass('ft-expanded'));
        });
        return $li;
    }

    function toggle($li, open, done) {
        var ns = $li.attr('data-ns');
        var $ul = $li.children('ul');
        $li.toggleClass('ft-expanded', open);
        $ul.toggle(open);
        if (open) openDirs[ns] = true; else delete openDirs[ns];
        saveDirs();
        if (open && !$ul.data('loaded')) {
            loadInto(ns, $ul, done);
        } else if (done) {
            done();
        }
    }

    /** Rouvre les dossiers mémorisés et ceux qui mènent à la page courante */
    function restore() {
        var wanted = {};
        Object.keys(openDirs).forEach(function (n) { wanted[n] = true; });
        var parts = current.split(':');
        for (var i = 1; i < parts.length; i++) wanted[parts.slice(0, i).join(':')] = true;

        (function next() {
            // dossiers à ouvrir dont le parent est déjà chargé : on avance niveau par niveau
            var $todo = $panel.find('li.ft-folder').filter(function () {
                var $li = jQuery(this);
                return wanted[$li.attr('data-ns')] && !$li.hasClass('ft-expanded');
            }).first();
            if (!$todo.length) {
                var $cur = $panel.find('a.ft-current').first();
                if ($cur.length && $cur[0].scrollIntoView) $cur[0].scrollIntoView({block: 'nearest'});
                return;
            }
            toggle($todo, true, next);
        })();
    }

    // ---- événements ----------------------------------------------------------------------------
    $toggle.on('click', function () { setOpen(!$panel.hasClass('ft-expanded')); });
    $label.on('click', function () { setOpen(true); });
    $collapse.on('click', function () {
        openDirs = {};
        saveDirs();
        $panel.find('li.ft-folder').removeClass('ft-expanded').children('ul').hide();
    });

    var saved = store(KEY_OPEN);
    var wide = !window.matchMedia || window.matchMedia('(min-width: 901px)').matches;
    setOpen(saved === null ? (!!conf.open && wide) : (saved === '1'), false);
});
