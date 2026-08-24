import { defineConfig } from 'vite';

// Vite dev-server config. This file exists ONLY for local development -- the app
// itself is a static site with no build step (see README "Hosting & Release Flow"),
// so nothing here affects staging or production. Vite never builds this project.
export default defineConfig({
  server: {
    // --- Real-device (phone) testing over Tailscale --------------------------
    //
    // BOTH SETTINGS BELOW ARE REQUIRED. They fix two different things, and removing
    // either one breaks phone testing in a way that looks confusingly like the other:
    //
    //   * `allowedHosts` satisfies the HOST-HEADER check. Without it the phone gets
    //     Vite's "Blocked request. This host (...) is not allowed." page.
    //   * `host` decides which ADDRESS is bound. Without it nothing is listening on
    //     IPv4 loopback and `tailscale serve` returns a bare HTTP 502.
    //
    // So the failure mode tells you which half is wrong: a 502 means the BIND is
    // wrong; a "Blocked request" page means the HOST LIST is. Fixing only one of the
    // two leaves it just as broken, with a different error.
    //
    // WHY ANY OF THIS EXISTS. Chrome only grants secure-context on https://, localhost
    // and 127.0.0.1. Over plain http:// navigator.serviceWorker does not exist at all
    // -- so the service worker never registers and the entire PWA layer (update
    // prompt, offline, install-to-home-screen) is untestable on a real phone. Running
    // `tailscale serve --bg 5173` puts a real HTTPS origin with a valid cert in front
    // of this dev server, which gets that secure context back.

    // HALF 1 -- the host-header check. Vite's DNS-rebinding guard rejects any Host it
    // was not told about, and there is no CLI flag for it: it is config-only.
    //
    // THE HOSTNAME IS TAILNET-ONLY. rog-ally.tail03c626.ts.net resolves only inside
    // this private tailnet (MagicDNS); it is not a public domain and does not resolve
    // on the open internet. Do not delete it as mystery config, and do NOT copy this
    // pattern for a public hostname.
    //
    // Keep this an EXPLICIT list. Never set `allowedHosts: true` (or add a wildcard):
    // that disables the DNS-rebinding protection entirely rather than naming what is
    // trusted.
    allowedHosts: ['rog-ally.tail03c626.ts.net'],

    // HALF 2 -- the bind address, named EXPLICITLY rather than left to the default.
    //
    // Vite's default is the bare string 'localhost', which Node hands to DNS. On this
    // machine that resolves to the IPv6 loopback first, so the server listens on
    // [::1]:5173 and NOTHING is on 127.0.0.1:5173 (measured with
    // `netstat -ano | findstr 5173`). `tailscale serve` proxies to
    // http://127.0.0.1:5173, finds nothing there, and returns HTTP 502. Naming the
    // address removes the DNS step, so the bind is deterministic.
    //
    // Must stay a LOOPBACK address. Never '0.0.0.0' and never `true`: those bind the
    // local Wi-Fi too. Keeping the dev server reachable ONLY through the tailnet proxy
    // is the property worth preserving here.
    host: '127.0.0.1',
  },
});
