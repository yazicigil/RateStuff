export default function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700">
      {children}
    </span>
  );
}
