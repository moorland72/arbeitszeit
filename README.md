# Műszaknapló

Havi munkaidő-beosztás, külön felhasználói fiókokkal. A műszakok és a műszaktípusok a szerveren, felhasználónként elkülönített SQLite-adatbázisba kerülnek. Nyilvános regisztráció nincs; fiókot csak az LXC rendszergazdája hozhat létre.

## Követelmények

- Node.js 22.13 vagy újabb (a beépített `node:sqlite` modul miatt)
- npm

## Fejlesztői indítás

```sh
npm ci
npm run user:add -- felhasznalonev
npm run dev
```

Az `user:add` parancs interaktívan, a terminálba gépelés közben nem megjelenítve kéri be a legalább 12 karakteres jelszót. Minden további fiókot ugyanígy lehet létrehozni. Az alkalmazás fejlesztői módban a `http://localhost:5173` címen érhető el.

## Tartós indítás az LXC-n

Az LXC-n, a projekt gyökerében:

```sh
node -v
npm ci
```

Ha a Google Naptárat is használod, a projekt gyökerében hozd létre a `.env.local` fájlt a Google OAuth Client ID-val:

```env
VITE_GOOGLE_CLIENT_ID=IDE_A_CLIENT_ID
```

Ezután készítsd el a production buildet, és hozd létre az első fiókot:

```sh
npm run build
npm run user:add -- felhasznalonev
```

A felhasználónevek 3–32 karakteresek lehetnek (kisbetű, szám, pont, aláhúzás vagy kötőjel). A jelszót a parancs rejtetten kéri be. Az elsőként létrehozott fiók kapja meg az adatbázisban korábban elmentett, még fiókhoz nem rendelt műszakokat. A régi böngészős mentések importja is csak az első fióknál lehetséges.

Próbaindítás:

```sh
npm start
```

Alapértelmezés szerint az alkalmazás az LXC összes hálózati interfészén a `4173`-as porton figyel. A helyi hálózaton nyisd meg a `http://LXC-IP-CÍME:4173` címet. A portot csak a megbízható helyi hálózatról engedélyezd; ne irányítsd ki közvetlenül az internetre.

Az indítási beállítások környezeti változókkal módosíthatók:

- `APP_HOST` – figyelő cím, alapértelmezés: `0.0.0.0`
- `APP_PORT` – port, alapértelmezés: `4173`
- `DATA_DIR` – SQLite-adatbázis könyvtára, alapértelmezés: `data`
- `COOKIE_SECURE=true` – csak HTTPS-es, TLS-t végző proxy mögött kapcsold be; sima helyi HTTP-n a bejelentkezési cookie nem működne

### Automatikus indulás systemd-vel

Hozz létre egy külön rendszerfelhasználót, és add neki az adatkönyvtár tulajdonjogát:

```sh
sudo useradd --system --home /opt/arbeitszeit --shell /usr/sbin/nologin arbeitszeit
sudo chown -R arbeitszeit:arbeitszeit /opt/arbeitszeit/data
```

Az alkalmazásfájlok legyenek olvashatók az `arbeitszeit` felhasználónak. Készítsd el a `/etc/systemd/system/muszaknaplo.service` fájlt:

```ini
[Unit]
Description=Muszaknaplo web application
After=network.target

[Service]
Type=simple
User=arbeitszeit
Group=arbeitszeit
WorkingDirectory=/opt/arbeitszeit
Environment=APP_HOST=0.0.0.0
Environment=APP_PORT=4173
Environment=COOKIE_SECURE=false
ExecStart=/usr/bin/node /opt/arbeitszeit/server.mjs start
Restart=on-failure
RestartSec=5
UMask=0077
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/arbeitszeit/data

[Install]
WantedBy=multi-user.target
```

Majd engedélyezd és indítsd el:

```sh
sudo systemctl daemon-reload
sudo systemctl enable --now muszaknaplo
sudo systemctl status muszaknaplo
```

Frissítéskor töltsd fel az új projektfájlokat, futtasd újra az `npm ci` és `npm run build` parancsokat, majd indítsd újra a szolgáltatást:

```sh
sudo systemctl restart muszaknaplo
```

Az adatbázis a `data/muszaknaplo.sqlite` fájlban van; ezt frissítéskor ne töröld, és készíts róla rendszeres biztonsági másolatot. Fiók vagy jelszó módosításához jelenleg nincs webes adminfelület.

## Google Naptár

1. A Google Cloud Console-ban engedélyezd a Google Calendar API-t, majd állítsd be az OAuth-hozzájárulási képernyőt.
2. Készíts **Web application** típusú OAuth Client ID-t. Az engedélyezett JavaScript-forrásokhoz add hozzá a webapp pontos eredetét, például `http://192.168.1.177:4173` (a saját LXC-címeddel).
3. Állítsd be a Client ID-t a `.env.local` fájlban, majd futtasd újra a `npm run build` parancsot.
4. A Google-fiók tesztelési módban legyen hozzáadva tesztfelhasználóként. Az appban a Google Naptárhoz minden saját felhasználónak külön kell csatlakoznia.

A Client ID beépül a böngészőben futó alkalmazásba, ezért nem titkos adat; Client Secretet ne tegyél a frontendbe vagy a `.env.local` Vite-változói közé. Az OAuth hozzáférési token csak az aktuális böngésző-munkamenetben van memóriában.

## Adatok és adatvédelem

A szerver HttpOnly, SameSite munkamenet-cookie-t használ, a jelszavakat sózott scrypt hash formájában tárolja, és a bejelentkezést korlátozza az ismételt hibás próbálkozások ellen. Minden fiók saját műszakokat és műszaktípusokat lát. A böngészős helyi mentés fiókonként külön kulcsot használ, és nem helyettesíti a szerveres adatbázis biztonsági mentését.

Az LXC helyi hálózati használata nem egyenértékű az internetre biztonságos publikálással. Külső elérés előtt állíts be HTTPS-t, tűzfalat és biztonságos reverse proxyt; ilyenkor állítsd `COOKIE_SECURE=true` értékre, és a Google OAuth-beállításban is a HTTPS-es címet engedélyezd.

## Használat

- A Beállítások menüben a Magyar, Deutsch, Bosanski és English nyelvek között válthatsz.
- Az „ICS letöltése” az összes felvitt műszakból naptárfájlt készít.
- A „PDF mentése” a böngésző nyomtatási párbeszédablakát nyitja meg; válaszd a „Mentés PDF-ként” lehetőséget.
