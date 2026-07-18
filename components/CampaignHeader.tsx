export function CampaignHeader({
  name,
  title,
  totalLeaves,
  stageLabel,
  nextMilestone,
}: {
  name: string;
  title?: string;
  totalLeaves: number;
  stageLabel: string;
  nextMilestone: number | null;
}) {
  return (
    <header className="text-center px-4 pt-8 pb-1">
      <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-leaf-dark drop-shadow-sm">
        🌿 {title ?? name}
      </h1>
      <p className="mt-1 text-sm sm:text-base text-leaf-dark">
        <strong>{totalLeaves}</strong>{" "}
        {totalLeaves === 1 ? "person has" : "people have"} grown a leaf
        {" · "}
        <span className="capitalize">{stageLabel}</span>
      </p>
      {nextMilestone && (
        <p className="mt-1 text-xs text-bark/70">
          {nextMilestone - totalLeaves} more to evolve into the next stage (
          {nextMilestone} 🌿)
        </p>
      )}
    </header>
  );
}

export function NewestLeafBanner({ username }: { username: string | null }) {
  if (!username) return null;
  return (
    <div className="mx-auto mt-3 max-w-md rounded-full bg-yellow-100/80 px-4 py-2 text-center text-sm font-medium text-amber-900 shadow-sm animate-pulse-glow">
      Newest leaf: <span className="font-bold">@{username}</span>
    </div>
  );
}
