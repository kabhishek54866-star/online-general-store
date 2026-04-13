package com.generalstore.backend.controller;

import com.generalstore.backend.model.ReturnRequest;
import com.generalstore.backend.model.Order;
import com.generalstore.backend.model.Notification;
import com.generalstore.backend.repository.ReturnRequestRepository;
import com.generalstore.backend.repository.OrderRepository;
import com.generalstore.backend.repository.NotificationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/returns")
@CrossOrigin(origins = "*")
public class ReturnController {

    @Autowired
    private ReturnRequestRepository returnRequestRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    // Get all return requests (admin)
    @GetMapping
    public List<ReturnRequest> getAllReturns() {
        return returnRequestRepository.findAll();
    }

    // Get return requests by customer phone
    @GetMapping("/customer/{phone}")
    public List<ReturnRequest> getByCustomer(@PathVariable String phone) {
        return returnRequestRepository.findByCustomerPhone(phone);
    }

    // Submit a return request (customer)
    @PostMapping
    public ReturnRequest submitReturn(@RequestBody ReturnRequest request) {
        if (request.getStatus() == null) request.setStatus("Requested");
        if (request.getRequestDate() == null) {
            request.setRequestDate(new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm").format(new java.util.Date()));
        }
        return returnRequestRepository.save(request);
    }

    // Update return request status (admin: approve/reject)
    @PutMapping("/{id}")
    public ResponseEntity<ReturnRequest> updateReturn(@PathVariable Long id, @RequestBody ReturnRequest details) {
        ReturnRequest request = returnRequestRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Return request not found with id: " + id));

        request.setStatus(details.getStatus());
        request.setAdminNotes(details.getAdminNotes());
        request.setRefundAmount(details.getRefundAmount());
        if (request.getResolvedDate() == null && !"Requested".equalsIgnoreCase(details.getStatus())) {
            request.setResolvedDate(new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm").format(new java.util.Date()));
        }

        ReturnRequest updated = returnRequestRepository.save(request);

        // If approved, update order status and create notification
        if ("Approved".equalsIgnoreCase(details.getStatus())) {
            // Update order status to "Returned"
            Order order = orderRepository.findById(request.getOrderId()).orElse(null);
            if (order != null) {
                order.setStatus("Returned");
                order.setPaymentStatus("Refunded");
                orderRepository.save(order);
            }

            // Create notification for customer
            Notification notification = new Notification();
            notification.setCustomerPhone(request.getCustomerPhone());
            notification.setType("ORDER_UPDATE");
            notification.setTitle("Return Approved");
            notification.setMessage("Your return request for order " + request.getBillNumber() + " has been approved. Refund of ₹" + (details.getRefundAmount() != null ? details.getRefundAmount().intValue() : 0) + " will be processed.");
            notification.setReferenceId(request.getBillNumber());
            notification.setTimestamp(new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(new java.util.Date()));
            notificationRepository.save(notification);
        } else if ("Rejected".equalsIgnoreCase(details.getStatus())) {
            // Notify customer about rejection
            Notification notification = new Notification();
            notification.setCustomerPhone(request.getCustomerPhone());
            notification.setType("ORDER_UPDATE");
            notification.setTitle("Return Rejected");
            notification.setMessage("Your return request for order " + request.getBillNumber() + " was rejected. Reason: " + (details.getAdminNotes() != null ? details.getAdminNotes() : "N/A"));
            notification.setReferenceId(request.getBillNumber());
            notification.setTimestamp(new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(new java.util.Date()));
            notificationRepository.save(notification);
        }

        return ResponseEntity.ok(updated);
    }

    // Check if a return has already been requested for an order
    @GetMapping("/check/{orderId}")
    public Map<String, Object> checkReturn(@PathVariable Long orderId) {
        List<ReturnRequest> returns = returnRequestRepository.findByOrderId(orderId);
        Map<String, Object> result = new HashMap<>();
        result.put("hasReturn", !returns.isEmpty());
        if (!returns.isEmpty()) {
            result.put("status", returns.get(returns.size() - 1).getStatus());
        }
        return result;
    }
}
