# Privacy Policy — RobCo U.O.S.

_Last updated: 2026-06-27_

This is a plain-English summary of what data the app stores, where, and why.

---

## What stays on your device

Your campaign save — character stats, inventory, quest log, faction reputation, campaign notes, and chat history — is stored in your browser's **localStorage** under the key `robco_v8`. It never leaves your device unless you choose to export it or enable cloud sync (see below).

Three rolling auto-backups are also kept in localStorage (`robco_backup_1/2/3`) so you can undo accidental loads. These are overwritten on a rotating basis and are never transmitted anywhere.

Settings (API key, selected model, audio preferences, color theme) are stored in localStorage on your device only.

---

## Optional cloud features (Google sign-in)

If you choose to sign in with Google, the app uses **Firebase Authentication** to create an account. Your sign-in is managed by Google — RobCo U.O.S. never sees your Google password.

Once signed in, you can optionally:

- **Push saves to the cloud.** Each save you upload is stored in a **Firestore database** document at `users/{your-uid}/saves/{save-id}`, readable only by you. You can delete any cloud save from inside the app.
- **Sync your Gemini API key across devices.** This feature is **off by default** and must be turned on manually. When enabled, your key is stored at `users/{your-uid}/secrets/geminiKey`, readable only by you. When disabled, your key stays on-device only. You can delete the stored key by turning the toggle off.

If you sign out, the app creates a new anonymous session automatically. Your local save is not affected.

---

## Gemini API calls

When you send a message, the app calls **Google's Gemini API** directly from your browser using your own API key. The request goes from your browser to Google's servers. RobCo U.O.S. does not proxy, log, or store these calls.

---

## What we do not collect

- No analytics
- No advertising
- No tracking pixels or third-party scripts
- No data sold or shared with anyone
- No server of our own — the app is a static site hosted on GitHub Pages

---

## Deleting your data

- **Local data:** Clear your browser's site data for this page, or use your browser's developer tools to delete localStorage.
- **Cloud saves:** Use the Cloud Saves panel inside the app to delete individual saves.
- **Gemini key:** Turn off the key-sync toggle to remove the stored key from Firestore.
- **Account:** Sign out of Google from inside the app. To delete your Firebase account entirely, contact the developer.

---

## Contact

This is an open-source personal project. You can review the full source code at [github.com/zerckzzyHD/Robco-UOS](https://github.com/zerckzzyHD/Robco-UOS). Questions or concerns can be raised as a GitHub issue.
