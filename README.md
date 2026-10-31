# Műszaknapló

Egyszerű havi munkaidő-beosztás webapp. A műszakok a használt böngésző helyi tárhelyén maradnak; az ICS-export egy naptárfájlt készít az összes felvitt műszakból.

## Indítás

Node.js 22.13+ szükséges (a beépített `node:sqlite` modullal).

```sh
npm install
npm run dev
```

A production build ellenőrzése:

```sh
npm run build
```

## Adattárolás

A műszaktípusok és naptárbejegyzések SQLite-adatbázisba kerülnek a `data/muszaknaplo.sqlite` fájlba. A Vite fejlesztői és preview szervere szolgálja ki az adatbázis API-t. Az első indításkor a korábbi böngészős mentések automatikusan átkerülnek az adatbázisba. A nyelvi beállítás továbbra is a böngészőben tárolódik.

## Google Naptár API

1. A Google Cloud Console-ban hozz létre projektet, kapcsold be a Google Calendar API-t, majd állítsd be az OAuth-hozzájárulási képernyőt.
2. Készíts Web application típusú OAuth Client ID-t. Az engedélyezett JavaScript-forrásokhoz add hozzá a fejlesztői címet, például `http://127.0.0.1:5173`.
3. Másold a `.env.example` fájlt `.env.local` néven, és állítsd be benne a `VITE_GOOGLE_CLIENT_ID` értékét.
4. Indítsd újra a Vite fejlesztői szervert, majd kattints a „Google összekapcsolása” gombra és engedélyezd a hozzáférést.
5. A „Szinkronizálás” a műszakokat a Google-fiók elsődleges naptárába írja. A műszakszínt a Google legközelebbi támogatott eseményszínére képezi le.

Az OAuth hozzáférési token csak az aktuális böngésző-munkamenetben van memóriában; új munkamenetben ismét csatlakozni kell. A Google Naptár módosításai a „Szinkronizálás” gombbal kerülnek át. Az `.ics` letöltés továbbra is egyszeri export.

## Használat

- A Beállítások menüben a Magyar, Deutsch, Bosanski és English nyelvek között válthatsz; a választás frissítés után is megmarad.
- A „PDF mentése” gomb a havi naptárt, a havi összesítést és a munkanaplistát nyomtatásra rendezi; a böngésző párbeszédablakában válaszd a „Mentés PDF-ként” lehetőséget.

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
