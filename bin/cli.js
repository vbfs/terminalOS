#!/usr/bin/env node
"use strict";

const W = "\x1b[97m"; // bright white
const GR = "\x1b[90m"; // dark gray
const B = "\x1b[1m"; // bold
const D = "\x1b[2m"; // dim
const R = "\x1b[0m"; // reset

let version = "";
try {
  version = require("../package.json").version;
} catch {}

const args = process.argv.slice(2);
const hasRun = args.includes("--start") || args.includes("--run");

if (!hasRun) {
  const T = W + B;
  const O = GR + B;

  const logo = [
    `${T}████████╗███████╗██████╗ ███╗   ███╗██╗███╗   ██╗ █████╗ ██╗      ${O} ██████╗ ███████╗${R}`,
    `${T}   ██╔══╝██╔════╝██╔══██╗████╗ ████║██║████╗  ██║██╔══██╗██║      ${O}██╔═══██╗██╔════╝${R}`,
    `${T}   ██║   █████╗  ██████╔╝██╔████╔██║██║██╔██╗ ██║███████║██║      ${O}██║   ██║███████╗${R}`,
    `${T}   ██║   ██╔══╝  ██╔══██╗██║╚██╔╝██║██║██║╚██╗██║██╔══██║██║      ${O}██║   ██║╚════██║${R}`,
    `${T}   ██║   ███████╗██║  ██║██║ ╚═╝ ██║██║██║ ╚████║██║  ██║███████╗${O}╚██████╔╝███████║${R}`,
    `${T}   ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝╚══════╝${O} ╚═════╝ ╚══════╝${R}`,
  ];

  const pad = "  ";
  console.log("");
  logo.forEach((line) => console.log(pad + line));
  console.log("");
  console.log(
    `${pad}${D}The browser-based terminal workspace built for AI-assisted development.${R}  ${D}v${version}${R}`,
  );

  console.log(`${pad}${W}${B}https://terminalos.dev${R}`);
  console.log("");
  console.log(`${pad}${B}Features${R}`);
  console.log(
    `${pad}  ${W}›${R} AI-native terminal with context-aware sessions`,
  );
  console.log(`${pad}  ${W}›${R} Built-in token tracking for AI model usage`);
  console.log(`${pad}  ${W}›${R} File browser, markdown viewer & PDF reader`);
  console.log(
    `${pad}  ${W}›${R} Full shell access — runs directly in your browser`,
  );
  console.log(
    `${pad}  ${W}›${R} No install required · ${W}Just run: npx terminalos --start${R}`,
  );
  console.log("");
  console.log(`${pad}${B}Usage${R}`);
  console.log(
    `${pad}  ${D}$${R} npx terminalos ${W}--start${R}              ${D}start on port 7513${R}`,
  );
  console.log(
    `${pad}  ${D}$${R} npx terminalos ${W}--start --port N${R}     ${D}use a custom port${R}`,
  );
  console.log("");
  process.exit(0);
}

const portFlag = args.indexOf("--port");
const port = portFlag !== -1 ? parseInt(args[portFlag + 1], 10) : 7513;

if (isNaN(port) || port < 1 || port > 65535) {
  console.error("  Invalid port number. Use --port <1-65535>");
  process.exit(1);
}

// Fix spawn-helper permissions at runtime (handles stale npx cache / arch mismatch)
try { require('../scripts/fix-permissions'); } catch (_) {}

// The runtime server is compiled to runtime-dist/server.js
const { startServer } = require("../runtime-dist/server");
startServer(port);
