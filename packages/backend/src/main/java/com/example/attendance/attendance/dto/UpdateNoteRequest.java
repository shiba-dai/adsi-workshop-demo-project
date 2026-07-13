package com.example.attendance.attendance.dto;

import jakarta.validation.constraints.Size;

public record UpdateNoteRequest(
    @Size(max = 200) String clockInNote,
    @Size(max = 200) String clockOutNote
) {}
