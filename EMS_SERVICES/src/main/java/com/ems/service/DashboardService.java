package com.ems.service;

import com.ems.dto.response.UserDashboardResponse;

public interface DashboardService {

    UserDashboardResponse getCurrentUserDashboard(String email);
}
