import { startTursoServer } from "./turso-dev-server.mjs";

const server = await startTursoServer("evame.db", 8081);
console.log(`Local Turso database: ${server.url}`);
process.once("SIGINT", server.stop);
process.once("SIGTERM", server.stop);
