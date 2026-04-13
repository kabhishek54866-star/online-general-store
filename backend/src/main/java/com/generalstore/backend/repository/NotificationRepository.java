package com.generalstore.backend.repository;

import com.generalstore.backend.model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByCustomerPhoneOrderByIdDesc(String customerPhone);
    List<Notification> findByCustomerPhoneAndIsRead(String customerPhone, Boolean isRead);
}
