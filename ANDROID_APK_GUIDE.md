# 📱 Návod: Sestavení a získání Android APK pro Kratom Tracker

Pro aplikaci je nastaven automatický **GitHub Actions workflow** (`.github/workflows/build-apk.yml`), který při každém `push` nebo ručním spuštění provede `npm run build` a vytvoří jak webový balíček (`dist`), tak přímo **Android APK balíček**.

---

## 🚀 Způsob 1: Stažení hotového APK přímo z GitHub Actions (Nejjednodušší)

Nemusíš na svém počítači instalovat Android Studio ani žádné nástroje:

1. Nahraj projekt do svého GitHub repozitáře (`git push origin main`).
2. Na GitHubu otevři záložku **Actions** (nahoře v menu repozitáře).
3. Vyber workflow **Build Web & Android APK** (můžeš ho spustit i ručně přes tlačítko **Run workflow**).
4. Po dokončení (označeno zelenou fajfkou) rozklikni daný běh.
5. Dole v sekci **Artifacts** najdeš ke stažení:
   - 📦 **`kratom-tracker-android-apk`** — obsahuje hotový `app-debug.apk`, který stačí poslat do telefonu a nainstalovat!
   - 🌐 **`web-dist`** — obsahuje zkompilované soubory webu (`dist/`) pro použití v dalších nástrojích.

---

## 🛠️ Způsob 2: Pomocí PWABuilder (Online, bez instalace)

Aplikace je plnohodnotná PWA (Progressive Web App):

1. Jdi na [PWABuilder.com](https://www.pwabuilder.com/).
2. Vlož URL adresu své nasazené aplikace (např. z Vercelu, Netlify nebo Cloud Run).
3. Klikni na **Package for Stores** -> **Android**.
4. PWABuilder ti vygeneruje APK i AAB balíček pro Google Play.

---

## 💻 Způsob 3: Lokální sestavení přes Capacitor a Android Studio

Pokud máš na počítači nainstalované Android Studio:

```bash
# 1. Sestavení webu
npm install
npm run build

# 2. Přidání Capacitoru a Android platformy
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap add android
npx cap sync android

# 3. Otevření projektu v Android Studiu
npx cap open android
```

V Android Studiu pak stačí zvolit v horním menu:
**Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**.

---

## 📦 Způsob 4: Offline nástroje typu Website 2 APK Builder

Pokud používáš nástroje jako *Website 2 APK Builder*, *Web2APK* nebo *Cordova*:
1. Stáhni si artefakt **`web-dist`** z GitHub Actions (nebo spusť lokálně `npm run build`).
2. Obsah složky `dist` zadej do nástroje jako zdrojovou složku webu.
3. Jako výchozí soubor nastav `index.html`.
