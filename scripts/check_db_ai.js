
const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'nexus-media', 'nexus_media.db');
const db = new Database(dbPath);

console.log('Checking database at:', dbPath);

const total = db.prepare("SELECT count(*) as count FROM media_items").get().count;
const images = db.prepare("SELECT count(*) as count FROM media_items WHERE type = 'image'").get().count;
const withEmbedding = db.prepare("SELECT count(*) as count FROM media_items WHERE embedding IS NOT NULL").get().count;
const withAiTags = db.prepare("SELECT count(*) as count FROM media_items WHERE ai_tags IS NOT NULL AND ai_tags != '[]'").get().count;
const withThumbnails = db.prepare("SELECT count(*) as count FROM media_items WHERE thumbnail_path IS NOT NULL").get().count;

console.log('Total items:', total);
console.log('Total images:', images);
console.log('Images with thumbnails:', withThumbnails);
console.log('Images with embeddings:', withEmbedding);
console.log('Images with AI tags:', withAiTags);

const samples = db.prepare("SELECT id, name, ai_tags, embedding FROM media_items WHERE type = 'image' AND thumbnail_path IS NOT NULL LIMIT 5").all();
console.log('\nSample items:');
samples.forEach(s => {
    console.log(`- ID: ${s.id}, Name: ${s.name}, HasTags: ${!!s.ai_tags}, HasEmbed: ${!!s.embedding}`);
});

db.close();
