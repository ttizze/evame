interface AboutSectionCardProps {
  icon: React.ReactNode;
  title: React.ReactNode;
  description: React.ReactNode;
  component: React.ReactNode;
}

export default async function AboutSectionCard({
  icon,
  title,
  description,
  component,
}: AboutSectionCardProps) {
  return (
    <div className="flex h-full flex-col border-b px-8 py-8">
      <div className="flex flex-row items-center gap-2">
        {icon}
        <p className="text-lg">{title}</p>
      </div>
      <p className="text-md ">{description}</p>
      <div className="flex justify-center gap-2 py-2">{component}</div>
    </div>
  );
}
