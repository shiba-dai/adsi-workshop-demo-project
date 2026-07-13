package com.example.attendance.attendance.service;

import com.example.attendance.attendance.domain.AttendanceStatus;
import com.example.attendance.attendance.entity.AttendanceRecord;
import com.example.attendance.attendance.repository.AttendanceRecordRepository;
import com.example.attendance.department.entity.Department;
import com.example.attendance.employee.entity.Employee;
import com.example.attendance.employee.entity.Role;
import com.example.attendance.employee.repository.EmployeeRepository;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AttendanceServiceTest {

    private static final Instant FIXED_INSTANT = Instant.parse("2025-01-15T00:00:00Z");
    private static final ZoneId ZONE_TOKYO = ZoneId.of("Asia/Tokyo");
    private static final LocalDate TODAY_TOKYO = LocalDate.of(2025, 1, 15);

    @Mock
    private AttendanceRecordRepository attendanceRepository;

    @Mock
    private EmployeeRepository employeeRepository;

    private AttendanceServiceImpl service;

    private Employee employee;
    private Department department;

    @BeforeEach
    void setUp() {
        var clock = Clock.fixed(FIXED_INSTANT, ZONE_TOKYO);
        service = new AttendanceServiceImpl(attendanceRepository, employeeRepository, clock);

        department = Department.builder()
                .id(UUID.randomUUID())
                .name("Engineering")
                .build();

        employee = Employee.builder()
                .id(UUID.randomUUID())
                .name("田中太郎")
                .email("tanaka@example.com")
                .password("hashed")
                .department(department)
                .role(Role.EMPLOYEE)
                .isManager(false)
                .hireDate(LocalDate.of(2024, 4, 1))
                .build();
    }

    @Nested
    @DisplayName("出勤打刻")
    class ClockIn {

        @Test
        @DisplayName("出勤中に再度出勤打刻すると409エラー")
        void clockIn_alreadyClockedIn_throwsConflict() {
            // Arrange
            var existingRecord = AttendanceRecord.builder()
                    .id(UUID.randomUUID())
                    .employee(employee)
                    .workDate(TODAY_TOKYO)
                    .clockIn(FIXED_INSTANT)
                    .build();
            when(employeeRepository.findById(employee.getId())).thenReturn(Optional.of(employee));
            when(attendanceRepository.findByEmployeeIdAndWorkDateAndClockOutIsNull(employee.getId(), TODAY_TOKYO))
                    .thenReturn(Optional.of(existingRecord));

            // Act & Assert
            assertThatThrownBy(() -> service.clockIn(employee.getId()))
                    .isInstanceOf(ResponseStatusException.class)
                    .hasMessageContaining("Already clocked in");
        }

        @Test
        @DisplayName("正常に出勤打刻ができる")
        void clockIn_normal_createsRecord() {
            // Arrange
            when(employeeRepository.findById(employee.getId())).thenReturn(Optional.of(employee));
            when(attendanceRepository.save(any(AttendanceRecord.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            // Act
            var result = service.clockIn(employee.getId(), null);

            // Assert
            assertThat(result.workDate()).isEqualTo(TODAY_TOKYO);
            assertThat(result.clockIn()).isEqualTo(FIXED_INSTANT);
            assertThat(result.clockOut()).isNull();

            var captor = ArgumentCaptor.forClass(AttendanceRecord.class);
            verify(attendanceRepository).save(captor.capture());
            assertThat(captor.getValue().getEmployee().getId()).isEqualTo(employee.getId());
        }

        @Test
        @DisplayName("出勤打刻時にメモが保存される")
        void clockIn_withNote_savesNote() {
            // Arrange
            when(employeeRepository.findById(employee.getId())).thenReturn(Optional.of(employee));
            when(attendanceRepository.save(any(AttendanceRecord.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            // Act
            var result = service.clockIn(employee.getId(), "電車遅延のため10分遅刻");

            // Assert
            assertThat(result.clockInNote()).isEqualTo("電車遅延のため10分遅刻");

            var captor = ArgumentCaptor.forClass(AttendanceRecord.class);
            verify(attendanceRepository).save(captor.capture());
            assertThat(captor.getValue().getClockInNote()).isEqualTo("電車遅延のため10分遅刻");
        }

        @Test
        @DisplayName("メモなしで出勤打刻するとnoteはnull")
        void clockIn_withoutNote_noteIsNull() {
            // Arrange
            when(employeeRepository.findById(employee.getId())).thenReturn(Optional.of(employee));
            when(attendanceRepository.save(any(AttendanceRecord.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            // Act
            var result = service.clockIn(employee.getId(), null);

            // Assert
            assertThat(result.clockInNote()).isNull();
        }
    }

    @Nested
    @DisplayName("退勤打刻")
    class ClockOut {

        @Test
        @DisplayName("正常に退勤打刻ができる")
        void clockOut_normal_setsClockOut() {
            // Arrange
            var openRecord = AttendanceRecord.builder()
                    .id(UUID.randomUUID())
                    .employee(employee)
                    .workDate(TODAY_TOKYO)
                    .clockIn(Instant.parse("2025-01-14T23:00:00Z"))
                    .build();
            when(attendanceRepository.findByEmployeeIdAndWorkDateAndClockOutIsNull(employee.getId(), TODAY_TOKYO))
                    .thenReturn(Optional.of(openRecord));
            when(attendanceRepository.save(any(AttendanceRecord.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            // Act
            var result = service.clockOut(employee.getId(), null);

            // Assert
            assertThat(result.clockOut()).isEqualTo(FIXED_INSTANT);
        }

        @Test
        @DisplayName("退勤打刻時にメモが保存される")
        void clockOut_withNote_savesNote() {
            // Arrange
            var openRecord = AttendanceRecord.builder()
                    .id(UUID.randomUUID())
                    .employee(employee)
                    .workDate(TODAY_TOKYO)
                    .clockIn(Instant.parse("2025-01-14T23:00:00Z"))
                    .clockInNote("出勤時メモ")
                    .build();
            when(attendanceRepository.findByEmployeeIdAndWorkDateAndClockOutIsNull(employee.getId(), TODAY_TOKYO))
                    .thenReturn(Optional.of(openRecord));
            when(attendanceRepository.save(any(AttendanceRecord.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            // Act
            var result = service.clockOut(employee.getId(), "体調不良のため早退");

            // Assert
            assertThat(result.clockOutNote()).isEqualTo("体調不良のため早退");
        }

        @Test
        @DisplayName("出勤中レコードがない場合は409エラー")
        void clockOut_noClockedIn_throwsConflict() {
            // Arrange
            when(attendanceRepository.findByEmployeeIdAndWorkDateAndClockOutIsNull(employee.getId(), TODAY_TOKYO))
                    .thenReturn(Optional.empty());

            // Act & Assert
            assertThatThrownBy(() -> service.clockOut(employee.getId(), null))
                    .isInstanceOf(ResponseStatusException.class)
                    .hasMessageContaining("No active clock-in found");
        }
    }

    @Nested
    @DisplayName("メモ編集")
    class UpdateNote {

        @Test
        @DisplayName("本人が出勤メモを編集できる")
        void updateNote_clockInNote_updatesSuccessfully() {
            // Arrange
            var recordId = UUID.randomUUID();
            var record = AttendanceRecord.builder()
                    .id(recordId)
                    .employee(employee)
                    .workDate(TODAY_TOKYO)
                    .clockIn(FIXED_INSTANT)
                    .clockInNote("元のメモ")
                    .build();
            when(attendanceRepository.findById(recordId)).thenReturn(Optional.of(record));
            when(attendanceRepository.save(any(AttendanceRecord.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            // Act
            var result = service.updateNote(recordId, employee.getId(), "更新後のメモ", null);

            // Assert
            assertThat(result.clockInNote()).isEqualTo("更新後のメモ");
        }

        @Test
        @DisplayName("本人が退勤メモを編集できる")
        void updateNote_clockOutNote_updatesSuccessfully() {
            // Arrange
            var recordId = UUID.randomUUID();
            var record = AttendanceRecord.builder()
                    .id(recordId)
                    .employee(employee)
                    .workDate(TODAY_TOKYO)
                    .clockIn(FIXED_INSTANT)
                    .clockOut(FIXED_INSTANT.plusSeconds(3600))
                    .clockOutNote("元の退勤メモ")
                    .build();
            when(attendanceRepository.findById(recordId)).thenReturn(Optional.of(record));
            when(attendanceRepository.save(any(AttendanceRecord.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            // Act
            var result = service.updateNote(recordId, employee.getId(), null, "更新後の退勤メモ");

            // Assert
            assertThat(result.clockOutNote()).isEqualTo("更新後の退勤メモ");
        }

        @Test
        @DisplayName("空文字を送信するとメモがクリアされる")
        void updateNote_emptyString_clearsNote() {
            // Arrange
            var recordId = UUID.randomUUID();
            var record = AttendanceRecord.builder()
                    .id(recordId)
                    .employee(employee)
                    .workDate(TODAY_TOKYO)
                    .clockIn(FIXED_INSTANT)
                    .clockInNote("既存のメモ")
                    .build();
            when(attendanceRepository.findById(recordId)).thenReturn(Optional.of(record));
            when(attendanceRepository.save(any(AttendanceRecord.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            // Act
            var result = service.updateNote(recordId, employee.getId(), "", null);

            // Assert
            assertThat(result.clockInNote()).isNull();
        }

        @Test
        @DisplayName("他人のレコードを編集しようとすると403エラー")
        void updateNote_otherUser_throwsForbidden() {
            // Arrange
            var recordId = UUID.randomUUID();
            var otherEmployee = Employee.builder()
                    .id(UUID.randomUUID())
                    .name("他人")
                    .email("other@example.com")
                    .password("hashed")
                    .department(department)
                    .role(Role.EMPLOYEE)
                    .isManager(false)
                    .hireDate(LocalDate.of(2024, 4, 1))
                    .build();
            var record = AttendanceRecord.builder()
                    .id(recordId)
                    .employee(otherEmployee)
                    .workDate(TODAY_TOKYO)
                    .clockIn(FIXED_INSTANT)
                    .clockInNote("他人のメモ")
                    .build();
            when(attendanceRepository.findById(recordId)).thenReturn(Optional.of(record));

            // Act & Assert
            assertThatThrownBy(() -> service.updateNote(recordId, employee.getId(), "書き換え", null))
                    .isInstanceOf(ResponseStatusException.class)
                    .hasMessageContaining("own notes");
        }

        @Test
        @DisplayName("存在しないレコードIDで編集するとEntityNotFoundExceptionが発生する")
        void updateNote_nonExistentRecord_throwsNotFound() {
            // Arrange
            var recordId = UUID.randomUUID();
            when(attendanceRepository.findById(recordId)).thenReturn(Optional.empty());

            // Act & Assert
            assertThatThrownBy(() -> service.updateNote(recordId, employee.getId(), "メモ", null))
                    .isInstanceOf(EntityNotFoundException.class);
        }
    }

    @Nested
    @DisplayName("当日ステータス取得")
    class GetTodayStatus {

        @Test
        @DisplayName("レコードなしの場合はNOT_CLOCKED_IN")
        void getTodayStatus_noRecords_returnsNotClockedIn() {
            // Arrange
            when(attendanceRepository.findByEmployeeIdAndWorkDate(employee.getId(), TODAY_TOKYO))
                    .thenReturn(List.of());

            // Act
            var result = service.getTodayStatus(employee.getId());

            // Assert
            assertThat(result.status()).isEqualTo(AttendanceStatus.NOT_CLOCKED_IN);
            assertThat(result.records()).isEmpty();
        }

        @Test
        @DisplayName("未退勤レコードありの場合はCLOCKED_IN")
        void getTodayStatus_openRecord_returnsClockedIn() {
            // Arrange
            var openRecord = AttendanceRecord.builder()
                    .id(UUID.randomUUID())
                    .employee(employee)
                    .workDate(TODAY_TOKYO)
                    .clockIn(FIXED_INSTANT)
                    .build();
            when(attendanceRepository.findByEmployeeIdAndWorkDate(employee.getId(), TODAY_TOKYO))
                    .thenReturn(List.of(openRecord));

            // Act
            var result = service.getTodayStatus(employee.getId());

            // Assert
            assertThat(result.status()).isEqualTo(AttendanceStatus.CLOCKED_IN);
            assertThat(result.records()).hasSize(1);
        }

        @Test
        @DisplayName("全レコード退勤済みの場合はCLOCKED_OUT")
        void getTodayStatus_allClosed_returnsClockedOut() {
            // Arrange
            var closedRecord = AttendanceRecord.builder()
                    .id(UUID.randomUUID())
                    .employee(employee)
                    .workDate(TODAY_TOKYO)
                    .clockIn(Instant.parse("2025-01-14T23:00:00Z"))
                    .clockOut(Instant.parse("2025-01-15T08:00:00Z"))
                    .build();
            when(attendanceRepository.findByEmployeeIdAndWorkDate(employee.getId(), TODAY_TOKYO))
                    .thenReturn(List.of(closedRecord));

            // Act
            var result = service.getTodayStatus(employee.getId());

            // Assert
            assertThat(result.status()).isEqualTo(AttendanceStatus.CLOCKED_OUT);
            assertThat(result.records()).hasSize(1);
        }
    }

    @Nested
    @DisplayName("勤怠履歴取得")
    class GetHistory {

        @Test
        @DisplayName("日別レコードと勤務時間が計算される")
        void getHistory_withRecords_returnsDailyAndSummary() {
            // Arrange
            var jan15 = LocalDate.of(2025, 1, 15);
            var jan16 = LocalDate.of(2025, 1, 16);

            var record1 = AttendanceRecord.builder()
                    .id(UUID.randomUUID())
                    .employee(employee)
                    .workDate(jan15)
                    .clockIn(Instant.parse("2025-01-14T23:00:00Z"))
                    .clockOut(Instant.parse("2025-01-15T08:00:00Z"))
                    .corrected(false)
                    .build();
            var record2 = AttendanceRecord.builder()
                    .id(UUID.randomUUID())
                    .employee(employee)
                    .workDate(jan16)
                    .clockIn(Instant.parse("2025-01-15T23:00:00Z"))
                    .clockOut(Instant.parse("2025-01-16T08:00:00Z"))
                    .corrected(false)
                    .build();

            when(attendanceRepository.findByEmployeeIdAndWorkDateBetween(
                    eq(employee.getId()),
                    eq(LocalDate.of(2025, 1, 1)),
                    eq(LocalDate.of(2025, 1, 31))
            )).thenReturn(List.of(record1, record2));

            // Act
            var result = service.getHistory(employee.getId(), "2025-01");

            // Assert
            assertThat(result.month()).isEqualTo("2025-01");
            assertThat(result.days()).hasSize(2);
            assertThat(result.days().get(0).date()).isEqualTo(jan15);
            assertThat(result.days().get(0).totalWorkMinutes()).isEqualTo(540);
            assertThat(result.summary().workDays()).isEqualTo(2);
            assertThat(result.summary().absentDays()).isEqualTo(21);
        }
    }
}
