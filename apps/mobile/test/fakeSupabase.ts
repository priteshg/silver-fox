/**
 * A minimal in-memory stand-in for the subset of the supabase-js
 * query-builder API this app's repositories actually use
 * (from/select/insert/update/delete/eq/in/order/maybeSingle, plus the
 * `{count, head}` select variant). It exists so repository unit tests can
 * run without a live Postgres connection, the same way `mockAsyncStorage`
 * let the old AsyncStorage-backed repositories be tested in isolation.
 *
 * This is deliberately not a full Postgrest reimplementation — no RLS, no
 * joins, no `or()`/`like()`. Extend it only when a repository test actually
 * needs the next operator.
 */
export type FakeRow = Record<string, unknown>;
export type FakeDb = Record<string, FakeRow[]>;

export function createFakeDb(): FakeDb {
  return {};
}

export function resetFakeDb(db: FakeDb): void {
  for (const key of Object.keys(db)) delete db[key];
}

type SelectOptions = { count?: "exact"; head?: boolean };
type OrderOptions = { ascending?: boolean };
type QueryResult = { data: unknown; error: null; count?: number };

function table(db: FakeDb, name: string): FakeRow[] {
  if (!db[name]) db[name] = [];
  return db[name];
}

export function createFakeSupabaseClient(db: FakeDb) {
  function from(name: string) {
    const rows = table(db, name);
    let mode: "select" | "insert" | "update" | "delete" = "select";
    let insertRows: FakeRow[] = [];
    let updatePatch: FakeRow = {};
    const filters: ((row: FakeRow) => boolean)[] = [];
    let orderCol: string | null = null;
    let orderAscending = true;
    let wantCount = false;
    let headOnly = false;
    // Real supabase-js only returns the affected row(s) from an insert/
    // update/delete when `.select()` is explicitly chained after it —
    // otherwise `data` is null. Bare `.select()` (no count/head options) sets
    // this rather than the count-query flags above.
    let wantSelectAfterWrite = false;
    let singleMode: "single" | "maybeSingle" | null = null;

    const builder = {
      select(_columns?: string, options?: SelectOptions) {
        if (options?.count) wantCount = true;
        if (options?.head) headOnly = true;
        if (!options) wantSelectAfterWrite = true;
        return builder;
      },
      insert(input: FakeRow | FakeRow[]) {
        mode = "insert";
        insertRows = Array.isArray(input) ? input : [input];
        return builder;
      },
      update(patch: FakeRow) {
        mode = "update";
        updatePatch = patch;
        return builder;
      },
      delete() {
        mode = "delete";
        return builder;
      },
      eq(column: string, value: unknown) {
        filters.push((row) => row[column] === value);
        return builder;
      },
      in(column: string, values: unknown[]) {
        filters.push((row) => values.includes(row[column]));
        return builder;
      },
      order(column: string, options?: OrderOptions) {
        orderCol = column;
        orderAscending = options?.ascending ?? true;
        return builder;
      },
      maybeSingle() {
        singleMode = "maybeSingle";
        return builder;
      },
      single() {
        singleMode = "single";
        return builder;
      },
      then<T>(
        resolve: (result: QueryResult) => T,
        reject?: (reason: unknown) => T,
      ): Promise<T> {
        try {
          const result = execute();
          return Promise.resolve(resolve(result));
        } catch (error) {
          if (reject) return Promise.resolve(reject(error));
          throw error;
        }
      },
    };

    function applySingle(matched: FakeRow[]): QueryResult {
      if (singleMode) return { data: matched[0] ?? null, error: null };
      return { data: matched, error: null };
    }

    function execute(): QueryResult {
      if (mode === "insert") {
        const inserted = insertRows.map((row) => ({ ...row }));
        rows.push(...inserted);
        return wantSelectAfterWrite || singleMode ? applySingle(inserted) : { data: null, error: null };
      }
      if (mode === "update") {
        const affected: FakeRow[] = [];
        for (const row of rows) {
          if (filters.every((matches) => matches(row))) {
            Object.assign(row, updatePatch);
            affected.push(row);
          }
        }
        return wantSelectAfterWrite || singleMode ? applySingle(affected) : { data: null, error: null };
      }
      if (mode === "delete") {
        const kept = rows.filter((row) => !filters.every((matches) => matches(row)));
        const removed = rows.filter((row) => filters.every((matches) => matches(row)));
        rows.length = 0;
        rows.push(...kept);
        return wantSelectAfterWrite || singleMode ? applySingle(removed) : { data: null, error: null };
      }

      let matched = rows.filter((row) => filters.every((matches) => matches(row)));
      if (orderCol) {
        const column = orderCol;
        matched = [...matched].sort((a, b) => {
          const left = a[column];
          const right = b[column];
          const cmp = left === right ? 0 : (left as string | number) < (right as string | number) ? -1 : 1;
          return orderAscending ? cmp : -cmp;
        });
      }
      if (wantCount) {
        return { data: headOnly ? null : matched, error: null, count: matched.length };
      }
      return applySingle(matched);
    }

    return builder;
  }

  return { from };
}
