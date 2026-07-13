"use client";

import { Pencil } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/useAuth";
import type { AttendanceRecordResponse } from "./attendance-api";
import { EditNoteDialog } from "./EditNoteDialog";
import { formatTime } from "./format";
import { useTodayStatus } from "./useAttendance";

function NoteDisplay({ label, text }: { label: string; text: string }) {
  const truncated = text.length > 30 ? `${text.slice(0, 30)}...` : text;
  return (
    <span className="text-xs text-muted-foreground" title={text}>
      {label}: {truncated}
    </span>
  );
}

export function TodayRecords() {
  const { data: todayStatus, isLoading } = useTodayStatus();
  const { user } = useAuth();
  const [editingRecord, setEditingRecord] = useState<AttendanceRecordResponse | null>(null);

  if (isLoading) {
    return (
      <div className="rounded-lg border p-6 space-y-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
      </div>
    );
  }

  const records = todayStatus?.records ?? [];

  if (records.length === 0) {
    return (
      <div className="rounded-lg border p-6">
        <h3 className="text-sm font-medium mb-2">本日の打刻記録</h3>
        <p className="text-sm text-muted-foreground">打刻記録はありません</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-6">
      <h3 className="text-sm font-medium mb-3">本日の打刻記録</h3>
      <div className="space-y-2">
        {records.map((record) => (
          <div
            key={record.id}
            className="flex items-center justify-between text-sm py-1.5 border-b last:border-b-0"
          >
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <span className="font-medium">{formatTime(record.clockIn)}</span>
                <span className="text-muted-foreground">~</span>
                <span className="font-medium">
                  {record.clockOut ? formatTime(record.clockOut) : "--:--"}
                </span>
                {record.corrected && <Badge variant="outline">修正済み</Badge>}
              </div>
              <div className="flex flex-col gap-0.5">
                {record.clockInNote && <NoteDisplay label="出勤" text={record.clockInNote} />}
                {record.clockOutNote && <NoteDisplay label="退勤" text={record.clockOutNote} />}
              </div>
            </div>
            {user && (
              <button
                type="button"
                onClick={() => setEditingRecord(record)}
                className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                title="メモを編集"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
      {editingRecord && (
        <EditNoteDialog record={editingRecord} onClose={() => setEditingRecord(null)} />
      )}
    </div>
  );
}
