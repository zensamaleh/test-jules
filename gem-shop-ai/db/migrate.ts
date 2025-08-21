// This script is used to apply SQL schema changes to the database.
// It reads all .sql files from the db/schema directory and executes them
// in alphabetical order.
// To run this script, you will need a TypeScript runner like ts-node or bun.
// Example:
// 1. Install ts-node: npm install -g ts-node
// 2. Set up your .env.local file with the DATABASE_URL.
// 3. Run: ts-node --require dotenv/config db/migrate.ts

import { promises as fs } from 'fs';
import path from 'path';
import sql from '../src/lib/db'; // Note the relative path

async function main() {
    console.log("Starting database migration...");

    // Ensure the DB connection is available
    // The dotenv/config require in the example command will load this.
    if (!process.env.DATABASE_URL) {
        console.error("Error: DATABASE_URL environment variable is not set.");
        process.exit(1);
    }

    try {
        const schemaDir = path.join(__dirname, 'schema');
        const files = await fs.readdir(schemaDir);

        // Filter for .sql files and sort them to ensure correct order
        const sqlFiles = files
            .filter(file => file.endsWith('.sql'))
            .sort();

        if (sqlFiles.length === 0) {
            console.log("No .sql files found in db/schema. Nothing to migrate.");
            return;
        }

        console.log("Found migration files:", sqlFiles);

        for (const file of sqlFiles) {
            console.log(`- Applying ${file}...`);
            const filePath = path.join(schemaDir, file);
            const script = await fs.readFile(filePath, 'utf-8');

            // We use sql.unsafe because we are executing a script with
            // multiple statements from a file. This is safe as long as we
            // trust the .sql files in our repository.
            await sql.unsafe(script);
            console.log(`- Successfully applied ${file}.`);
        }

        console.log("Database migration completed successfully!");
        await sql.end(); // Close the database connection

    } catch (error) {
        console.error("Migration failed:", error);
        await sql.end(); // Ensure connection is closed on failure
        process.exit(1);
    }
}

main();
