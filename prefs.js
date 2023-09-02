import Adw from "gi://Adw";
import Gio from "gi://Gio";
import Gtk from "gi://Gtk";
import { ExtensionPreferences } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";

export default class CopierPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        const page = new Adw.PreferencesPage();
        const group = new Adw.PreferencesGroup();
        page.add(group);

        const row = new Adw.ActionRow({
            title: "Enter Path",
            subtitle: "Directory with your notes",
        });
        group.add(row);

        const entry = new Gtk.Entry({
            placeholder_text: "/home/username/mynotes",
            text: settings.get_string("path"),
            valign: Gtk.Align.CENTER,
            hexpand: true,
        });

        row.add_suffix(entry);
        row.activatable_widget = entry;

        settings.bind("path", entry, "text", Gio.SettingsBindFlags.DEFAULT);

        window.add(page);
    }
}
