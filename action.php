<?php

use dokuwiki\Extension\ActionPlugin;
use dokuwiki\Extension\Event;
use dokuwiki\Extension\EventHandler;

/**
 * Filetree : fournit au panneau latéral le contenu d'un espace de noms (sous-dossiers et pages)
 */
class action_plugin_filetree extends ActionPlugin
{
    /** @inheritdoc */
    public function register(EventHandler $controller)
    {
        $controller->register_hook('AJAX_CALL_UNKNOWN', 'BEFORE', $this, 'ajax');
        $controller->register_hook('DOKUWIKI_STARTED', 'AFTER', $this, 'jsinfo');
    }

    public function jsinfo(Event $event)
    {
        global $JSINFO;
        $JSINFO['filetree'] = [
            'open' => (bool)$this->getConf('open'),
            'width' => max(10, min(40, (int)$this->getConf('width'))),
        ];
    }

    /** ?call=plugin_filetree&ns=espace:sous */
    public function ajax(Event $event)
    {
        if ($event->data !== 'plugin_filetree') return;
        $event->preventDefault();
        $event->stopPropagation();

        global $INPUT, $conf;
        header('Content-Type: application/json; charset=utf-8');

        $ns = cleanID($INPUT->str('ns'));
        if ($ns !== '' && auth_quickaclcheck($ns . ':*') < AUTH_READ) {
            http_status(403);
            echo json_encode(['error' => 'denied']);
            return;
        }
        $dir = $conf['datadir'] . ($ns === '' ? '' : '/' . str_replace(':', '/', $ns));
        $prefix = $ns === '' ? '' : $ns . ':';

        $folders = [];
        $pages = [];
        $entries = is_dir($dir) ? scandir($dir) : [];
        foreach ($entries as $entry) {
            if ($entry[0] === '.') continue;
            $path = $dir . '/' . $entry;
            if (is_dir($path)) {
                if ($entry !== cleanID($entry)) continue;
                $sub = $prefix . $entry;
                if (auth_quickaclcheck($sub . ':*') < AUTH_READ) continue;
                $start = $sub . ':' . $conf['start'];
                $folders[] = [
                    'ns' => $sub,
                    'name' => $entry,
                    'start' => page_exists($start) && auth_quickaclcheck($start) >= AUTH_READ
                        ? wl($start, '', false, '&') : null,
                ];
            } elseif ($view = $this->viewer($entry)) {
                // fichier Markdown / Mermaid déposé dans l'espace de noms : ouvert par mdfile / mmdfile
                $id = $prefix . cleanID($entry);
                if (isHiddenPage($id) || auth_quickaclcheck($id) < AUTH_READ) continue;
                $pages[] = [
                    'id' => $id,
                    'name' => $entry,
                    'title' => null,
                    'file' => true,
                    'url' => wl('', ['do' => $view, 'media' => $id], false, '&'),
                ];
            } elseif (substr($entry, -4) === '.txt') {
                $name = substr($entry, 0, -4);
                $id = $prefix . $name;
                if ($name !== cleanID($name) || isHiddenPage($id) || auth_quickaclcheck($id) < AUTH_READ) continue;
                $title = p_get_first_heading($id, METADATA_DONT_RENDER);
                $pages[] = [
                    'id' => $id,
                    'name' => $name,
                    'title' => $title ?: null,
                    'url' => wl($id, '', false, '&'),
                ];
            }
        }
        usort($folders, fn($a, $b) => strnatcasecmp($a['name'], $b['name']));
        usort($pages, fn($a, $b) => strnatcasecmp($a['name'], $b['name']));

        echo json_encode(['ns' => $ns, 'folders' => $folders, 'pages' => $pages], JSON_UNESCAPED_UNICODE);
    }

    /** Action (mdfile, mmdfile) qui sait ouvrir ce fichier, selon son extension ; '' sinon */
    protected function viewer(string $entry): string
    {
        $ext = strtolower(pathinfo($entry, PATHINFO_EXTENSION));
        if ($ext === '') return '';
        foreach (['mdfile', 'mmdfile'] as $name) {
            $plugin = plugin_load('action', $name);
            if ($plugin && in_array($ext, $plugin->exts(), true)) return $plugin->act();
        }
        return '';
    }
}
