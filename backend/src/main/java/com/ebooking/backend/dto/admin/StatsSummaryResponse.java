package com.ebooking.backend.dto.admin;

public record StatsSummaryResponse(
        String from, String to,
        long totalUsers,
        long activeUsers,
        long blockedUsers,
        long totalRdv,
        long todayRdv,
        double occupancyRate,     
        Double avgLeadTimeDays   
) {}
