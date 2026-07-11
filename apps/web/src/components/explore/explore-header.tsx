type ExploreHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
};

/** Consistent page header for Explore sub-sections. */
export function ExploreHeader({
  eyebrow = 'Explore',
  title,
  description,
  children,
}: ExploreHeaderProps) {
  return (
    <div className="mb-6">
      <p className="font-body text-sm font-extrabold uppercase tracking-widest text-rust">
        {eyebrow}
      </p>
      <h1 className="mt-2 font-display text-3xl font-black tracking-tight md:text-4xl">
        {title}
      </h1>
      {description && (
        <p className="mt-3 max-w-2xl text-lg text-ink/70">{description}</p>
      )}
      {children}
    </div>
  );
}
