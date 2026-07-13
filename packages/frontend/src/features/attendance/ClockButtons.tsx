"use client";

import { LogIn, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatTime } from "./format";
import { useClockIn, useClockOut, useTodayStatus } from "./useAttendance";

const NOTE_MAX_LENGTH = 200;

function CurrentTime() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = now.toLocaleTimeString("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const dateStr = now.toLocaleDateString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return (
    <div className="text-center">
      <p className="text-4xl font-bold tabular-nums tracking-tight">{timeStr}</p>
      <p className="text-sm text-muted-foreground mt-1">{dateStr}</p>
    </div>
  );
}

const STATUS_LABELS = {
  NOT_CLOCKED_IN: "未出勤",
  CLOCKED_IN: "勤務中",
  CLOCKED_OUT: "退勤済み",
} as const;

const PLACEHOLDERS = {
  NOT_CLOCKED_IN: "遅刻理由など（任意）",
  CLOCKED_IN: "早退理由など（任意）",
  CLOCKED_OUT: "",
} as const;

export function ClockButtons() {
  const { data: todayStatus, isLoading } = useTodayStatus();
  const clockInMutation = useClockIn();
  const clockOutMutation = useClockOut();
  const [note, setNote] = useState("");

  if (isLoading) {
    return (
      <div className="rounded-lg border p-6 space-y-4">
        <Skeleton className="h-12 w-48 mx-auto" />
        <Skeleton className="h-5 w-24 mx-auto" />
        <div className="flex justify-center gap-4">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-28" />
        </div>
      </div>
    );
  }

  const status = todayStatus?.status ?? "NOT_CLOCKED_IN";
  const canClockIn = status === "NOT_CLOCKED_IN";
  const canClockOut = status === "CLOCKED_IN";
  const isPending = clockInMutation.isPending || clockOutMutation.isPending;
  const isOverLimit = note.length > NOTE_MAX_LENGTH;

  const lastRecord = todayStatus?.records[todayStatus.records.length - 1];

  const handleClockIn = () => {
    clockInMutation.mutate(note || undefined, {
      onSuccess: () => setNote(""),
    });
  };

  const handleClockOut = () => {
    clockOutMutation.mutate(note || undefined, {
      onSuccess: () => setNote(""),
    });
  };

  return (
    <div className="rounded-lg border p-6 space-y-4">
      <CurrentTime />
      <div className="flex items-center justify-center gap-2">
        <span className="text-sm text-muted-foreground">{STATUS_LABELS[status]}</span>
        {lastRecord && status === "CLOCKED_IN" && (
          <span className="text-sm text-muted-foreground">
            ({formatTime(lastRecord.clockIn)} ~)
          </span>
        )}
      </div>
      <div className="max-w-md mx-auto space-y-1">
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={PLACEHOLDERS[status]}
          disabled={status === "CLOCKED_OUT" || isPending}
          className="w-full rounded-md border px-3 py-2 text-sm placeholder:text-muted-foreground disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <p
          className={`text-xs text-right ${isOverLimit ? "text-red-500" : "text-muted-foreground"}`}
        >
          {note.length}/{NOTE_MAX_LENGTH}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
        <button
          type="button"
          disabled={!canClockIn || isPending || isOverLimit}
          onClick={handleClockIn}
          className="flex flex-col items-center justify-center gap-2 rounded-xl bg-blue-500 py-8 text-white transition-colors hover:bg-blue-600 active:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400"
        >
          <LogIn className="h-8 w-8" />
          <span className="text-lg font-bold">出勤</span>
        </button>
        <button
          type="button"
          disabled={!canClockOut || isPending || isOverLimit}
          onClick={handleClockOut}
          className="flex flex-col items-center justify-center gap-2 rounded-xl bg-orange-500 py-8 text-white transition-colors hover:bg-orange-600 active:bg-orange-700 disabled:bg-gray-200 disabled:text-gray-400"
        >
          <LogOut className="h-8 w-8" />
          <span className="text-lg font-bold">退勤</span>
        </button>
      </div>
    </div>
  );
}
