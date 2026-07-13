"use client";

import { Pencil } from "lucide-react";
import { useState } from "react";
import { type Column, DataTable } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import type { AttendanceRecordResponse, DailyAttendanceResponse } from "./attendance-api";
import { EditNoteDialog } from "./EditNoteDialog";
import { formatDate, formatMinutes, formatTime } from "./format";

function firstClockIn(day: DailyAttendanceResponse): string {
  const record = day.records[0];
  return record ? formatTime(record.clockIn) : "--:--";
}

function lastClockOut(day: DailyAttendanceResponse): string {
  const last = day.records[day.records.length - 1];
  return last?.clockOut ? formatTime(last.clockOut) : "--:--";
}

function hasCorrected(day: DailyAttendanceResponse): boolean {
  return day.records.some((r) => r.corrected);
}

function buildNoteText(day: DailyAttendanceResponse): string {
  const parts: string[] = [];
  for (const record of day.records) {
    if (record.clockInNote) parts.push(`出勤: ${record.clockInNote}`);
    if (record.clockOutNote) parts.push(`退勤: ${record.clockOutNote}`);
  }
  return parts.join(" / ");
}

const columns: Column<DailyAttendanceResponse>[] = [
  {
    key: "date",
    header: "日付",
    render: (day) => formatDate(day.date),
  },
  {
    key: "clockIn",
    header: "出勤",
    render: (day) => firstClockIn(day),
  },
  {
    key: "clockOut",
    header: "退勤",
    render: (day) => lastClockOut(day),
  },
  {
    key: "workMinutes",
    header: "勤務時間",
    render: (day) => (day.workMinutes > 0 ? formatMinutes(day.workMinutes) : "-"),
  },
  {
    key: "breakMinutes",
    header: "休憩",
    render: (day) => (day.breakMinutes > 0 ? formatMinutes(day.breakMinutes) : "-"),
  },
  {
    key: "overtimeMinutes",
    header: "残業",
    render: (day) => (day.overtimeMinutes > 0 ? formatMinutes(day.overtimeMinutes) : "-"),
  },
  {
    key: "note",
    header: "メモ",
    render: (day) => {
      const text = buildNoteText(day);
      if (!text) return null;
      const truncated = text.length > 30 ? `${text.slice(0, 30)}...` : text;
      return (
        <span className="text-xs text-muted-foreground" title={text}>
          {truncated}
        </span>
      );
    },
  },
  {
    key: "corrected",
    header: "",
    render: (day) => (hasCorrected(day) ? <Badge variant="outline">修正</Badge> : null),
  },
];

interface AttendanceTableProps {
  days: DailyAttendanceResponse[];
  editable?: boolean;
}

export function AttendanceTable({ days, editable = false }: AttendanceTableProps) {
  const [editingRecord, setEditingRecord] = useState<AttendanceRecordResponse | null>(null);

  const allColumns = editable
    ? [
        ...columns,
        {
          key: "edit" as const,
          header: "",
          render: (day: DailyAttendanceResponse) => {
            const record = day.records[0];
            if (!record) return null;
            return (
              <button
                type="button"
                onClick={() => setEditingRecord(record)}
                className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                title="メモを編集"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            );
          },
        },
      ]
    : columns;

  return (
    <>
      <DataTable<DailyAttendanceResponse & Record<string, unknown>>
        columns={allColumns as Column<DailyAttendanceResponse & Record<string, unknown>>[]}
        data={days as (DailyAttendanceResponse & Record<string, unknown>)[]}
        rowKey={(item) => item.date}
        emptyMessage="勤怠データがありません"
      />
      {editingRecord && (
        <EditNoteDialog record={editingRecord} onClose={() => setEditingRecord(null)} />
      )}
    </>
  );
}
