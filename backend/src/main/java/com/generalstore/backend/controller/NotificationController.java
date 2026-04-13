package com.generalstore.backend.controller;

import com.generalstore.backend.model.Notification;
import com.generalstore.backend.repository.NotificationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/notifications")
@CrossOrigin(origins = "*")
public class NotificationController {

    @Autowired
    private NotificationRepository notificationRepository;

    // Get all notifications for a customer
    @GetMapping("/{customerPhone}")
    public List<Notification> getNotifications(@PathVariable String customerPhone) {
        return notificationRepository.findByCustomerPhoneOrderByIdDesc(customerPhone);
    }

    // Create a notification
    @PostMapping
    public Notification createNotification(@RequestBody Notification notification) {
        if (notification.getTimestamp() == null) {
            notification.setTimestamp(new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(new java.util.Date()));
        }
        if (notification.getIsRead() == null) notification.setIsRead(false);
        return notificationRepository.save(notification);
    }

    // Mark a notification as read
    @PutMapping("/read/{id}")
    public void markAsRead(@PathVariable Long id) {
        notificationRepository.findById(id).ifPresent(n -> {
            n.setIsRead(true);
            notificationRepository.save(n);
        });
    }

    // Mark all as read for a customer
    @PutMapping("/read-all/{customerPhone}")
    public void markAllAsRead(@PathVariable String customerPhone) {
        List<Notification> unread = notificationRepository.findByCustomerPhoneAndIsRead(customerPhone, false);
        for (Notification n : unread) {
            n.setIsRead(true);
            notificationRepository.save(n);
        }
    }

    // Get unread count for a customer
    @GetMapping("/unread/{customerPhone}")
    public Map<String, Object> getUnreadCount(@PathVariable String customerPhone) {
        long count = notificationRepository.findByCustomerPhoneAndIsRead(customerPhone, false).size();
        Map<String, Object> result = new HashMap<>();
        result.put("count", count);
        return result;
    }
}
