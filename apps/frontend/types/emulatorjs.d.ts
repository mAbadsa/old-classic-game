// EmulatorJS boots itself off global `EJS_*` variables read by loader.js at
// script-execution time — there's no importable module/constructor to call
// instead. See https://emulatorjs.org/docs/options.
//
// `EJS_emulator.gameManager` is NOT part of that documented config API —
// emulatorjs.org's own docs say explicitly that internal APIs like this "are
// not guaranteed to function the same between EmulatorJS versions." The
// shape below was confirmed against EmulatorJS's data/src/GameManager.js
// source, not its docs, and only covers the methods this app actually uses.
export {};

declare global {
  interface Window {
    EJS_player?: string;
    EJS_core?: string;
    EJS_gameUrl?: string;
    EJS_pathtodata?: string;
    EJS_biosUrl?: string;
    EJS_gameName?: string;
    /** Stable per-game identifier EmulatorJS scopes its own localStorage settings by (control remaps, volume, etc) — without it those settings bleed across games. */
    EJS_gameID?: string;
    EJS_color?: string;
    EJS_startOnLoaded?: boolean;
    EJS_threads?: boolean;
    /**
     * Show/hide EmulatorJS's own built-in control bar buttons (play/pause,
     * fullscreen, save/load state, gamepad config, etc). Booleans only here —
     * EmulatorJS 4.2.2+ also accepts a per-button config object, but this app
     * only ever needs to hide buttons it replaces with custom UI.
     * See https://emulatorjs.org/docs/options (EJS_Buttons).
     */
    EJS_Buttons?: Record<string, boolean>;
    EJS_ready?: () => void;
    EJS_onGameStart?: () => void;
    EJS_emulator?: {
      gameManager?: {
        toggleMainLoop: (playing: boolean) => void;
        getState: () => Uint8Array;
        loadState: (state: Uint8Array) => void;
        /** Polls a virtual filesystem file until it exists, then reads it — genuinely async, not just Promise-wrapped. Resolves raw PNG bytes. */
        screenshot: () => Promise<Uint8Array>;
      };
    };
  }
}
