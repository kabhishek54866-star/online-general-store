package com.generalstore.backend.controller;

import com.generalstore.backend.model.Order;
import com.generalstore.backend.model.Notification;
import com.generalstore.backend.repository.OrderRepository;
import com.generalstore.backend.repository.NotificationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
@CrossOrigin(origins = "*")
public class OrderController {

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @GetMapping
    public List<Order> getAllOrders() {
        return orderRepository.findAll();
    }

    @PostMapping
    public Order placeOrder(@RequestBody Order order) {
        if (order.getStatus() == null) order.setStatus("Pending");
        Order saved = orderRepository.save(order);

        // Create notification for the customer
        if (order.getContactNumber() != null) {
            Notification notification = new Notification();
            notification.setCustomerPhone(order.getContactNumber());
            notification.setType("ORDER_UPDATE");
            notification.setTitle("Order Placed!");
            notification.setMessage("Your order " + order.getBillNumber() + " has been placed successfully. Total: ₹" + (order.getTotalAmount() != null ? order.getTotalAmount().intValue() : 0));
            notification.setReferenceId(order.getBillNumber());
            notification.setTimestamp(new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(new java.util.Date()));
            notificationRepository.save(notification);
        }

        return saved;
    }

    @PutMapping("/{id}")
    public ResponseEntity<Order> updateOrder(@PathVariable Long id, @RequestBody Order orderDetails) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Order not found with id: " + id));

        String oldStatus = order.getStatus();
        String newStatus = orderDetails.getStatus();

        order.setStatus(orderDetails.getStatus());
        order.setPaymentStatus(orderDetails.getPaymentStatus());
        order.setDeliveryBoy(orderDetails.getDeliveryBoy());

        Order updatedOrder = orderRepository.save(order);

        // Create notification if status changed
        if (newStatus != null && !newStatus.equals(oldStatus) && order.getContactNumber() != null) {
            Notification notification = new Notification();
            notification.setCustomerPhone(order.getContactNumber());
            notification.setType("ORDER_UPDATE");

            switch (newStatus) {
                case "Confirmed":
                    notification.setTitle("Order Confirmed");
                    notification.setMessage("Your order " + order.getBillNumber() + " has been confirmed and is being prepared.");
                    break;
                case "Packed":
                    notification.setTitle("Order Packed");
                    notification.setMessage("Your order " + order.getBillNumber() + " has been packed and is ready for dispatch.");
                    break;
                case "Out for Delivery":
                    notification.setTitle("Out for Delivery!");
                    String deliveryMsg = "Your order " + order.getBillNumber() + " is out for delivery.";
                    if (order.getDeliveryBoy() != null && !"Pending Assignment".equals(order.getDeliveryBoy())) {
                        deliveryMsg += " Delivery partner: " + order.getDeliveryBoy();
                    }
                    notification.setMessage(deliveryMsg);
                    break;
                case "Delivered":
                    notification.setTitle("Order Delivered! 🎉");
                    notification.setMessage("Your order " + order.getBillNumber() + " has been delivered. Thank you for shopping with us!");
                    break;
                default:
                    notification.setTitle("Order Update");
                    notification.setMessage("Your order " + order.getBillNumber() + " status has been updated to: " + newStatus);
            }

            notification.setReferenceId(order.getBillNumber());
            notification.setTimestamp(new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(new java.util.Date()));
            notificationRepository.save(notification);
        }

        // Notify if payment status changed to Paid
        if ("Paid".equalsIgnoreCase(orderDetails.getPaymentStatus()) && order.getContactNumber() != null) {
            Notification payNotif = new Notification();
            payNotif.setCustomerPhone(order.getContactNumber());
            payNotif.setType("ORDER_UPDATE");
            payNotif.setTitle("Payment Confirmed");
            payNotif.setMessage("Payment for order " + order.getBillNumber() + " has been confirmed. Amount: ₹" + (order.getTotalAmount() != null ? order.getTotalAmount().intValue() : 0));
            payNotif.setReferenceId(order.getBillNumber());
            payNotif.setTimestamp(new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(new java.util.Date()));
            notificationRepository.save(payNotif);
        }

        return ResponseEntity.ok(updatedOrder);
    }

    // Track orders by customer phone number
    @GetMapping("/track")
    public List<Order> trackOrders(@RequestParam String phone) {
        return orderRepository.findByContactNumber(phone);
    }
}