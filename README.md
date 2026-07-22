# InboxZer0

Tinder-stijl e-mailtriage: swipe door je inbox (links=verwijderen, rechts=archiveren,
omhoog=uitstellen, omhoog-lang=doorsturen/beantwoorden met AI-hulp).

InboxZer0 bestaat uit twee delen die je **samen als één proces** draait:

- **Frontend**: een React Native app, geëxporteerd naar een statische web-bundel
  (`react-native-web`). Geen Expo Go, geen appstores, geen EAS nodig.
- **Backend** (`server/`): een klein Node.js/Express-proces dat de web-bundel serveert
  én de REST API levert voor alles wat een browser niet zelf kan: echte IMAP-verbindingen
  (ruwe TCP/TLS-sockets), versleutelde opslag van mailbox-inloggegevens, en het aanroepen
  van de AI-provider (Anthropic/OpenAI) zonder de API-key ooit naar de browser te sturen.

Er is geen Docker of database nodig — één `node`-proces, één versleuteld databestand op
schijf. Bedoeld om **alleen bereikbaar te zijn via je eigen VPN** (bijv. WireGuard/Tailscale
naar je Proxmox-netwerk), niet publiek op internet.

## Vereisten

- Ubuntu 22.04/24.04 LTS (VM of LXC in Proxmox — beide werken, een LXC is lichter)
- Node.js 20 of hoger
- Git

Node installeren op een verse Ubuntu-installatie:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git
node -v   # v20.x of hoger
```

## Installatie

```bash
git clone <url-van-deze-repo> inboxzer0
cd inboxzer0

# 1) Frontend-dependencies + web-bundel bouwen
npm install
npm run build:web            # produceert ./web-build

# 2) Backend-dependencies + compileren
cd server
npm install
npm run build                # produceert ./dist
cd ..
```

Na deze stappen staat de kant-en-klare web-app in `web-build/` en de gecompileerde
backend in `server/dist/`. Het backend-proces serveert `web-build/` automatisch mee
(zelfde origin, dus geen CORS-gedoe) zolang je het vanuit `server/` start.

## Configuratie (environment variables)

Alle instellingen zijn optioneel met zinnige defaults — voor een standaard installatie
hoef je niets te zetten. Beschikbaar via environment variables:

| Variabele                  | Default                        | Betekenis                                                                 |
|-----------------------------|---------------------------------|----------------------------------------------------------------------------|
| `PORT`                      | `4000`                          | Poort waarop de server luistert.                                          |
| `INBOXZER0_DATA_DIR`        | `<server-map>/data`             | Waar het versleutelde databestand (`app-data.enc`) en de sleutel (`master.key`) komen. |
| `INBOXZER0_WEB_BUILD_DIR`   | `../web-build` (t.o.v. `server/dist`) | Waar de gebouwde frontend vandaan wordt geserveerd.                 |
| `INBOXZER0_CORS_ORIGIN`     | (uit)                           | Alleen nodig tijdens lokale frontend-ontwikkeling op een andere poort; laat leeg in productie. |

Alle mailbox-inloggegevens, de AI API-key en je schrijfstijl worden **versleuteld**
(AES-256-GCM) opgeslagen in `app-data.enc`, met een lokaal gegenereerde sleutel
(`master.key`, alleen leesbaar door de eigenaar). Maak van deze twee bestanden een
backup als je verhuist naar een nieuwe VM — zonder `master.key` is `app-data.enc`
onleesbaar.

## Handmatig starten (test)

```bash
cd server
PORT=4000 node dist/index.js
```

Ga naar `http://<ip-van-je-vm>:4000` (alleen bereikbaar binnen je VPN/netwerk).

## Draaien als systemd-service (aanbevolen)

Zo blijft InboxZer0 draaien na een reboot en herstart hij automatisch bij een crash.

1. Maak een eigen systeemgebruiker aan (draai niet als root):

   ```bash
   sudo useradd --system --home /opt/inboxzer0 --shell /usr/sbin/nologin inboxzer0
   sudo mkdir -p /opt/inboxzer0
   sudo cp -r <clone-map>/. /opt/inboxzer0/
   sudo chown -R inboxzer0:inboxzer0 /opt/inboxzer0
   ```

2. Zet het service-bestand neer op `/etc/systemd/system/inboxzer0.service`:

   ```ini
   [Unit]
   Description=InboxZer0 (self-hosted e-mailtriage)
   After=network.target

   [Service]
   Type=simple
   User=inboxzer0
   Group=inboxzer0
   WorkingDirectory=/opt/inboxzer0/server
   Environment=PORT=4000
   Environment=INBOXZER0_DATA_DIR=/opt/inboxzer0/server/data
   ExecStart=/usr/bin/node /opt/inboxzer0/server/dist/index.js
   Restart=on-failure
   RestartSec=5

   # Lichte sandboxing — het proces heeft alleen schrijftoegang tot zijn eigen data-map nodig.
   NoNewPrivileges=true
   ProtectSystem=strict
   ReadWritePaths=/opt/inboxzer0/server/data
   PrivateTmp=true

   [Install]
   WantedBy=multi-user.target
   ```

3. Activeren en starten:

   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable --now inboxzer0
   sudo systemctl status inboxzer0
   ```

4. Logs bekijken: `sudo journalctl -u inboxzer0 -f`

### Updaten naar een nieuwe versie

```bash
cd <clone-map>
git pull
npm install && npm run build:web
cd server && npm install && npm run build
sudo rsync -a --exclude=data --delete <clone-map>/ /opt/inboxzer0/
sudo systemctl restart inboxzer0
```

(`--exclude=data` zorgt dat je versleutelde mailbox-gegevens niet worden overschreven.)

## Toegang: alleen via je eigen VPN

Deze app doet geen eigen authenticatie — wie de poort kan bereiken, kan bij je
mailboxen en AI-instellingen. Zorg dat poort `4000` (of wat je in `PORT` zet):

- **niet** doorgezet wordt op je router/firewall naar het publieke internet;
- alleen bereikbaar is via je VPN (bijv. WireGuard of Tailscale) naar het
  Proxmox-netwerk waarin de VM/LXC staat.

Een simpele extra stap is de firewall op de VM zelf beperken tot je VPN-subnet, bijv.
met `ufw`:

```bash
sudo ufw allow from 10.0.0.0/24 to any port 4000 proto tcp   # vervang door je eigen VPN-subnet
sudo ufw enable
```

## Ontwikkelen (niet nodig voor gewoon gebruik)

```bash
# backend met live-reload
cd server && npm run dev

# frontend in de browser tijdens ontwikkeling (andere poort dan de backend)
npm start
# zet dan INBOXZER0_CORS_ORIGIN op de backend naar de Expo-devserver-origin
```
