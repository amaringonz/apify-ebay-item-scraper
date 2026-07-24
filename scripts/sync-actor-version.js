const fs = require('fs');
const path = require('path');

const version = process.argv[2];
if (!version) {
    console.error('Usage: node sync-actor-version.js <version>');
    process.exit(1);
}

const [major, minor] = version.split('.');
const actorPath = path.join(__dirname, '..', '.actor', 'actor.json');
const actor = JSON.parse(fs.readFileSync(actorPath, 'utf8'));

actor.version = `${major}.${minor}`;

fs.writeFileSync(actorPath, JSON.stringify(actor, null, 4) + '\n');
console.log(`Updated .actor/actor.json version to ${actor.version}`);
