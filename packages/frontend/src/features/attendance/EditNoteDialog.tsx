"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AttendanceRecordResponse } from "./attendance-api";
import { useUpdateNote } from "./useAttendance";

const NOTE_MAX_LENGTH = 200;

interface EditNoteDialogProps {
  record: AttendanceRecordResponse;
  onClose: () => void;
}

export function EditNoteDialog({ record, onClose }: EditNoteDialogProps) {
  const [clockInNote, setClockInNote] = useState(record.clockInNote ?? "");
  const [clockOutNote, setClockOutNote] = useState(record.clockOutNote ?? "");
  const updateNoteMutation = useUpdateNote();

  const isOverLimit = clockInNote.length > NOTE_MAX_LENGTH || clockOutNote.length > NOTE_MAX_LENGTH;

  const handleSave = () => {
    const request: Record<string, string | null> = {};

    if (clockInNote !== (record.clockInNote ?? "")) {
      request.clockInNote = clockInNote;
    }
    if (clockOutNote !== (record.clockOutNote ?? "")) {
      request.clockOutNote = clockOutNote;
    }

    if (Object.keys(request).length === 0) {
      onClose();
      return;
    }

    updateNoteMutation.mutate({ recordId: record.id, request }, { onSuccess: onClose });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>メモ編集</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="clockInNote">
              出勤メモ
            </label>
            <input
              id="clockInNote"
              type="text"
              value={clockInNote}
              onChange={(e) => setClockInNote(e.target.value)}
              placeholder="遅刻理由など"
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p
              className={`text-xs text-right ${clockInNote.length > NOTE_MAX_LENGTH ? "text-red-500" : "text-muted-foreground"}`}
            >
              {clockInNote.length}/{NOTE_MAX_LENGTH}
            </p>
          </div>
          {record.clockOut && (
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="clockOutNote">
                退勤メモ
              </label>
              <input
                id="clockOutNote"
                type="text"
                value={clockOutNote}
                onChange={(e) => setClockOutNote(e.target.value)}
                placeholder="早退理由など"
                className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p
                className={`text-xs text-right ${clockOutNote.length > NOTE_MAX_LENGTH ? "text-red-500" : "text-muted-foreground"}`}
              >
                {clockOutNote.length}/{NOTE_MAX_LENGTH}
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            キャンセル
          </Button>
          <Button onClick={handleSave} disabled={isOverLimit || updateNoteMutation.isPending}>
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
