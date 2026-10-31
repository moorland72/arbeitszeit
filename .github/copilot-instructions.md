# Műszaknapló

Ez egy Vite, React és TypeScript alapú munkaidő-beosztás webapp. A felület magyarul, németül, bosnyákul és angolul is elérhető.

## Projektparancsok

- `npm run dev`: helyi fejlesztői szerver
- `npm run build`: TypeScript-ellenőrzés és production build
- `npm run lint`: Oxlint

## Viselkedés

- A műszakok a böngésző `localStorage` tárhelyére mentődnek.
- Az ICS-export minden mentett műszakot tartalmaz, de egyszeri fájlletöltés.
- Az opcionális Google Calendar API-kapcsolat a felhasználó által indított szinkronizálással a fő naptárba ír, és eseményszínként a legközelebbi Google-színt használja.
- Google OAuth tokent ne tárolj tartósan a böngészőben.
- A dátum és idő kezelése a felhasználó helyi időzónáját követi.

A dokumentáció magyar nyelvű maradjon; a felület minden támogatott nyelven legyen teljes. A fejlesztői szervert csak felhasználói jóváhagyás után indítsd el.
