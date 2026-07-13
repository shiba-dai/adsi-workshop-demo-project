package com.example.attendance.attendance.service;

import com.example.attendance.attendance.dto.AttendanceHistoryResponse;
import com.example.attendance.attendance.dto.AttendanceRecordResponse;
import com.example.attendance.attendance.dto.TeamMemberSummaryResponse;
import com.example.attendance.attendance.dto.TodayStatusResponse;

import java.util.List;
import java.util.UUID;

public interface AttendanceService {

    AttendanceRecordResponse clockIn(UUID employeeId, String note);

    AttendanceRecordResponse clockOut(UUID employeeId, String note);

    AttendanceRecordResponse updateNote(UUID recordId, UUID authenticatedUserId, String clockInNote, String clockOutNote);

    TodayStatusResponse getTodayStatus(UUID employeeId);

    AttendanceHistoryResponse getHistory(UUID employeeId, String month);

    List<TeamMemberSummaryResponse> getTeamAttendance(UUID managerId, String month);

    List<TeamMemberSummaryResponse> getAllAttendance(String month, UUID departmentId);
}
