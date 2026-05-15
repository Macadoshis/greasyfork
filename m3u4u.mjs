// ==UserScript==
// @name            m3u4u playlists synchronizer
// @name:fr         m3u4u synchronizeur de playlists
// @namespace       https://m3u4u.com/
// @version         2026-05-16
// @description     m3u4u.com playlists synchronizer
// @description:fr  m3u4u.com synchronizeur de playlists 
// @license         MIT
// @author          https://github.com/Macadoshis
// @match           https://m3u4u.com/playlists
// @icon            https://www.google.com/s2/favicons?sz=64&domain=m3u4u.com
// @grant           none
// @downloadURL     https://raw.githubusercontent.com/Macadoshis/greasyfork/refs/heads/main/m3u4u.mjs
// @updateURL       https://raw.githubusercontent.com/Macadoshis/greasyfork/refs/heads/main/m3u4u.mjs
// ==/UserScript==
/* jshint esversion: 11 */
(async function () {
    "use strict";
    
    // Check last-sync timestamp
    const now = new Date();
    const currentSync = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}`;
    let lastSync;
    try {
        lastSync = sessionStorage.getItem('last-sync');
    } catch (e) {
        lastSync = null;
    }
    
    if (lastSync === currentSync) {
        console.log(`Already synced at ${currentSync}. Exiting.`);
        return;
    }
    
    try {
        sessionStorage.setItem('last-sync', currentSync);
    } catch (e) {
        console.log('Warning: Could not write last-sync key to sessionStorage');
    }
    
    const bearer = localStorage.getItem('accessToken');
    const DELAY_MS = 5000;
    const BASE = "https://m3u4u.com/api";

    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const m3u4uCookie = () => decodeURIComponent(document.cookie.match(/(?:^|; )M3U4U-XYZ=([^;]*)/)?.[1]);

    await sleep(1000);

    const headers = {
        "Accept": "application/json, text/plain, */*",
        "Authorization": `Bearer ${bearer}`,
        "Content-Type": "application/json",
        "x-m3u4u-xyz": m3u4uCookie()
    };
    console.log(`Reading cookie=${m3u4uCookie()}`);

    // 1. Fetch playlist ids
    const listResp = await fetch(`${BASE}/playlists/list`, {
        method: "POST", headers,
        body: JSON.stringify({page: 1, pageSize: 100}),
        referrer: "https://www.m3u4u.com/playlists",
        credentials: "include",
    });
    const listBody = await listResp.json();
    console.log(`Playlists status: ${listResp.status}`);
    const ids = listBody.items.map(p => p.id).filter(Number.isFinite);
    console.log(`Playlists: ${ids}`);

    // 2. For each playlist id : sync + sleep + dropbox
    for (const id of ids) {
        console.log(`\nProcessing ${id}...`);

        const syncResp = await fetch(`${BASE}/playlists/bulk-sync`, {
            method: "POST", headers,
            body: JSON.stringify({playlistIds: [id], forceRefreshSources: false})
        });
        console.log(`  bulk-sync => ${syncResp.status}`);

        await sleep(DELAY_MS);

        const dropResp = await fetch(`${BASE}/playlists/push-to-dropbox`, {
            method: "POST", headers,
            body: JSON.stringify({playlistIds: [id]})
        });
        console.log(`  push-to-dropbox => ${dropResp.status}`);
    }

    console.log("\nDone.");
    alert('SYNC DONE');
})();
