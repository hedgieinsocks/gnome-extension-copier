import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";
import Gio from "gi://Gio";
import GLib from "gi://GLib";
import St from "gi://St";

const ICON = "edit-copy-symbolic";

const ScrollableMenu = class ScrollableMenu extends PopupMenu.PopupMenuSection {
    constructor() {
        super();
        const scrollView = new St.ScrollView();
        this.innerMenu = new PopupMenu.PopupMenuSection();
        scrollView.add_actor(this.innerMenu.actor);
        this.actor.add_actor(scrollView);
    }
};

export default class CopierExtension extends Extension {
    constructor(metadata) {
        super(metadata);
        this._indicator = null;
        this._menuId = null;
        this._clipboard = null;
        this._settings = null;
        this._menu = null;
        this._path = null;
    }

    _fillMenu(path) {
        this._menu.innerMenu.removeAll();

        const rootPath = this._settings.get_string("path");
        if (!rootPath) {
            return;
        }

        if (path) {
            if (path !== rootPath) {
                this._menu.innerMenu.addAction(
                    "..",
                    () => this._fillMenu(path.split("/").slice(0, -1).join("/")),
                    "go-up-symbolic"
                );
            }
        } else {
            path = rootPath;
        }

        const items = this._getFiles(path);

        if (!items) {
            return;
        }

        items[0].forEach((dir) => {
            this._menu.innerMenu.addAction(
                dir.get_name(),
                () => this._fillMenu(`${path}/${dir.get_name()}`),
                dir.get_icon()
            );
        });

        items[1].forEach((file) => {
            this._menu.innerMenu.addAction(
                file.get_name(),
                () => this._copyFile(`${path}/${file.get_name()}`),
                file.get_icon()
            );
        });
    }

    _getFiles(path) {
        const directory = Gio.File.new_for_path(path);
        if (!directory.query_exists(null)) {
            return;
        }

        const enumerator = directory.enumerate_children(
            "standard::name,standard::type,standard::content-type,standard::icon",
            Gio.FileQueryInfoFlags.NONE,
            null
        );
        const dirs = [];
        const files = [];

        while (true) {
            const fileInfo = enumerator.next_file(null);
            if (!fileInfo) {
                break;
            }

            const fileType = fileInfo.get_file_type();
            if (fileType === Gio.FileType.DIRECTORY) {
                dirs.push(fileInfo);
            } else if (fileType === Gio.FileType.REGULAR) {
                const fileMime = fileInfo.get_content_type();
                if (fileMime.startsWith("text/")) {
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
        const data = GLib.file_get_contents(file)[1];
        const decoder = new TextDecoder();
        const text = decoder.decode(data).trim();
        this._clipboard.set_text(St.ClipboardType.CLIPBOARD, text);
    }

    _addIndicator() {
        this._indicator = new PanelMenu.Button(0.0, this.metadata.name, false);

        const icon = new St.Icon({
            gicon: new Gio.ThemedIcon({ name: ICON }),
            style_class: "popup-menu-icon",
        });
        this._indicator.add_child(icon);

        this._menu = new ScrollableMenu();
        this._indicator.menu.addMenuItem(this._menu);
        this._indicator.menu.addAction("Settings", () => this.openPreferences(), "preferences-system-symbolic");

        Main.panel.addToStatusArea(this.metadata.name, this._indicator);

        this._menuId = this._indicator.menu.connect("open-state-changed", (open) => {
            if (open) {
                this._fillMenu(null);
            }
        });
    }

    enable() {
        this._addIndicator();
        this._clipboard = St.Clipboard.get_default();
        this._settings = this.getSettings();
    }

    disable() {
        this._indicator.menu.disconnect(this._menuId);
        this._indicator.destroy();
        this._indicator = null;
        this._menuId = null;
        this._menu = null;
        this._settings = null;
        this._clipboard = null;
    }
}
