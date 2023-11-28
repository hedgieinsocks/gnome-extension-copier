import { ExtensionPreferences } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";
import Adw from "gi://Adw";
import Gio from "gi://Gio";
import Gtk from "gi://Gtk";

export default class CopierPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        const page = new Adw.PreferencesPage();
        const group = new Adw.PreferencesGroup();
        page.add(group);

        // Entry
        const rowEntry = new Adw.ActionRow({
            title: "Enter Path",
            subtitle: "Directory with your notes",
        });
        group.add(rowEntry);

        const entryPath = new Gtk.Entry({
            placeholder_text: "/home/username/mynotes",
            text: settings.get_string("path"),
            valign: Gtk.Align.CENTER,
            hexpand: true,
        });

        settings.bind("path", entryPath, "text", Gio.SettingsBindFlags.DEFAULT);

        rowEntry.add_suffix(entryPath);
        rowEntry.activatable_widget = entryPath;

        // Strip
        const rowStrip = new Adw.ActionRow({
            title: "Strip",
            subtitle: "Hide file extensions",
        });
        group.add(rowStrip);

        const toggleStrip = new Gtk.Switch({
            active: settings.get_boolean("strip"),
            valign: Gtk.Align.CENTER,
        });

        settings.bind("strip", toggleStrip, "active", Gio.SettingsBindFlags.DEFAULT);

        rowStrip.add_suffix(toggleStrip);
        rowStrip.activatable_widget = toggleStrip;

        window.add(page);
    }
}
