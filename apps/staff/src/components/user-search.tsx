// S7 search box: a plain GET form, so it works without JavaScript.
export function UserSearch({ query }: { query: string }) {
  return (
    <form role="search" action="/users" className="flex max-w-140 gap-2">
      <label htmlFor="q" className="sr-only">
        Search users by email or user ID
      </label>
      <input
        id="q"
        name="q"
        type="search"
        defaultValue={query}
        placeholder="Email or user ID"
        className="min-h-11 min-w-0 flex-1 rounded-input border border-border-strong bg-surface-sunken px-3 text-text"
      />
      <button
        type="submit"
        className="min-h-11 rounded-input border border-border-strong px-4 font-semibold"
      >
        Search
      </button>
    </form>
  );
}
