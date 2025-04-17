export default function HomePage() {
    return (
        <main className="flex min-h-screen flex-col items-center p-24">
            <h1 className="text-3xl font-bold">Anon Feed</h1>
            <p className="mt-4 text-muted-foreground">
                Here's what's happening.
            </p>
            <div className="mt-8 w-full max-w-2xl">
                <p className="text-center text-sm text-gray-500">
                    Feed
                </p>
            </div>
        </main>
    );
}