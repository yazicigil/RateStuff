export default function SuspendedNotice() {
  return (
    <div className="border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/30 rounded-md p-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <img
          src="/logo.svg"
          alt="RateStuff"
          className="h-10 w-auto mb-2"
        />
        {/* warning icon */}
        <img
          src="/badges/report-warning.svg"
          alt="Report warning"
          className="h-12 w-12"
        />
        <h2 className="text-lg font-semibold text-red-700 dark:text-red-300">
          Bu gönderi silinmiş veya askıya alınmıştır
        </h2>
        <p className="text-sm text-red-600 dark:text-red-400 max-w-md">
          Bu içerik çoklu raporlar nedeniyle yayından kaldırılmış olabilir.
        </p>
        <a
          href="/"
          className="mt-4 inline-block rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition"
        >
          Ana sayfaya dön
        </a>
      </div>
    </div>
  );
}