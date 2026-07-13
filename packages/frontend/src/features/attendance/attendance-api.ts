import { apiClient } from "@/lib/api-client";

export interface AttendanceRecordResponse {
  id: string;
  workDate: string;
  clockIn: string;
  clockOut: string | null;
  clockInNote: string | null;
  clockOutNote: string | null;
  corrected: boolean;
}

export interface TodayStatusResponse {
  status: "NOT_CLOCKED_IN" | "CLOCKED_IN" | "CLOCKED_OUT";
  records: AttendanceRecordResponse[];
}

export interface DailyAttendanceResponse {
  date: string;
  records: AttendanceRecordResponse[];
  totalWorkMinutes: number;
  breakMinutes: number;
  workMinutes: number;
  overtimeMinutes: number;
}

export interface MonthlySummaryResponse {
  workDays: number;
  totalWorkMinutes: number;
  totalOvertimeMinutes: number;
  absentDays: number;
}

export interface AttendanceHistoryResponse {
  month: string;
  days: DailyAttendanceResponse[];
  summary: MonthlySummaryResponse;
}

export interface TeamMemberSummaryResponse {
  employeeId: string;
  employeeName: string;
  workDays: number;
  totalWorkMinutes: number;
  totalOvertimeMinutes: number;
  absentDays: number;
}

export function clockIn(employeeId: string, note?: string): Promise<AttendanceRecordResponse> {
  return apiClient.post<AttendanceRecordResponse>("/api/attendance/clock-in", {
    employeeId,
    note: note || null,
  });
}

export function clockOut(employeeId: string, note?: string): Promise<AttendanceRecordResponse> {
  return apiClient.post<AttendanceRecordResponse>("/api/attendance/clock-out", {
    employeeId,
    note: note || null,
  });
}

export interface UpdateNoteRequest {
  clockInNote?: string | null;
  clockOutNote?: string | null;
}

export function updateNote(
  recordId: string,
  request: UpdateNoteRequest,
): Promise<AttendanceRecordResponse> {
  return apiClient.patch<AttendanceRecordResponse>(`/api/attendance/${recordId}/note`, request);
}

export function fetchTodayStatus(employeeId: string): Promise<TodayStatusResponse> {
  return apiClient.get<TodayStatusResponse>(`/api/attendance/today?employeeId=${employeeId}`);
}

export function fetchHistory(
  employeeId: string,
  month: string,
): Promise<AttendanceHistoryResponse> {
  return apiClient.get<AttendanceHistoryResponse>(
    `/api/attendance/history?employeeId=${employeeId}&month=${month}`,
  );
}

export function fetchTeamAttendance(
  managerId: string,
  month: string,
): Promise<TeamMemberSummaryResponse[]> {
  return apiClient.get<TeamMemberSummaryResponse[]>(
    `/api/attendance/team?managerId=${managerId}&month=${month}`,
  );
}

export function fetchAllAttendance(
  month: string,
  departmentId?: string,
): Promise<TeamMemberSummaryResponse[]> {
  const params = new URLSearchParams({ month });
  if (departmentId) {
    params.set("departmentId", departmentId);
  }
  return apiClient.get<TeamMemberSummaryResponse[]>(`/api/attendance/all?${params.toString()}`);
}
