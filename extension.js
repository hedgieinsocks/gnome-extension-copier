'use strict';


const {GLib, St, Gio} = imports.gi;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();


const ICON = 'edit-copy-symbolic';


const ScrollableMenu = class ScrollableMenu extends PopupMenu.PopupMenuSection {
    constructor() {
        super();
        let scrollView = new St.ScrollView();
        this.innerMenu = new PopupMenu.PopupMenuSection();
        scrollView.add_actor(this.innerMenu.actor);
        this.actor.add_actor(scrollView);
    }
};


class Extension {
    constructor() {
        this._indicator = null;
        this._indicatorId = null;
        this._clipboard = null;
        this._settings = null;
        this._menu = null;
        this._path = null;
    }


    _fillMenu(path) {
        this._menu.innerMenu.removeAll();

        let rootPath = this._settings.get_string('path');
        if (!rootPath) {
            return;
        }

        if (path) {
            if (path !== rootPath) {
                this._menu.innerMenu.addAction('..',
                    () => this._fillMenu(path.split('/').slice(0, -1).join('/')),
                    'go-up-symbolic');
            }
        } else {
            path = rootPath;
        }

        let items = this._getFiles(path);

        if (!items) {
            return;
        }

        items[0].forEach(dir => {
            this._menu.innerMenu.addAction(dir.get_name(),
                () => this._fillMenu(`${path}/${dir.get_name()}`),
                dir.get_icon());
        });

        items[1].forEach(file => {
            this._menu.innerMenu.addAction(file.get_name(),
                () => this._copyFile(`${path}/${file.get_name()}`),
                file.get_icon());
        });
    }


    _getFiles(path) {
        let directory = Gio.File.new_for_path(path);
        if (!directory.query_exists(null)) {
            return;
        }

        let enumerator = directory.enumerate_children('standard::name,standard::type,standard::content-type,standard::icon', Gio.FileQueryInfoFlags.NONE, null);
        let dirs = [];
        let files = [];

        while (true) {
            let fileInfo = enumerator.next_file(null);
            if (!fileInfo) {
                break;
            }

            let fileType = fileInfo.get_file_type();
            if (fileType === Gio.FileType.DIRECTORY) {
                dirs.push(fileInfo);
            } else if (fileType === Gio.FileType.REGULAR) {
                let fileMime = fileInfo.get_content_type();
                if (fileMime.startsWith('text/')) {
                    files.push(fileInfo);
                }
            }
        }

        enumerator.close(null);
        dirs.sort((a, b) => a.get_name().localeCompare(b.get_name()));
        files.sort((a, b) => a.get_name().localeCompare(b.get_name()));
        return [dirs, files];
    }


    _copyFile(file) {
        this._indicator.menu.toggle();
        let data = GLib.file_get_contents(file)[1];
        let decoder = new TextDecoder();
        let text = decoder.decode(data).trim();
        this._clipboard.set_text(St.ClipboardType.CLIPBOARD, text);
    }


    _addIndicator() {
        this._indicator = new PanelMenu.Button(0.0, Me.metadata.name, false);

        let icon = new St.Icon({
            gicon: new Gio.ThemedIcon({name: ICON}),
            style_class: 'popup-menu-icon',
        });
        this._indicator.add_child(icon);

        this._menu = new ScrollableMenu();
        this._indicator.menu.addMenuItem(this._menu);

        this._indicator.menu.addAction('Settings',
            () => ExtensionUtils.openPrefs(),
            'preferences-system-symbolic');

        Main.panel.addToStatusArea(Me.metadata.name, this._indicator);

        this._indicatorId = this._indicator.connect('button-press-event', () => {
            this._fillMenu(null);
        });
    }


    enable() {
        this._addIndicator();
        this._clipboard = St.Clipboard.get_default();
        this._settings = ExtensionUtils.getSettings();
    }


    disable() {
        this._indicator.disconnect(this._indicatorId);
        this._indicator.destroy();
        this._indicator = null;
        this._indicatorId = null;
        this._menu = null;
        this._settings = null;
    }
}


function init() {
    return new Extension();
}
