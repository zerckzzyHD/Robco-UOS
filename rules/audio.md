# Subsystem note — Audio

> **Load this when touching:** `js/ui/ui-audio.js` · the `AudioSettings` cache in `ui-core.js` ·
> the Audio Systems panel in `index.html` · any new sound.
>
> Universal rules live in `CLAUDE.md`. This note carries only what applies to this surface.

---

## Protocol 7 — Adding a New Audio Source

- [ ] Create function in `ui-audio.js` using existing `audioCtx` via `ensureAudioCtx()`
- [ ] First guard: `if (AudioSettings.masterMute) return;`
- [ ] Second guard: `if (AudioSettings.<key>) return;`
- [ ] Add key to `AudioSettings` init block in `ui-core.js`
- [ ] Add checkbox toggle in `index.html` inside the Audio Systems details panel
- [ ] Add localStorage key to `toggleAudio()` keyMap in `ui-audio.js`
- [ ] Add key to `toggleMasterMute()` un-mute restore logic in `ui-audio.js`
- [ ] Add new setting to the Settings table in `ARCHITECTURE.md`
- [ ] Bump `CACHE_NAME` → Protocol 1

---

## Audio prohibited patterns

| Never Do                                    | Why                                                |
| ------------------------------------------- | -------------------------------------------------- |
| `localStorage.getItem()` in audio hot paths | Read from the `AudioSettings` cache object instead |

---

## Related notes

- The `AudioSettings` cache model and every sound-trigger function: `library/CODE_MAP.md` § Audio
- A new audio toggle is also a device preference that must survive reload:
  **Protocol UI-6** — in `rules/ui-and-mobile.md`.
- Per-game audio flavor rides `GAME_DEFS[ctx].identity`: `rules/game-data.md` (Protocol 38).
