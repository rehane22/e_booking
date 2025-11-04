package com.ebooking.backend.dto.admin;

public record SeriesPointResponse(
        String date,  // YYYY-MM-DD (jour) ou YYYY-ww (semaine)
        long value
) {}
