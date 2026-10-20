# Niwa Privacy Policy

[中文版](PRIVACY.md)

Last updated: October 2026

Niwa is a browser extension that replaces the new tab page. It has no server, no account system, no analytics, and no advertising. The developer does not receive any of your data.

## Data stored on your device

Your shortcuts, widgets, notes, settings, and imported calendar files are stored only in your browser (localStorage, and IndexedDB for imported calendar files). They are not synced or uploaded anywhere and are deleted when you uninstall the extension.

A backup file is created only when you export one, and is saved where you choose. Calendar subscription URLs, imported calendar files, your weather API key, and the sites excluded from search suggestions are treated as secrets and are left out of backups unless you choose to include them.

## Data read locally

- **Bookmarks, browsing history, top sites, and recently closed tabs**: read only after you grant the optional permission, to show them in the Bookmarks and History widgets and to suggest matches in the search box. They never leave your device.
- **Clipboard**: when you paste text on the new tab page (outside a text field), that text is saved as a note. Niwa does not read the clipboard otherwise. Clicking a note copies it back to the clipboard.
- **Active tab URL**: when a countdown timer ends, Niwa checks the URL of the active tab only to decide whether you are already looking at the new tab page. It is not stored or sent.

## Data sent to third parties

Opening a new tab makes no network requests. Niwa sends requests directly from your browser to the following services, and only after you set up the related feature:

| Feature                                           | Service                                                                         | What is sent                                                                                            |
| ------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Calendar                                          | The calendar subscription URL you add (for example Google Calendar)             | The subscription URL, which works like a password                                                       |
| Weather                                           | QWeather, through your own API host and key                                     | Your API key, the city name you search for, and the ID of the city you select                           |
| Trending lists                                    | Zhihu, Weibo, Bilibili, Baidu, Toutiao, Juejin                                  | Standard requests. Requests to Weibo include your existing Weibo cookies so that its list can be loaded |
| RSS feeds                                         | The feed URLs you add                                                           | Standard requests                                                                                       |
| Shortcut icons (when you click "fetch site icon") | The website you add; if it has no usable icon, icon.horse, Google, and favicone | The website's address (to the services: its domain)                                                     |
| Search                                            | The search engine you choose                                                    | Your search terms (a normal web search you submit)                                                      |
| Adding a search engine by its address             | The website you enter, to read the search method its home page declares         | Standard requests                                                                                       |

Imported calendar (.ics) files are read from your computer and are never uploaded. These services have their own privacy policies.

## Permissions

- **favicon, alarms, scripting** (granted at install, no warning): to show icons from the browser's local favicon cache, to remind you when a countdown ends, and to show that reminder as a small card on the page you are viewing. The reminder card only adds its own element; it does not read or change the page.
- **Access to websites, bookmarks, history, top sites, sessions, tabs, and notifications** (optional): requested only when you use the related feature. You can revoke them at any time in the browser's extension settings.

## How data is used

Niwa does not sell or transfer your data, does not use it for anything other than the features described above, and does not use it to determine creditworthiness or for lending.

## Contact

Please open an issue at <https://github.com/LZWcc/Niwa/issues>.
