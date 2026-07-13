"use client";

import { useState } from "react";
import { MonthSelector } from "@/components/MonthSelector";
import { Skeleton } from "@/components/ui/skeleton";
import { AttendanceTable } from "@/features/attendance/AttendanceTable";
import { MonthlySummary } from "@/features/attendance/MonthlySummary";
import { useAttendanceHistory } from "@/features/attendance/useAttendance";

function currentYearMonth(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function toMonthString(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export default function HistoryPage() {
  const initial = currentYearMonth();
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const monthStr = toMonthString(year, month);

  const { data, isLoading } = useAttendanceHistory(monthStr);

  const handleMonthChange = (newYear: number, newMonth: number) => {
    setYear(newYear);
    setMonth(newMonth);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">勤怠履歴</h1>
        <MonthSelector year={year} month={month} onChange={handleMonthChange} />
      </div>
      <MonthlySummary summary={data?.summary} isLoading={isLoading} />
      {isLoading ? (
        <div className="space-y-2">
          {["r1", "r2", "r3", "r4", "r5"].map((id) => (
            <Skeleton key={id} className="h-10 w-full" />
          ))}
        </div>
      ) : (
        <AttendanceTable days={data?.days ?? []} editable />
      )}
    </div>
  );
}
