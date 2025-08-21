import postgres from 'postgres';

// This file is responsible for creating and exporting a singleton instance
// of the Postgres client. This ensures that we reuse the same connection
// pool across the application, which is much more efficient.

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    // In a real application, you would want to handle this gracefully.
    // For development, throwing an error is a good way to catch
    // configuration issues early.
    console.error("FATAL: DATABASE_URL environment variable is not set.");
    // In a server environment, you'd likely want the app to fail to start.
    // To allow the app to build and run for now, we'll use a dummy string,
    // but operations will fail if this is not set correctly by the user.
}

// The postgres library automatically handles connection pooling.
// We pass configuration options here. For many providers like Supabase,
// you may need to require SSL.
const sql = postgres(connectionString || '', {
    // Example for Supabase:
    // ssl: 'require',
    // max: 10, // Max number of connections
});

export default sql;
