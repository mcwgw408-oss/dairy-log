import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  Clock3,
  Heart,
  Plus,
  Save,
  Search,
  Sparkles,
  Trash2,
  TriangleAlert,
} from "lucide-react";

type Mood = "good" | "calm" | "tired" | "hard";
type SaveState = "saved" | "saving" | "error";
type FilterMode = "all" | "favorite" | "today";

type DiaryEntry = {
  id: string;
  date: string;
  title: string;
  body: string;
  mood: Mood;
  favorite: boolean;
  updatedAt: string;
};

const STORAGE_KEY = "daily-diary.entries.v1";

const moodLabels: Record<Mood, string> = {
  good: "よかった",
  calm: "おだやか",
  tired: "つかれた",
  hard: "たいへん",
};

const moodOptions: Mood[] = ["good", "calm", "tired", "hard"];

const todayKey = () => new Date().toISOString().slice(0, 10);

const starterEntry = (): DiaryEntry => ({
  id: crypto.randomUUID(),
  date: todayKey(),
  title: "今日のこと",
  body: "",
  mood: "calm",
  favorite: false,
  updatedAt: new Date().toISOString(),
});

const formatSavedTime = (value: string) =>
  new Intl.DateTimeFormat("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

function App() {
  const [entries, setEntries] = useState<DiaryEntry[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [starterEntry()];

    try {
      const parsed = JSON.parse(saved) as DiaryEntry[];
      return parsed.length ? parsed : [starterEntry()];
    } catch {
      return [starterEntry()];
    }
  });
  const [activeId, setActiveId] = useState(entries[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [saveMessage, setSaveMessage] = useState("保存済み");

  useEffect(() => {
    setSaveState("saving");

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
      setSaveState("saved");
      setSaveMessage("保存しました");
    } catch {
      setSaveState("error");
      setSaveMessage("保存できませんでした");
      return;
    }

    const timer = window.setTimeout(() => setSaveMessage("自動保存中"), 1400);
    return () => window.clearTimeout(timer);
  }, [entries]);

  const activeEntry = entries.find((entry) => entry.id === activeId) ?? entries[0];

  const sortedEntries = useMemo(
    () =>
      [...entries].sort((a, b) => {
        if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
        return b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt);
      }),
    [entries],
  );

  const filteredEntries = useMemo(() => {
    const scopedEntries = sortedEntries.filter((entry) => {
      if (filterMode === "favorite") return entry.favorite;
      if (filterMode === "today") return entry.date === todayKey();
      return true;
    });
    const keyword = query.trim().toLowerCase();
    if (!keyword) return scopedEntries;

    return scopedEntries.filter((entry) =>
      [entry.title, entry.body, entry.date, moodLabels[entry.mood]]
        .join(" ")
        .toLowerCase()
        .includes(keyword),
    );
  }, [filterMode, query, sortedEntries]);

  const updateEntry = (next: Partial<DiaryEntry>) => {
    setEntries((current) =>
      current.map((entry) =>
        entry.id === activeEntry.id
          ? { ...entry, ...next, updatedAt: new Date().toISOString() }
          : entry,
      ),
    );
  };

  const addEntry = () => {
    const next = starterEntry();
    setEntries((current) => [next, ...current]);
    setActiveId(next.id);
  };

  const deleteEntry = () => {
    if (entries.length === 1) {
      updateEntry({ title: "今日のこと", body: "", mood: "calm", favorite: false });
      return;
    }

    const nextEntries = entries.filter((entry) => entry.id !== activeEntry.id);
    setEntries(nextEntries);
    setActiveId(nextEntries[0].id);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateEntry({});
    setSaveMessage("保存しました");
  };

  const wordCount = activeEntry.body.trim()
    ? activeEntry.body.trim().split(/\s+/).length
    : 0;

  return (
    <main className="app-shell">
      <section className="phone-frame">
        <header className="top-bar">
          <div>
            <p className="eyebrow">Daily Diary</p>
            <h1>きょうを残す</h1>
          </div>
          <button className="action-pill primary" type="button" onClick={addEntry}>
            <Plus size={19} />
            新しい日記
          </button>
        </header>

        <div className={`save-status ${saveState}`} aria-live="polite">
          {saveState === "error" ? <TriangleAlert size={20} /> : <CheckCircle2 size={20} />}
          <div>
            <strong>{saveMessage}</strong>
            <span>
              {saveState === "error"
                ? "ブラウザの保存設定を確認してください"
                : "入力内容はこの端末のブラウザに保存されます"}
            </span>
          </div>
        </div>

        <section className="finder-panel" aria-label="保存した日記を探す">
          <div className="finder-head">
            <strong>保存した日記を探す</strong>
            <span>{filteredEntries.length}件表示</span>
          </div>
          <div className="filter-tabs">
            <button
              className={filterMode === "all" ? "selected" : ""}
              type="button"
              onClick={() => setFilterMode("all")}
            >
              <BookOpen size={17} />
              すべて
              <span>{entries.length}</span>
            </button>
            <button
              className={filterMode === "favorite" ? "selected" : ""}
              type="button"
              onClick={() => setFilterMode("favorite")}
            >
              <Sparkles size={17} />
              お気に入り
              <span>{entries.filter((entry) => entry.favorite).length}</span>
            </button>
            <button
              className={filterMode === "today" ? "selected" : ""}
              type="button"
              onClick={() => setFilterMode("today")}
            >
              今日
              <span>{entries.filter((entry) => entry.date === todayKey()).length}</span>
            </button>
          </div>
        </section>

        <label className="search-box">
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="日付・気分・本文で検索"
          />
        </label>

        <div className="entry-strip" aria-label="日記一覧">
          {filteredEntries.length ? (
            filteredEntries.map((entry) => (
              <button
                className={`entry-chip ${entry.id === activeEntry.id ? "active" : ""}`}
                key={entry.id}
                type="button"
                onClick={() => setActiveId(entry.id)}
              >
                <span>{entry.date.slice(5).replace("-", "/")}</span>
                <strong>{entry.title || "無題の日記"}</strong>
              </button>
            ))
          ) : (
            <p className="empty-result">見つかりませんでした</p>
          )}
        </div>

        <form className="editor" onSubmit={handleSubmit}>
          <div className="editor-card">
            <div className="editor-head">
              <label>
                <span>日付</span>
                <input
                  type="date"
                  value={activeEntry.date}
                  onChange={(event) => updateEntry({ date: event.target.value })}
                />
              </label>
              <button
                className={`favorite-button ${activeEntry.favorite ? "liked" : ""}`}
                type="button"
                onClick={() => updateEntry({ favorite: !activeEntry.favorite })}
              >
                <Heart size={19} />
                {activeEntry.favorite ? "お気に入り中" : "お気に入り"}
              </button>
            </div>

            <label className="title-field">
              <span>タイトル</span>
              <input
                value={activeEntry.title}
                onChange={(event) => updateEntry({ title: event.target.value })}
                placeholder="今日のタイトル"
              />
            </label>

            <div className="mood-picker" aria-label="気分">
              {moodOptions.map((mood) => (
                <button
                  className={activeEntry.mood === mood ? "selected" : ""}
                  key={mood}
                  type="button"
                  onClick={() => updateEntry({ mood })}
                >
                  {moodLabels[mood]}
                </button>
              ))}
            </div>

            <label className="body-field">
              <span>本文</span>
              <textarea
                value={activeEntry.body}
                onChange={(event) => updateEntry({ body: event.target.value })}
                placeholder="短くても、まとまっていなくても大丈夫。今日のことをここに。"
              />
            </label>

            <div className="save-summary">
              <Clock3 size={17} />
              <span>最終保存 {formatSavedTime(activeEntry.updatedAt)} / {wordCount} words</span>
            </div>

            <div className="actions">
              <button className="text-button save-button" type="submit">
                <Save size={19} />
                今すぐ保存
              </button>
              <button className="text-button ghost" type="button" onClick={deleteEntry}>
                <Trash2 size={18} />
                削除
              </button>
            </div>
          </div>
        </form>
      </section>
    </main>
  );
}

export default App;
