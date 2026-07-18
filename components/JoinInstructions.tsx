export function JoinInstructions({
  instagramPermalink,
  trigger = "🌱",
}: {
  instagramPermalink: string | null;
  trigger?: string;
}) {
  return (
    <section className="mx-auto mt-6 max-w-md rounded-2xl bg-white/70 p-5 shadow-sm backdrop-blur">
      <h2 className="text-lg font-bold">Want your own leaf?</h2>
      <p className="mt-1 text-sm text-bark/80">
        Comment <span className="font-bold">{trigger}</span> on the latest Reel, then
        come back to find your name on the plant.
      </p>
      <a
        href={instagramPermalink ?? "https://www.instagram.com/"}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-block rounded-full bg-leaf px-5 py-2 text-sm font-semibold text-white shadow transition hover:bg-leaf-dark"
      >
        Open the Reel on Instagram →
      </a>
    </section>
  );
}
