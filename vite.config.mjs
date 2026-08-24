import { defineConfig } from 'vite';

// Vite dev-server config. This file exists ONLY for local development -- the app
// itself is a static site with no build step (see README "Hosting & Release Flow"),
// so nothing here affects staging or production. Vite never builds this project.
export default defineConfig({
  server: {
    // Real-device (phone) testing over Tailscale.
    //
    // WHY THIS ENTRY EXISTS. Chrome only grants secure-context on https://,
    // localhost and 127.0.0.1. Over plain http:// to a LAN IP, navigator.serviceWorker
    // does not exist at all -- so the service worker never registers and the entire
    // PWA layer (update prompt, offline, install-to-home-screen) is untestable on a
    // real phone. Running `tailscale serve --bg 5173` puts a real HTTPS origin with a
    // valid cert in front of this dev server, which gets that secure context back.
    //
    // Vite's DNS-rebinding host check rejects any Host header it was not told about,
    // so without this entry the phone just gets "Blocked request. This host is not
    // allowed." Note there is no CLI flag for it -- it is config-only.
    //
    // THE HOSTNAME IS TAILNET-ONLY. rog-ally.tail03c626.ts.net resolves only inside
    // this private tailnet (MagicDNS); it is not a public domain and does not resolve
    // on the open internet. Do not delete it as mystery config, and do NOT copy this
    // pattern for a public hostname.
    //
    // Requires `tailscale serve` to be running -- without it the tailnet origin has
    // nothing behind it and this entry does nothing on its own.
    //
    // Keep this an EXPLICIT list. Never set `allowedHosts: true` (or add a wildcard):
    // that disables the DNS-rebinding protection entirely rather than naming what is
    // trusted.
    allowedHosts: ['rog-ally.tail03c626.ts.net'],

    // The bind address is deliberately left at Vite's default (127.0.0.1). Because
    // `tailscale serve` proxies from loopback, the default bind is all that is needed
    // AND is the safer option -- the dev server stays reachable only through the
    // tailnet proxy, never from the local Wi-Fi. Do not add `host` here.
  },
});
